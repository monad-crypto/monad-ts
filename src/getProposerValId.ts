import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

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
