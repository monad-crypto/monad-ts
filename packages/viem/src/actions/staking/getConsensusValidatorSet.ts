import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "../../constants.js";

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
 * Returns the consensus validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetConsensusValidatorSetParameters}
 * @returns `(isDone, nextIndex, valIds)` tuple of consensus validator IDs. {@link GetConsensusValidatorSetReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { Staking } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await Staking.getConsensusValidatorSet(client, {
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
