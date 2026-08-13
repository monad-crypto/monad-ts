import { Method, Store } from "mppx";
import type { Account, Address, Chain, Client } from "viem";
import {
  encodeFunctionData,
  erc20Abi,
  isAddressEqual,
  keccak256,
  parseEventLogs,
  type TransactionReceipt,
} from "viem";
import { parseAccount } from "viem/accounts";
import {
  getTransactionReceipt,
  sendTransaction,
  sendTransactionSync,
} from "viem/actions";
import * as defaults from "../defaults.js";
import * as Methods from "../Methods.js";
import type { MaybePromise } from "../types.js";

/**
 * Creates a Monad charge method intent for usage on the server.
 *
 * @example
 * ```ts
 * import { monad } from '@monad-crypto/mpp/server'
 *
 * const charge = monad.charge({
 *   recipient: '0x...',
 *   currency: '0x...',
 *   account: privateKeyToAccount('0x...'),
 * })
 * ```
 */
export function charge(parameters: charge.Parameters = {}): Method.AnyServer {
  const {
    amount,
    currency = defaults.resolveCurrency(parameters),
    decimals = defaults.decimals,
    description,
    externalId,
    recipient,
    waitForConfirmation = true,
  } = parameters;
  const store = (parameters.store ??
    Store.memory()) as Store.Store<charge.StoreItemMap>;
  const inFlight = inFlightFor(store);

  if (currency.toLowerCase() in defaults.erc3009Tokens && !parameters.account) {
    throw new Error(
      `ERC-3009 requires an \`account\` parameter so the server can sign and broadcast ` +
        `the transferWithAuthorization transaction.`,
    );
  }

  const serverAccount = parameters.account
    ? typeof parameters.account === "string"
      ? parseAccount(parameters.account)
      : parameters.account
    : undefined;

  const resolveClient = async (
    chainId?: number | undefined,
  ): Promise<Client> => {
    if (parameters.getClient) return parameters.getClient({ chainId });
    const id = chainId ?? defaults.chainId.mainnet;
    const url = defaults.rpcUrl[id];
    if (!url) throw new Error(`No RPC URL configured for chainId ${id}.`);
    const { createClient, http } = await import("viem");
    return createClient({ chain: { id } as Chain, transport: http(url) });
  };

  return Method.toServer(Methods.charge, {
    defaults: {
      amount,
      currency,
      decimals,
      description,
      externalId,
      recipient,
    } as never,

    async request({ request }) {
      const chainId = await (async () => {
        if (request.chainId) return request.chainId;
        if (parameters.testnet) return defaults.chainId.testnet;
        return (await resolveClient(undefined)).chain?.id;
      })();

      const client = await (async () => {
        try {
          return await resolveClient(chainId);
        } catch {
          throw new Error(`No client configured with chainId ${chainId}.`);
        }
      })();
      if (client.chain?.id !== chainId)
        throw new Error(`Client not configured with chainId ${chainId}.`);

      return { ...request, chainId };
    },

    async verify({ credential, request }) {
      const { challenge } = credential;
      const { chainId } = request;

      const client = await resolveClient(chainId);

      const { request: challengeRequest } = challenge;
      const challengeAmount = challengeRequest.amount as string;
      const challengeCurrency = challengeRequest.currency as Address;
      const challengeRecipient = challengeRequest.recipient as Address;
      const expires = challenge.expires;

      if (expires && new Date(expires) < new Date()) {
        throw new Error(`Payment expired at ${expires}.`);
      }

      const payload = credential.payload;

      switch (payload.type) {
        case "hash": {
          const hash = payload.hash as `0x${string}`;
          // Claim the hash before the first await so concurrent requests
          // carrying the same tx hash cannot all pass the unused-check and
          // each deliver against one on-chain payment.
          const release = await reserveHash(store, inFlight, hash);
          try {
            const sender = extractDidAddress(credential.source);
            if (!sender)
              throw new Error(
                "Hash credential is missing a valid `source` DID — cannot verify sender.",
              );

            const receipt = await getTransactionReceipt(client, { hash });

            const transferLogs = parseEventLogs({
              abi: erc20Abi,
              eventName: "Transfer",
              logs: receipt.logs,
            });

            const match = transferLogs.find(
              (log) =>
                isAddressEqual(log.address, challengeCurrency) &&
                isAddressEqual(log.args.from, sender) &&
                isAddressEqual(log.args.to, challengeRecipient) &&
                log.args.value.toString() === challengeAmount,
            );

            if (!match)
              throw new MismatchError(
                "Payment verification failed: no matching ERC-20 transfer found.",
                {
                  sender,
                  amount: challengeAmount,
                  currency: challengeCurrency,
                  recipient: challengeRecipient,
                },
              );

            await markHashUsed(store, hash);

            return toReceipt(receipt);
          } finally {
            release();
          }
        }

        case "authorization": {
          if (!serverAccount) {
            throw new Error(
              "Received ERC-3009 authorization credential but no server `account` is configured. " +
                "Set `account` in charge parameters to broadcast transferWithAuthorization.",
            );
          }

          const { from, to, value, validAfter, validBefore, nonce, signature } =
            payload as {
              from: string;
              to: string;
              value: string;
              validAfter: string;
              validBefore: string;
              nonce: string;
              signature: string;
            };

          // Split signature into v, r, s for the contract call
          const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
          const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
          const v = parseInt(signature.slice(130, 132), 16);

          // Validate authorization parameters match the challenge
          if (!isAddressEqual(to as Address, challengeRecipient))
            throw new MismatchError(
              "Authorization recipient does not match challenge.",
              { expected: challengeRecipient, actual: to },
            );

          if (value !== challengeAmount)
            throw new MismatchError(
              "Authorization amount does not match challenge.",
              { expected: challengeAmount, actual: value },
            );

          // Check expiry from the authorization itself
          const validBeforeTs = Number(validBefore);
          if (
            validBeforeTs > 0 &&
            validBeforeTs < Math.floor(Date.now() / 1000)
          ) {
            throw new Error(
              `ERC-3009 authorization expired (validBefore: ${validBefore}).`,
            );
          }

          const hash = keccak256(signature as `0x${string}`);
          // Same claim-before-await guard as the hash path, so two concurrent
          // submissions of one authorization cannot both broadcast.
          const release = await reserveHash(store, inFlight, hash);
          try {
            await markHashUsed(store, hash);
          } finally {
            release();
          }

          if (waitForConfirmation) {
            const receipt = await sendTransactionSync(client, {
              account: serverAccount,
              chain: client.chain,
              to: challengeCurrency,
              data: encodeFunctionData({
                abi: defaults.erc3009Abi,
                functionName: "transferWithAuthorization",
                args: [
                  from as Address,
                  to as Address,
                  BigInt(value),
                  BigInt(validAfter),
                  BigInt(validBefore),
                  nonce as `0x${string}`,
                  v,
                  r as `0x${string}`,
                  s as `0x${string}`,
                ],
              }),
            } as never);

            return toReceipt(receipt);
          } else {
            const hash = await sendTransaction(client, {
              account: serverAccount,
              chain: client.chain,
              to: challengeCurrency,
              data: encodeFunctionData({
                abi: defaults.erc3009Abi,
                functionName: "transferWithAuthorization",
                args: [
                  from as Address,
                  to as Address,
                  BigInt(value),
                  BigInt(validAfter),
                  BigInt(validBefore),
                  nonce as `0x${string}`,
                  v,
                  r as `0x${string}`,
                  s as `0x${string}`,
                ],
              }),
            } as never);

            return {
              method: "monad" as const,
              status: "success" as const,
              timestamp: new Date().toISOString(),
              reference: hash,
            };
          }
        }

        default:
          throw new Error(
            `Unsupported credential type "${(payload as { type: string }).type}".`,
          );
      }
    },
  });
}

