import type { Client, Hash, TransactionReceipt } from "viem";
import {
  writeContract,
  waitForTransactionReceipt,
} from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { ChangeCommissionParameters } from "./types";

/**
 * Changes the commission rate for a validator. Only callable by the
 * validator's authAddress.
 *
 * @example
 * ```ts
 * import { createWalletClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { changeCommission } from 'monad-ext'
 *
 * const client = createWalletClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * // Set 10% commission (1e17 = 10%)
 * const hash = await changeCommission(client, {
 *   validatorId: 1n,
 *   commission: 100000000000000000n,
 * })
 * ```
 */
export async function changeCommission(
  client: Client,
  parameters: ChangeCommissionParameters,
): Promise<Hash> {
  return writeContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "changeCommission",
    args: [parameters.validatorId, parameters.commission],
  } as any);
}

/**
 * Changes the commission rate for a validator and waits for the transaction
 * to be included on a block.
 *
 * @example
 * ```ts
 * import { createWalletClient, createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { changeCommissionSync } from 'monad-ext'
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
 * // Set 10% commission (1e17 = 10%)
 * const receipt = await changeCommissionSync(walletClient, publicClient, {
 *   validatorId: 1n,
 *   commission: 100000000000000000n,
 * })
 * ```
 */
export async function changeCommissionSync(
  walletClient: Client,
  publicClient: Client,
  parameters: ChangeCommissionParameters & { timeout?: number },
): Promise<TransactionReceipt> {
  const { timeout = 10_000, ...rest } = parameters;
  const hash = await changeCommission(walletClient, rest);
  return waitForTransactionReceipt(publicClient, { hash, timeout });
}
