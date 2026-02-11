import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetStakingConsensusValidatorSetParameters<
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
export type GetStakingConsensusValidatorSetReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getConsensusValidatorSet"
>;
export type GetStakingConsensusValidatorSetErrorType = ReadContractErrorType;

/**
 * Returns the consensus validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetStakingConsensusValidatorSetParameters}
 * @returns `(isDone, nextIndex, valIds)` tuple of consensus validator IDs. {@link GetStakingConsensusValidatorSetReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getStakingConsensusValidatorSet } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await getStakingConsensusValidatorSet(client, {
 *   args: [0],
 * })
 * ```
 */
export async function getStakingConsensusValidatorSet<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getConsensusValidatorSet"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetStakingConsensusValidatorSetParameters<args>,
): Promise<GetStakingConsensusValidatorSetReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getConsensusValidatorSet",
  });
}
