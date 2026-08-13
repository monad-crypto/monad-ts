import { Challenge } from "mppx";
import type { Address } from "viem";
import { createClient, encodeFunctionData, erc20Abi, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as defaults from "../src/defaults.js";
import * as Methods from "../src/Methods.js";
import { RPC_URL } from "./setup.js";

/** Monad mainnet chain ID (forked by anvil). */
export const testChainId = defaults.chainId.mainnet;

/** Default test token (USDC). */
export const token: Address = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";

/** USDT0 token address. */
export const usdt0Token: Address = "0xe7cd86e13AC4309349F30B3435a9d337750fC82D";

/** A non-ERC-3009 token address for testing rejection paths. */
export const NON_ERC3009_TOKEN: Address =
  "0x0000000000000000000000000000000000000001";

/** WMON, a real Monad token with 18 decimals (not 6). */
export const WMON: Address = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";

/** USDC whale on Monad mainnet at the fork block. */
export const WHALE: Address = "0xfc08DB693D20F8F5dE32aC93816fA0ec2d6a221D";

/** USDT0 whale on Monad mainnet at the fork block. */
export const USDT0_WHALE: Address =
  "0xf89d7b9c864f589bbF53a82105107622B35EaA40";

/** Dummy 65-byte signature (v=27, r=0x00..., s=0x00...). */
export const DUMMY_SIGNATURE = `0x${"00".repeat(32)}${"00".repeat(32)}1b`;

/** Zero nonce for authorization payloads. */
export const ZERO_NONCE = `0x${"00".repeat(32)}`;

/**
 * Test accounts.
 *
 * These are NOT the default anvil/hardhat accounts — the well-known addresses
 * (0xf39F..., 0x7099..., etc.) have contracts deployed on Monad mainnet,
 * which breaks ERC-3009 signature verification (the on-chain SignatureChecker
 * uses EIP-1271 for addresses with code instead of ecrecover).
 */
export const accounts = {
  payer: privateKeyToAccount(
    "0xacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacac",
  ),
  recipient: privateKeyToAccount(
    "0xadadadadadadadadadadadadadadadadadadadadadadadadadadadadadadadad",
  ),
  server: privateKeyToAccount(
    "0xaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeae",
  ),
};

/** Creates a viem client connected to the forked anvil instance. */
export function createTestClient() {
  return createClient({
    chain: { id: testChainId } as never,
    transport: http(RPC_URL),
  });
}

/** Sets the ETH balance of an address on the anvil fork. */
export async function setBalance(
  client: ReturnType<typeof createTestClient>,
  address: Address,
  value: bigint,
) {
  await client.request({
    method: "anvil_setBalance" as never,
    params: [address, `0x${value.toString(16)}`] as never,
  });
}

/** Impersonates a whale to transfer USDT0 to a target address. */
export async function fundUSDT0(
  client: ReturnType<typeof createTestClient>,
  to: Address,
  amount: bigint,
) {
  await Promise.all([
    setBalance(client, USDT0_WHALE, 10n ** 18n),
    client.request({
      method: "anvil_impersonateAccount" as never,
      params: [USDT0_WHALE] as never,
    }),
  ]);
  await client.request({
    method: "eth_sendTransaction" as never,
    params: [
      {
        from: USDT0_WHALE,
        to: usdt0Token,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, amount],
        }),
      },
    ] as never,
  });
  await client.request({
    method: "anvil_stopImpersonatingAccount" as never,
    params: [USDT0_WHALE] as never,
  });
}

/** Impersonates a whale to transfer USDC to a target address. */
export async function fundUSDC(
  client: ReturnType<typeof createTestClient>,
  to: Address,
  amount: bigint,
) {
  await Promise.all([
    setBalance(client, WHALE, 10n ** 18n),
    client.request({
      method: "anvil_impersonateAccount" as never,
      params: [WHALE] as never,
    }),
  ]);
  await client.request({
    method: "eth_sendTransaction" as never,
    params: [
      {
        from: WHALE,
        to: token,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, amount],
        }),
      },
    ] as never,
  });
  await client.request({
    method: "anvil_stopImpersonatingAccount" as never,
    params: [WHALE] as never,
  });
}

/** Builds a dummy authorization payload for testing verification logic. */
export function makeAuthorizationPayload(
  overrides: {
    from?: string;
    to?: string;
    value?: string;
    validBefore?: string;
    signature?: string;
  } = {},
) {
  return {
    type: "authorization" as const,
    from: overrides.from ?? accounts.payer.address,
    to: overrides.to ?? accounts.server.address,
    value: overrides.value ?? "1000000",
    validAfter: "0",
    validBefore:
      overrides.validBefore ?? String(Math.floor(Date.now() / 1000) + 3600),
    nonce: ZERO_NONCE,
    signature: overrides.signature ?? DUMMY_SIGNATURE,
  };
}

/** Creates a challenge for testing. */
export function makeChallenge(
  overrides: {
    amount?: string;
    currency?: string;
    recipient?: string;
    expires?: string;
  } = {},
) {
  return Challenge.fromMethod(Methods.charge, {
    realm: "test.example.com",
    id: "test-id",
    ...(overrides.expires ? { expires: overrides.expires } : {}),
    request: {
      amount: overrides.amount ?? "1",
      currency: overrides.currency ?? token,
      decimals: 6,
      recipient: overrides.recipient ?? accounts.recipient.address,
    },
  });
}
