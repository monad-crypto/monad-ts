import type { Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { GetEpochReturnType } from "./types";

/**
 * Gets the current epoch and whether we are in the epoch delay period.
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getEpoch } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const { epoch, inEpochDelayPeriod } = await getEpoch(client)
 * ```
 */
export async function getEpoch(client: Client): Promise<GetEpochReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getEpoch",
    args: [],
  } as any)) as readonly [bigint, boolean];
  return {
    epoch: result[0],
    inEpochDelayPeriod: result[1],
  };
}
