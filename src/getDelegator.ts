import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetDelegatorParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegator"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getDelegator">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getDelegator", args>,
  "abi" | "address" | "functionName"
>;
export type GetDelegatorReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegator"
>;
export type GetDelegatorErrorType = ReadContractErrorType;

/**
 * Returns a delegator's stake, accumulated rewards, and pending stake changes for a specified validator.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegator
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetDelegatorParameters}
 * @returns Delegator's active stake, accumulator, unclaimed rewards, and pending delta stakes and epochs. {@link GetDelegatorReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getDelegator } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const delegator = await getDelegator(client, {
 *   args: [1n, '0x...'],
 * })
 * ```
 */
export async function getDelegator<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegator"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetDelegatorParameters<args>,
): Promise<GetDelegatorReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegator",
  });
}
