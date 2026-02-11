import type { Chain, Client, ContractFunctionArgs, Transport } from "viem";
import type {
  ReadContractErrorType,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem/actions";
import { readContract } from "viem/actions";
import { WMON_ADDRESS, wmonAbi } from "./index.js";

export type GetWmonNameParameters<
  args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "name"
  > = ContractFunctionArgs<typeof wmonAbi, "pure" | "view", "name">,
> = Omit<
  ReadContractParameters<typeof wmonAbi, "name", args>,
  "abi" | "address" | "functionName"
>;
export type GetWmonNameReturnType = ReadContractReturnType<
  typeof wmonAbi,
  "name"
>;
export type GetWmonNameErrorType = ReadContractErrorType;

/**
 * Returns the name of the WMON token.
 *
 * @param client - Viem {@link Client}
 * @returns The token name. {@link GetWmonNameReturnType}
 *
 * @example
 * ```ts
 * import { createClient, http } from 'viem'
 * import { monad } from 'viem/chains'
 * import { getWmonName } from 'monad-ts'
 *
 * const client = createClient({
 *   chain: monad,
 *   transport: http(),
 * })
 *
 * const name = await getWmonName(client)
 * ```
 */
export async function getWmonName<
  chain extends Chain | undefined,
  const args extends ContractFunctionArgs<
    typeof wmonAbi,
    "pure" | "view",
    "name"
  >,
>(
  client: Client<Transport, chain>,
  parameters?: GetWmonNameParameters<args>,
): Promise<GetWmonNameReturnType> {
  return readContract(client, {
    ...parameters,
    abi: wmonAbi,
    address: WMON_ADDRESS,
    functionName: "name",
  });
}
