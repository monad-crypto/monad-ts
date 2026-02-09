import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetDelegatorsParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegators"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getDelegators">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getDelegators", args>,
  "abi" | "address" | "functionName"
>;
export type GetDelegatorsReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegators"
>;
export type GetDelegatorsErrorType = ReadContractErrorType;

/**
 * Returns the delegator addresses for a given validator. Results are paginated; when `isDone` is false, call again with `nextDelegator` as `startDelegator`. The number of delegators can be very large; consider maintaining an updated list via events rather than periodically calling this.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegators
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetDelegatorsParameters}
 * @param parameters.args.validatorId - ID of the validator
 * @param parameters.args.startDelegator - Address to start paginating from
 * @returns `(isDone, nextDelegator, delegators)` tuple of delegator addresses. {@link GetDelegatorsReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monadTestnet } from 'viem/chains'
 * import { getDelegators } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monadTestnet,
 *   transport: http(),
 * })
 *
 * const result = await getDelegators(client, {
 *   args: [1n, '0x0000000000000000000000000000000000000000'],
 * })
 * ```
 */
export async function getDelegators<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegators"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetDelegatorsParameters<args>,
): Promise<GetDelegatorsReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegators",
  });
}
