import type { Address, Client, Hex } from "viem";
import { readContract } from "viem/actions";
import { stakingAbi, STAKING_ADDRESS } from "./abi";
import type { GetValidatorParameters, GetValidatorReturnType } from "./types";

/**
 * Gets information about a validator.
 *
 * @example
 * ```ts
 * import { createPublicClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getValidator } from 'monad-ext'
 *
 * const client = createPublicClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const validator = await getValidator(client, {
 *   validatorId: 1n,
 * })
 * ```
 */
export async function getValidator(
  client: Client,
  parameters: GetValidatorParameters,
): Promise<GetValidatorReturnType> {
  const result = (await readContract(client, {
    address: STAKING_ADDRESS,
    abi: stakingAbi,
    functionName: "getValidator",
    args: [parameters.validatorId],
  } as any)) as readonly [
    Address,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    Hex,
    Hex,
  ];
  return {
    authAddress: result[0],
    flags: result[1],
    stake: result[2],
    accRewardPerToken: result[3],
    commission: result[4],
    unclaimedRewards: result[5],
    consensusStake: result[6],
    consensusCommission: result[7],
    snapshotStake: result[8],
    snapshotCommission: result[9],
    secpPubkey: result[10],
    blsPubkey: result[11],
  };
}
