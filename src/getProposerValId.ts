import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetProposerValIdParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getProposerValId"
  > = ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getProposerValId"
  >,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getProposerValId", args>,
  "abi" | "address" | "functionName"
>;
export type GetProposerValIdReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getProposerValId"
>;
export type GetProposerValIdErrorType = ReadContractErrorType;

/**
 * Returns the validator ID of the current block proposer, corresponding to the SECP value of the block author.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getproposervalid
 *
 * @param client - Viem {@link Client}
 * @returns Validator ID of the current block proposer. {@link GetProposerValIdReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getProposerValId } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const proposerValId = await getProposerValId(client)
 * ```
 */
export async function getProposerValId<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getProposerValId"
  >,
>(
  client: Client<Transport, chain>,
  parameters?: GetProposerValIdParameters<args>,
): Promise<GetProposerValIdReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getProposerValId",
  });
}
