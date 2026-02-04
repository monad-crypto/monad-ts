import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { WithdrawParameters } from "./types";

/**
 * Withdraws previously undelegated stake after the withdrawal delay has passed.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { withdraw } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const hash = await withdraw(client, {
 *   validatorId: 1n,
 *   withdrawId: 0,
 * })
 * ```
 */
export async function withdraw(
  client: Client,
  parameters: WithdrawParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "withdraw",
    args: [parameters.validatorId, parameters.withdrawId],
  } as any);
}

/**
 * Withdraws previously undelegated stake and waits for the transaction
 * to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { withdrawSync } from 'monad-ext'
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
 * const receipt = await withdrawSync(walletClient, publicClient, {
 *   validatorId: 1n,
 *   withdrawId: 0,
 * })
 * ```
 */
export async function withdrawSync(
  walletClient: Client,
  publicClient: Client,
  parameters: WithdrawParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await withdraw(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
