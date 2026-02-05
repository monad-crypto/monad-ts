import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

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
