import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "../../constants.js";

export type GetBalanceOfParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "balanceOf"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "balanceOf">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "balanceOf", args>,
  "abi" | "address" | "functionName"
>;
export type GetBalanceOfReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "balanceOf"
>;
export type GetBalanceOfErrorType = ReadContractErrorType;

/**
 * Returns the WMON balance of the given address.
 *
 * @param client - Viem {@link Client}
 * @param parameters - {@link GetBalanceOfParameters}
 * @returns The WMON balance. {@link GetBalanceOfReturnType}
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
 * const balance = await Wmon.getBalanceOf(client, {
 *   args: ['0x...'],
 * })
 * ```
 */
export async function getBalanceOf<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "balanceOf"
  >,
>(
  client: Client<Transport, chain>,
  parameters: GetBalanceOfParameters<args>,
): Promise<GetBalanceOfReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "balanceOf",
  });
}
