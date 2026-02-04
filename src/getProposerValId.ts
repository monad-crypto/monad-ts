import type { Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";

/**
 * Gets the validator ID of the current block proposer.
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getProposerValId } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const proposerValId = await getProposerValId(client)
 * ```
 */
export async function getProposerValId(client: Client): Promise<bigint> {
  return readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getProposerValId",
    args: [],
  } as any) as Promise<bigint>;
}
