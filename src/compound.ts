import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { CompoundParameters } from "./types";

/**
 * Compounds accumulated rewards into additional stake.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { compound } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const hash = await compound(client, {
 *   validatorId: 1n,
 * })
 * ```
 */
export async function compound(
  client: Client,
  parameters: CompoundParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "compound",
    args: [parameters.validatorId],
  } as any);
}

/**
 * Compounds accumulated rewards into additional stake and waits for
 * the transaction to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { compoundSync } from 'monad-ext'
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
 * const receipt = await compoundSync(walletClient, publicClient, {
 *   validatorId: 1n,
 * })
 * ```
 */
export async function compoundSync(
  walletClient: Client,
  publicClient: Client,
  parameters: CompoundParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await compound(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
