import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetStakingSnapshotValidatorSetParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getSnapshotValidatorSet"
  > = ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getSnapshotValidatorSet"
  >,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getSnapshotValidatorSet", args>,
  "abi" | "address" | "functionName"
>;
export type GetStakingSnapshotValidatorSetReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getSnapshotValidatorSet"
>;
export type GetStakingSnapshotValidatorSetErrorType = ReadContractErrorType;

/**
 * Returns the snapshot validator set IDs. Results are paginated; when `isDone` is false, call again with `nextIndex` as `startIndex`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetStakingSnapshotValidatorSetParameters}
 * @returns `(isDone, nextIndex, valIds)` tuple of snapshot validator IDs. {@link GetStakingSnapshotValidatorSetReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getStakingSnapshotValidatorSet } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const result = await getStakingSnapshotValidatorSet(client, {
 *   args: [0],
 * })
 * ```
 */
export async function getStakingSnapshotValidatorSet<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getSnapshotValidatorSet"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetStakingSnapshotValidatorSetParameters<args>,
): Promise<GetStakingSnapshotValidatorSetReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getSnapshotValidatorSet",
  });
}
