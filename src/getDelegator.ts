import type { Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { GetDelegatorParameters, GetDelegatorReturnType } from "./types";

/**
 * Gets information about a delegator's stake with a specific validator.
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getDelegator } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const delegator = await getDelegator(client, {
 *   validatorId: 1n,
 *   delegator: '0x...',
 * })
 * ```
 */
export async function getDelegator(
  client: Client,
  parameters: GetDelegatorParameters,
): Promise<GetDelegatorReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getDelegator",
    args: [parameters.validatorId, parameters.delegator],
  } as any)) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  return {
    stake: result[0],
    accRewardPerToken: result[1],
    unclaimedRewards: result[2],
    deltaStake: result[3],
    nextDeltaStake: result[4],
    deltaEpoch: result[5],
    nextDeltaEpoch: result[6],
  };
}
