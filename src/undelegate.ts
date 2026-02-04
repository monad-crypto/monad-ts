import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { UndelegateParameters } from "./types";

/**
 * Undelegates stake from a validator. After undelegating, the stake
 * must wait WITHDRAWAL_DELAY epochs before it can be withdrawn.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { undelegate } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const hash = await undelegate(client, {
 *   validatorId: 1n,
 *   amount: 1000000000000000000n,
 *   withdrawId: 0,
 * })
 * ```
 */
export async function undelegate(
  client: Client,
  parameters: UndelegateParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "undelegate",
    args: [parameters.validatorId, parameters.amount, parameters.withdrawId],
  } as any);
}

/**
 * Undelegates stake from a validator and waits for the transaction
 * to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { undelegateSync } from 'monad-ext'
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
 * const receipt = await undelegateSync(walletClient, publicClient, {
 *   validatorId: 1n,
 *   amount: 1000000000000000000n,
 *   withdrawId: 0,
 * })
 * ```
 */
export async function undelegateSync(
  walletClient: Client,
  publicClient: Client,
  parameters: UndelegateParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await undelegate(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
