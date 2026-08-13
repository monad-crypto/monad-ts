export const chainId = {
  mainnet: 143,
  testnet: 10143,
} as const;

export type ChainId = (typeof chainId)[keyof typeof chainId];

const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
const USDT0 = "0xe7cd86e13AC4309349F30B3435a9d337750fC82D";

/** Chain ID → default currency. */
export const currency: Partial<Record<ChainId, string>> = {
  [chainId.mainnet]: USDC,
};

/** Default token decimals for USDC. */
export const decimals = 6;

/** Known token decimals, keyed by lowercase address. */
export const tokenDecimals: Record<string, number> = {
  [USDC.toLowerCase()]: decimals,
  [USDT0.toLowerCase()]: decimals,
};

/** Default RPC URLs per chain. */
export const rpcUrl: Record<number, string> = {
  [chainId.mainnet]: "https://rpc.monad.xyz",
  [chainId.testnet]: "https://testnet-rpc.monad.xyz",
};

/** ERC-3009 ABI (`transferWithAuthorization`, `receiveWithAuthorization`). */
export const erc3009Abi = [
  {
    type: "function",
    name: "transferWithAuthorization",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "receiveWithAuthorization",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "version",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

/**
 * Known tokens that support ERC-3009 (TransferWithAuthorization).
 * Keyed by lowercase address for case-insensitive lookup.
 */
export const erc3009Tokens: Record<string, { name: string; version: string }> =
  {
    [USDC.toLowerCase()]: {
      name: "USDC",
      version: "2",
    },
    [USDT0.toLowerCase()]: {
      name: "USDT0",
      version: "1",
    },
  };

/** Resolves the default currency for a given chain. */
export function resolveCurrency(parameters: {
  chainId?: number | undefined;
  testnet?: boolean | undefined;
}): string {
  const id =
    parameters.chainId ??
    (parameters.testnet ? chainId.testnet : chainId.mainnet);
  const resolved = currency[id as ChainId];
  if (!resolved)
    throw new Error(`No default currency configured for chainId ${id}.`);
  return resolved;
}

/**
 * Resolves the decimals for a known token.
 *
 * Throws for any other token so the caller passes `decimals` explicitly.
 * ERC-20 transfers carry no decimals field for the chain to check, so guessing
 * here would settle a silently wrong amount.
 */
export function resolveDecimals(currency: string): number {
  const resolved = tokenDecimals[currency.toLowerCase()];
  if (resolved === undefined)
    throw new Error(
      `No known decimals for currency ${currency}. Pass \`decimals\` explicitly.`,
    );
  return resolved;
}
