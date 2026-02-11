import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "./index.js";

export type GetWmonAllowanceParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "allowance"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "allowance">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "allowance", args>,
  "abi" | "address" | "functionName"
>;
export type GetWmonAllowanceReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "allowance"
>;
export type GetWmonAllowanceErrorType = ReadContractErrorType;

/**
 * Returns the amount of WMON the spender is allowed to spend on behalf of the owner.
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetWmonAllowanceParameters}
 * @returns The allowance amount. {@link GetWmonAllowanceReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getWmonAllowance } from '@monad-crypto/viem'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const allowance = await getWmonAllowance(client, {
 *   args: ['0x...', '0x...'],
 * })
 * ```
 */
export async function getWmonAllowance<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "allowance"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetWmonAllowanceParameters<args>,
): Promise<GetWmonAllowanceReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "allowance",
  });
}
