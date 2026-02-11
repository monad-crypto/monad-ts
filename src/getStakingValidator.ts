import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { STAKING_ADDRESS, stakingAbi } from "./index.js";

export type GetStakingValidatorParameters<
  args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getValidator"
  > = ContractFunctionArgs<typeof stakingAbi, "pure" | "view", "getValidator">,
> = Omit<
  ReadContractParameters<typeof stakingAbi, "getValidator", args>,
  "abi" | "address" | "functionName"
>;
export type GetStakingValidatorReturnType = ReadContractReturnType<
  typeof stakingAbi,
  "getValidator"
>;
export type GetStakingValidatorErrorType = ReadContractErrorType;

/**
 * Returns a validator's complete state across execution, consensus, and snapshot contexts.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getvalidator
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetStakingValidatorParameters}
 * @returns Validator state including auth address, flags, stake, accumulator, commission, unclaimed rewards, consensus/snapshot stake and commission, and public keys. {@link GetStakingValidatorReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getStakingValidator } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const validator = await getStakingValidator(client, {
 *   args: [1n],
 * })
 * ```
 */
export async function getStakingValidator<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof stakingAbi,
    "pure" | "view",
    "getValidator"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetStakingValidatorParameters<args>,
): Promise<GetStakingValidatorReturnType> {
  return readContract(client, {
    ...parameters,
    abi: stakingAbi,
    address: STAKING_ADDRESS,
    functionName: "getValidator",
  });
}
