import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

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
