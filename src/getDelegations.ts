import type { Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type {
  GetDelegationsParameters,
  GetDelegationsReturnType,
} from "./types";

/**
 * Gets the validators that a delegator has delegated to (paginated).
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getDelegations } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await getDelegations(client, {
 *   delegator: '0x...',
 *   startValId: 0n,
 * })
 * ```
 */
export async function getDelegations(
  client: Client,
  parameters: GetDelegationsParameters,
): Promise<GetDelegationsReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getDelegations",
    args: [parameters.delegator, parameters.startValId],
  } as any)) as readonly [boolean, bigint, readonly bigint[]];
  return {
    isDone: result[0],
    nextValId: result[1],
    valIds: result[2],
  };
}
