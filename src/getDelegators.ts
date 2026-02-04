import type { Address, Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type {
  GetDelegatorsParameters,
  GetDelegatorsReturnType,
} from "./types";

/**
 * Gets the delegators for a validator (paginated).
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getDelegators } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await getDelegators(client, {
 *   validatorId: 1n,
 *   startDelegator: '0x0000000000000000000000000000000000000000',
 * })
 * ```
 */
export async function getDelegators(
  client: Client,
  parameters: GetDelegatorsParameters,
): Promise<GetDelegatorsReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getDelegators",
    args: [parameters.validatorId, parameters.startDelegator],
  } as any)) as readonly [boolean, Address, readonly Address[]];
  return {
    isDone: result[0],
    nextDelegator: result[1],
    delegators: result[2],
  };
}
