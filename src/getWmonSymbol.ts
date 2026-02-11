import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "./index.js";

export type GetWmonSymbolParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "symbol"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "symbol">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "symbol", args>,
  "abi" | "address" | "functionName"
>;
export type GetWmonSymbolReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "symbol"
>;
export type GetWmonSymbolErrorType = ReadContractErrorType;

/**
 * Returns the ticker symbol of the WMON token.
 *
 * @param client - Viem {@link Client}
 * @returns The token symbol. {@link GetWmonSymbolReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getWmonSymbol } from 'monad-ts'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const symbol = await getWmonSymbol(client)
 * ```
 */
export async function getWmonSymbol<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "symbol"
  >,
>(
  client: Client<Transport, chain>,
  parameters?: GetWmonSymbolParameters<args>,
): Promise<GetWmonSymbolReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "symbol",
  });
}
