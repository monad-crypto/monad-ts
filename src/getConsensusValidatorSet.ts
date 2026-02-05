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
