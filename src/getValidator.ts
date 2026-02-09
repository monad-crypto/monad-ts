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

/**
 * Returns a validator's complete state across execution, consensus, and snapshot contexts.
 *
 * @see https://docs.monad.xyz/developer-essentials/staking/staking-precompile#getvalidator
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetValidatorParameters}
 * @param parameters.args.validatorId - ID of the validator to query
 * @returns Validator state including auth address, flags, stake, accumulator, commission, unclaimed rewards, consensus/snapshot stake and commission, and public keys. {@link GetValidatorReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monadTestnet } from 'viem/chains'
 * import { getValidator } from 'monad-ts-docs'
 *
 * const client = createClient({
 *   chain: monadTestnet,
 *   transport: http(),
 * })
 *
 * const validator = await getValidator(client, {
 *   args: [1n],
 * })
 * ```
 */
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
