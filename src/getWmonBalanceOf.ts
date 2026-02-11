import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "./index.js";

export type GetWmonBalanceOfParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "balanceOf"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "balanceOf">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "balanceOf", args>,
  "abi" | "address" | "functionName"
>;
export type GetWmonBalanceOfReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "balanceOf"
>;
export type GetWmonBalanceOfErrorType = ReadContractErrorType;

/**
 * Returns the WMON balance of the given address.
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetWmonBalanceOfParameters}
 * @returns The WMON balance. {@link GetWmonBalanceOfReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getWmonBalanceOf } from 'monad-ts'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const balance = await getWmonBalanceOf(client, {
 *   args: ['0x...'],
 * })
 * ```
 */
export async function getWmonBalanceOf<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "balanceOf"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetWmonBalanceOfParameters<args>,
): Promise<GetWmonBalanceOfReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "balanceOf",
  });
}
