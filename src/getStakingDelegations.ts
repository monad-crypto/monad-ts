import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetStakingDelegationsParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegations"
  > = ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegations"
  >,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getDelegations", args>,
  "abi" | "address" | "functionName"
>;
export type GetStakingDelegationsReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegations"
>;
export type GetStakingDelegationsErrorType = ReadContractErrorType;

/**
 * Returns the validator IDs to which an address has delegated. Results are paginated; when `isDone` is false, call again with `nextValId` as `startValId`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegations
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetStakingDelegationsParameters}
 * @returns `(isDone, nextValId, valIds)` tuple of validator IDs the address has delegated to. {@link GetStakingDelegationsReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getStakingDelegations } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await getStakingDelegations(client, {
 *   args: ['0x...', 0n],
 * })
 * ```
 */
export async function getStakingDelegations<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegations"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetStakingDelegationsParameters<args>,
): Promise<GetStakingDelegationsReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegations",
  });
}
