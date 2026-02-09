import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

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