export declare namespace charge {
  type StoreItemMap = {
    [key: `mppx:charge:${string}`]: number;
  };

  type Parameters = {
    /** Default payment amount (human-readable, e.g. "1.50"). */
    amount?: string | undefined;
    /** ERC-20 token contract address. */
    currency?: string | undefined;
    /** Token decimals. @default 6 */
    decimals?: number | undefined;
    /** Human-readable description. */
    description?: string | undefined;
    /** External identifier to echo back in receipt. */
    externalId?: string | undefined;
    /** Recipient address for payments. */
    recipient?: string | undefined;
    /** Testnet mode. */
    testnet?: boolean | undefined;
    /**
     * Whether to wait for the charge transaction to confirm on-chain.
     * @default true
     */
    waitForConfirmation?: boolean | undefined;
    /** Function that returns a viem Client for the given chain ID. */
    getClient?:
      | ((parameters: { chainId?: number | undefined }) => MaybePromise<Client>)
      | undefined;
    /**
     * Server account used to broadcast `transferWithAuthorization` transactions.
     * Required when accepting `authorization` payloads. The server pays gas
     * from this account.
     */
    account?: Account | Address | undefined;
    /**
     * Store for transaction hash replay protection.
     *
     * Use a shared store in multi-instance deployments so consumed hashes are
     * visible across all server instances.
     */
    store?: Store.Store | undefined;
  };
}

