import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetSnapshotValidatorSetParameters<
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
export type GetSnapshotValidatorSetReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getSnapshotValidatorSet"
>;
export type GetSnapshotValidatorSetErrorType = ReadContractErrorType;

/**
 * Returns the snapshot validator set IDs, paginated.
 *
 * - Each call retrieves up to `PAGINATED_RESULTS_SIZE` validator IDs starting from `startIndex`.
 * - Returns `(isDone, nextIndex, valIds)`. When `isDone` is false, call again with `nextIndex` as `startIndex`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#get-validatorset
 *
 * @param client - {@link Client}
 * @param parameters - {@link GetSnapshotValidatorSetParameters}
 * @returns Paginated snapshot validator IDs. {@link GetSnapshotValidatorSetReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monadTestnet } from 'viem/chains'
 * import { getSnapshotValidatorSet } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monadTestnet,
 *   transport: http(),
 * })
 *
 * const result = await getSnapshotValidatorSet(client, {
 *   args: [0],
 * })
 * ```
 */
export async function getSnapshotValidatorSet<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getSnapshotValidatorSet"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetSnapshotValidatorSetParameters<args>,
): Promise<GetSnapshotValidatorSetReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getSnapshotValidatorSet",
  });
}
