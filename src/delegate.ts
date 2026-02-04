import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { DelegateParameters } from "./types";

/**
 * Delegates stake to a validator.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { delegate } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const hash = await delegate(client, {
 *   validatorId: 1n,
 *   value: 1000000000000000000n,
 * })
 * ```
 */
export async function delegate(
  client: Client,
  parameters: DelegateParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "delegate",
    args: [parameters.validatorId],
    value: parameters.value,
  } as any);
}

/**
 * Delegates stake to a validator and waits for the transaction
 * to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { delegateSync } from 'monad-ext'
 *
 * const walletClient = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const publicClient = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const receipt = await delegateSync(walletClient, publicClient, {
 *   validatorId: 1n,
 *   value: 1000000000000000000n,
 * })
 * ```
 */
export async function delegateSync(
  walletClient: Client,
  publicClient: Client,
  parameters: DelegateParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await delegate(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
