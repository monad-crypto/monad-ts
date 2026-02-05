import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from ".";

export type GetWithdrawalRequestParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getWithdrawalRequest"
  > = ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getWithdrawalRequest"
  >,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getWithdrawalRequest", args>,
  "abi" | "address" | "functionName"
>;
export type GetWithdrawalRequestReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getWithdrawalRequest"
>;
export type GetWithdrawalRequestErrorType = ReadContractErrorType;

export async function getWithdrawalRequest<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getWithdrawalRequest"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetWithdrawalRequestParameters<args>,
): Promise<GetWithdrawalRequestReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getWithdrawalRequest",
  });
}
