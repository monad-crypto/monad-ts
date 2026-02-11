import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetStakingDelegatorParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegator"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getDelegator">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getDelegator", args>,
  "abi" | "address" | "functionName"
>;
export type GetStakingDelegatorReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegator"
>;
export type GetStakingDelegatorErrorType = ReadContractErrorType;

/**
 * Returns a delegator's stake, accumulated rewards, and pending stake changes for a specified validator.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegator
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetStakingDelegatorParameters}
 * @returns Delegator's active stake, accumulator, unclaimed rewards, and pending delta stakes and epochs. {@link GetStakingDelegatorReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getStakingDelegator } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const delegator = await getStakingDelegator(client, {
 *   args: [1n, '0x...'],
 * })
 * ```
 */
export async function getStakingDelegator<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegator"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetStakingDelegatorParameters<args>,
): Promise<GetStakingDelegatorReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegator",
  });
}
