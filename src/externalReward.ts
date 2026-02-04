import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { ExternalRewardParameters } from "./types";

/**
 * Sends extra MON rewards to the stakers of a validator.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { externalReward } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const hash = await externalReward(client, {
 *   validatorId: 1n,
 *   value: 1000000000000000000n, // 1 MON
 * })
 * ```
 */
export async function externalReward(
  client: Client,
  parameters: ExternalRewardParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "externalReward",
    args: [parameters.validatorId],
    value: parameters.value,
  } as any);
}

/**
 * Sends extra MON rewards to the stakers of a validator and waits for
 * the transaction to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { externalRewardSync } from 'monad-ext'
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
 * const receipt = await externalRewardSync(walletClient, publicClient, {
 *   validatorId: 1n,
 *   value: 1000000000000000000n, // 1 MON
 * })
 * ```
 */
export async function externalRewardSync(
  walletClient: Client,
  publicClient: Client,
  parameters: ExternalRewardParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await externalReward(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
