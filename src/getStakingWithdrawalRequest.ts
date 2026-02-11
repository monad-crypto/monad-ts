import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetStakingWithdrawalRequestParameters<
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
export type GetStakingWithdrawalRequestReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getWithdrawalRequest"
>;
export type GetStakingWithdrawalRequestErrorType = ReadContractErrorType;

/**
 * Returns the pending withdrawal request for a (validatorId, delegator, withdrawId) tuple.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getwithdrawalrequest
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetStakingWithdrawalRequestParameters}
 * @returns Withdrawal amount, accumulator value at time of undelegation, and the epoch when the withdrawal becomes claimable. {@link GetStakingWithdrawalRequestReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getStakingWithdrawalRequest } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const withdrawal = await getStakingWithdrawalRequest(client, {
 *   args: [1n, '0x...', 0],
 * })
 * ```
 */
export async function getStakingWithdrawalRequest<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getWithdrawalRequest"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetStakingWithdrawalRequestParameters<args>,
): Promise<GetStakingWithdrawalRequestReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getWithdrawalRequest",
  });
}
