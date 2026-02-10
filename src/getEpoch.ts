import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetEpochParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getEpoch"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getEpoch">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getEpoch", args>,
  "abi" | "address" | "functionName"
>;
export type GetEpochReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getEpoch"
>;
export type GetEpochErrorType = ReadContractErrorType;

/**
 * Returns the current epoch and whether the network is in the epoch delay period. If `inEpochDelayPeriod` is false, write operations are effective for `epoch + 1`; if true, for `epoch + 2`.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getepoch
 *
 * @param client - Viem {@link Client}
 * @returns `(epoch, inEpochDelayPeriod)` tuple. {@link GetEpochReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getEpoch } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const [epoch, inEpochDelayPeriod] = await getEpoch(client)
 * ```
 */
export async function getEpoch<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getEpoch"
  >,
>(
  client: Client<Transport, chain>,
  parameters?: GetEpochParameters<args>,
): Promise<GetEpochReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getEpoch",
  });
}
