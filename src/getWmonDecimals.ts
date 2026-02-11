import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "./index.js";

export type GetWmonDecimalsParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "decimals"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "decimals">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "decimals", args>,
  "abi" | "address" | "functionName"
>;
export type GetWmonDecimalsReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "decimals"
>;
export type GetWmonDecimalsErrorType = ReadContractErrorType;

/**
 * Returns the number of decimals used by WMON.
 *
 * @param client - Viem {@link Client}
 * @returns The number of decimals. {@link GetWmonDecimalsReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getWmonDecimals } from 'monad-ts'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const decimals = await getWmonDecimals(client)
 * ```
 */
export async function getWmonDecimals<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "decimals"
  >,
>(
  client: Client<Transport, chain>,
  parameters?: GetWmonDecimalsParameters<args>,
): Promise<GetWmonDecimalsReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "decimals",
  });
}
