import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetConsensusValidatorSetParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getConsensusValidatorSet"
  > = ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getConsensusValidatorSet"
  >,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getConsensusValidatorSet", args>,
  "abi" | "address" | "functionName"
>;
export type GetConsensusValidatorSetReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getConsensusValidatorSet"
>;
export type GetConsensusValidatorSetErrorType = ReadContractErrorType;

/**
 * Returns the consensus validator set IDs, paginated.
 *
 * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` validator IDs starting from `startIndex`.
 * - Returns `(isDone, nextIndex, valIds)`. When `isDone` is false, call again with `nextIndex` as `startIndex`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
 *
 * @param client - {@link Client}
 * @param parameters - {@link GetConsensusValidatorSetParameters}
 * @returns Paginated consensus validator IDs. {@link GetConsensusValidatorSetReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monadTestnet } from 'viem/chains'
 * import { getConsensusValidatorSet } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monadTestnet,
 *   transport: http(),
 * })
 *
 * const result = await getConsensusValidatorSet(client, {
 *   args: [0],
 * })
 * ```
 */
export async function getConsensusValidatorSet<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getConsensusValidatorSet"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetConsensusValidatorSetParameters<args>,
): Promise<GetConsensusValidatorSetReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getConsensusValidatorSet",
  });
}
