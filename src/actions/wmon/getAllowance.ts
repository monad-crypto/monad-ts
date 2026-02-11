import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "../../constants.js";

export type GetAllowanceParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "allowance"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "allowance">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "allowance", args>,
  "abi" | "address" | "functionName"
>;
export type GetAllowanceReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "allowance"
>;
export type GetAllowanceErrorType = ReadContractErrorType;

/**
 * Returns the amount of WMON the spender is allowed to spend on behalf of the owner.
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetAllowanceParameters}
 * @returns The allowance amount. {@link GetAllowanceReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { Wmon } from 'monad-ts'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const allowance = await Wmon.getAllowance(client, {
 *   args: ['0x...', '0x...'],
 * })
 * ```
 */
export async function getAllowance<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "allowance"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetAllowanceParameters<args>,
): Promise<GetAllowanceReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "allowance",
  });
}
