import type { Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type {
  GetValidatorSetParameters,
  GetValidatorSetReturnType,
} from "./types";

/**
 * Gets the execution validator set (paginated).
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getExecutionValidatorSet } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await getExecutionValidatorSet(client, {
 *   startIndex: 0,
 * })
 * ```
 */
export async function getExecutionValidatorSet(
  client: Client,
  parameters: GetValidatorSetParameters,
): Promise<GetValidatorSetReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getExecutionValidatorSet",
    args: [parameters.startIndex],
  } as any)) as readonly [boolean, number, readonly bigint[]];
  return {
    isDone: result[0],
    nextIndex: result[1],
    valIds: result[2],
  };
}
