import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "../../constants.js";

export type GetExecutionValidatorSetParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getExecutionValidatorSet"
  > = ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getExecutionValidatorSet"
  >,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getExecutionValidatorSet", args>,
  "abi" | "address" | "functionName"
>;
export type GetExecutionValidatorSetReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getExecutionValidatorSet"
>;
export type GetExecutionValidatorSetErrorType = ReadContractErrorType;

/**
 * Returns the execution validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetExecutionValidatorSetParameters}
 * @returns `(isDone, nextIndex, valIds)` tuple of execution validator IDs. {@link GetExecutionValidatorSetReturnType}
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
 * const result = await Staking.getExecutionValidatorSet(client, {
 *   args: [0],
 * })
 * ```
 */
export async function getExecutionValidatorSet<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getExecutionValidatorSet"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetExecutionValidatorSetParameters<args>,
): Promise<GetExecutionValidatorSetReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getExecutionValidatorSet",
  });
}
