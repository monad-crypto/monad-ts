import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetValidatorParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getValidator"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getValidator">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getValidator", args>,
  "abi" | "address" | "functionName"
>;
export type GetValidatorReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getValidator"
>;
export type GetValidatorErrorType = ReadContractErrorType;

export async function getValidator<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getValidator"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetValidatorParameters<args>,
): Promise<GetValidatorReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getValidator",
  });
}
