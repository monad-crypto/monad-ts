import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "../../constants.js";

export type GetDelegationsParameters<
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
export type GetDelegationsReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegations"
>;
export type GetDelegationsErrorType = ReadContractErrorType;

/**
 * Returns the validator IDs to which an address has delegated. Results are paginated; when `isDone` is false, call again with `nextValId` as `startValId`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getdelegations
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetDelegationsParameters}
 * @returns `(isDone, nextValId, valIds)` tuple of validator IDs the address has delegated to. {@link GetDelegationsReturnType}
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
 * const result = await Staking.getDelegations(client, {
 *   args: ['0x...', 0n],
 * })
 * ```
 */
export async function getDelegations<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegations"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetDelegationsParameters<args>,
): Promise<GetDelegationsReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegations",
  });
}
