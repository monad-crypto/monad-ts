import type { Client } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type {
  GetWithdrawalRequestParameters,
  GetWithdrawalRequestReturnType,
} from "./types";

/**
 * Gets information about a pending withdrawal request.
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getWithdrawalRequest } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const withdrawal = await getWithdrawalRequest(client, {
 *   validatorId: 1n,
 *   delegator: '0x...',
 *   withdrawId: 0,
 * })
 * ```
 */
export async function getWithdrawalRequest(
  client: Client,
  parameters: GetWithdrawalRequestParameters,
): Promise<GetWithdrawalRequestReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getWithdrawalRequest",
    args: [
      parameters.validatorId,
      parameters.delegator,
      parameters.withdrawId,
    ],
  } as any)) as readonly [bigint, bigint, bigint];
  return {
    withdrawalAmount: result[0],
    accRewardPerToken: result[1],
    withdrawEpoch: result[2],
  };
}
