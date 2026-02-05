import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetDelegatorParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegator"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getDelegator">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getDelegator", args>,
  "abi" | "address" | "functionName"
>;
export type GetDelegatorReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getDelegator"
>;
export type GetDelegatorErrorType = ReadContractErrorType;

export async function getDelegator<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getDelegator"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetDelegatorParameters<args>,
): Promise<GetDelegatorReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getDelegator",
  });
}
