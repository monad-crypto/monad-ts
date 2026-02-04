import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { ClaimRewardsParameters } from "./types";

/**
 * Claims accumulated rewards from staking.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { claimRewards } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const hash = await claimRewards(client, {
 *   validatorId: 1n,
 * })
 * ```
 */
export async function claimRewards(
  client: Client,
  parameters: ClaimRewardsParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "claimRewards",
    args: [parameters.validatorId],
  } as any);
}

/**
 * Claims accumulated rewards from staking and waits for the transaction
 * to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { claimRewardsSync } from 'monad-ext'
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
 * const receipt = await claimRewardsSync(walletClient, publicClient, {
 *   validatorId: 1n,
 * })
 * ```
 */
export async function claimRewardsSync(
  walletClient: Client,
  publicClient: Client,
  parameters: ClaimRewardsParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await claimRewards(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
