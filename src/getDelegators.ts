import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetDelegatorsParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegators"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getDelegators">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getDelegators", args>,
  "abi" | "address" | "functionName"
>;
export type GetDelegatorsReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegators"
>;
export type GetDelegatorsErrorType = ReadContractErrorType;

export async function getDelegators<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegators"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetDelegatorsParameters<args>,
): Promise<GetDelegatorsReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegators",
  });
}