/** @internal */
function getHashStoreKey(hash: `0x${string}`): `mppx:charge:${string}` {
  return `mppx:charge:${hash.toLowerCase()}`;
}

/**
 * In-process claims for hashes currently being verified, keyed on the store so
 * charge instances sharing a store share the guard. This closes the window
 * between the unused-check and the durable write, during which concurrent
 * requests in the same process would otherwise each pass the check.
 *
 * The store still records used hashes durably. This guard only covers the
 * in-flight window within a process; a multi-instance deployment additionally
 * needs the injected store to reserve atomically (an `AtomicStore` in a newer
 * mppx, which this package does not yet depend on).
 * @internal
 */
const inFlightByStore = new WeakMap<object, Set<string>>();

/** @internal */
function inFlightFor(store: object): Set<string> {
  let set = inFlightByStore.get(store);
  if (!set) {
    set = new Set<string>();
    inFlightByStore.set(store, set);
  }
  return set;
}

/**
 * Claims a hash before the first await and confirms it is not already recorded,
 * then returns a `release` to call once processing finishes. Throws with the
 * same message as a spent hash when the claim is already held or recorded.
 * @internal
 */
async function reserveHash(
  store: Store.Store<charge.StoreItemMap>,
  inFlight: Set<string>,
  hash: `0x${string}`,
): Promise<() => void> {
  const key = getHashStoreKey(hash);
  if (inFlight.has(key))
    throw new Error("Transaction hash has already been used.");
  inFlight.add(key);
  try {
    const seen = await store.get(key);
    if (seen !== null)
      throw new Error("Transaction hash has already been used.");
  } catch (error) {
    inFlight.delete(key);
    throw error;
  }
  return () => inFlight.delete(key);
}

/** @internal */
async function markHashUsed(
  store: Store.Store<charge.StoreItemMap>,
  hash: `0x${string}`,
): Promise<void> {
  await store.put(getHashStoreKey(hash), Date.now());
}

/** @internal */
function toReceipt(receipt: TransactionReceipt) {
  const { status, transactionHash } = receipt;
  if (status !== "success") {
    throw new Error(`Transaction reverted: ${transactionHash}`);
  }
  return {
    method: "monad" as const,
    status: "success" as const,
    timestamp: new Date().toISOString(),
    reference: transactionHash,
  };
}

/**
 * Extracts an Ethereum address from a `did:pkh:eip155:<chainId>:<address>` DID.
 * Returns `undefined` if the source is missing or malformed.
 * @internal
 */
function extractDidAddress(source: string | undefined): Address | undefined {
  if (!source) return undefined;
  const match = /^did:pkh:eip155:\d+:(0x[0-9a-fA-F]{40})$/.exec(source);
  return match ? (match[1] as Address) : undefined;
}

/** @internal */
class MismatchError extends Error {
  override readonly name = "MismatchError";

  constructor(reason: string, details: Record<string, string>) {
    super(
      [
        reason,
        ...Object.entries(details).map(([k, v]) => `  - ${k}: ${v}`),
      ].join("\n"),
    );
  }
}
