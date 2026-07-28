// Benchmark — runs representative expensive queries against the JSON-RPC server
// Usage: bun packages/eth-query/benchmarks/benchmark.ts [filter]
// Set RPC_URL to the JSON-RPC endpoint; defaults to http://127.0.0.1.
// Optional filter: only run benchmarks whose name contains the filter string

import type { Hex } from "viem";
import { createClient, http, rpcSchema } from "viem";
import type {
  QueryBlocksRequest,
  QueryLogsRequest,
  QueryRpcSchema,
  QueryTracesRequest,
  QueryTransactionsRequest,
  QueryTransfersRequest,
  TracesFilter,
} from "../src/index.js";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1";
const DISPLAY_RPC_URL = displayRpcUrl(RPC_URL);
const client = createClient({
  rpcSchema: rpcSchema<QueryRpcSchema>(),
  transport: http(RPC_URL),
});

type BenchmarkParams =
  | ({ table: "blocks" } & QueryBlocksRequest<Hex, Hex>)
  | ({ table: "transactions" } & QueryTransactionsRequest<Hex, Hex>)
  | ({ table: "logs" } & QueryLogsRequest<Hex, Hex>)
  | ({ table: "transfers" } & QueryTransfersRequest<Hex, Hex>)
  | ({ table: "traces" } & Omit<QueryTracesRequest<Hex, Hex>, "filter"> & {
        filter?: TracesFilter & { traceType?: ("call" | "create")[] };
      });

function displayRpcUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname === "/" ? "" : "/..."}`;
  } catch {
    return url;
  }
}

function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replaceAll(RPC_URL, DISPLAY_RPC_URL);
}

function toHex(n: number): Hex {
  return `0x${n.toString(16)}`;
}

async function rpc(params: BenchmarkParams): Promise<{
  rows: number;
  bytes: number;
}> {
  let result: unknown;
  if (params.table === "blocks") {
    const { table, ...request } = params;
    void table;
    result = await client.request({
      method: "eth_queryBlocks",
      params: [request],
    });
  } else if (params.table === "transactions") {
    const { table, ...request } = params;
    void table;
    result = await client.request({
      method: "eth_queryTransactions",
      params: [request],
    });
  } else if (params.table === "logs") {
    const { table, ...request } = params;
    void table;
    result = await client.request({
      method: "eth_queryLogs",
      params: [request],
    });
  } else if (params.table === "traces") {
    const { table, ...request } = params;
    void table;
    result = await client.request({
      method: "eth_queryTraces",
      params: [request],
    });
  } else {
    const { table, ...request } = params;
    void table;
    result = await client.request({
      method: "eth_queryTransfers",
      params: [request],
    });
  }
  const text = stringifyResult(result);
  const bytes = new TextEncoder().encode(text).byteLength;
  return { rows: countRows(result), bytes };
}

function stringifyResult(result: unknown): string {
  return (
    JSON.stringify(result, (_key, value: unknown) =>
      typeof value === "bigint" ? value.toString() : value,
    ) ?? ""
  );
}

function countRows(result: unknown): number {
  if (typeof result !== "object" || result === null || !("data" in result)) {
    return 0;
  }
  const data = (result as { data: unknown }).data;
  if (typeof data !== "object" || data === null) return 0;

  return Object.values(data).reduce(
    (rows, value) => rows + (Array.isArray(value) ? value.length : 0),
    0,
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Dense range: all tables peak around block ~37,719,000
const DENSE_START = 37719000;
const RANGE = 1000;

// ERC-20 event signatures
const TRANSFER_SIG =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const APPROVAL_SIG =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

const benchmarks = [
  {
    name: "blocks — 10k rows, 10k range",
    params: {
      table: "blocks",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + 10000),
      limit: toHex(10000),
    },
  },
  {
    name: "transactions — 10k rows, dense range",
    params: {
      table: "transactions",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
    },
  },
  {
    name: "transactions — large range, sparse data (projection)",
    params: {
      table: "transactions",
      fromBlock: toHex(1),
      toBlock: toHex(10_000_000),
      limit: toHex(10000),
      filter: {
        from: ["0xf12cea359512b8ccd5e7b33b3d308a174837250c"],
      },
    },
  },
  {
    name: "transactions — filter by from_address",
    params: {
      table: "transactions",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + 10000),
      filter: { from: ["0x6f49a8f621353f12378d0046e7d7e4b9b249dc9e"] },
      limit: toHex(1000),
    },
  },
  {
    name: "transactions — with blocks join",
    params: {
      table: "transactions",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
      fields: { blocks: true },
    },
  },
  {
    name: "logs — 10k rows, dense range",
    params: {
      table: "logs",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
    },
  },
  {
    name: "logs — filter by address",
    params: {
      table: "logs",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + 10000),
      filter: { address: ["0x3bd359c1119da7da1d913d1c4d2b7c461115433a"] },
      limit: toHex(1000),
    },
  },
  {
    name: "logs — filter by topic0 (Transfer)",
    params: {
      table: "logs",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      filter: {
        topics: [
          [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          ],
        ],
      },
      limit: toHex(10000),
    },
  },
  {
    name: "logs — large range, filter by address (projection)",
    params: {
      table: "logs",
      fromBlock: toHex(1),
      toBlock: toHex(40_000_000),
      filter: { address: ["0x3bd359c1119da7da1d913d1c4d2b7c461115433a"] },
      limit: toHex(100),
    },
  },
  {
    name: "logs — large range, filter by topic0 (projection)",
    params: {
      table: "logs",
      fromBlock: toHex(1),
      toBlock: toHex(40_000_000),
      filter: {
        topics: [
          [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          ],
        ],
      },
      limit: toHex(100),
    },
  },
  {
    name: "logs — large range, filter by address + topic0 (projection)",
    params: {
      table: "logs",
      fromBlock: toHex(1),
      toBlock: toHex(40_000_000),
      filter: {
        address: ["0x3bd359c1119da7da1d913d1c4d2b7c461115433a"],
        topics: [
          [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          ],
        ],
      },
      limit: toHex(100),
    },
  },
  {
    name: "logs — with transactions + blocks join",
    params: {
      table: "logs",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
      fields: { transactions: true, blocks: true },
    },
  },
  {
    name: "traces — 10k rows, dense range",
    params: {
      table: "traces",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
    },
  },
  {
    name: "traces — filter by isTopLevel",
    params: {
      table: "traces",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      filter: { isTopLevel: true },
      limit: toHex(10000),
    },
  },
  {
    name: "traces — large range, filter by from_address (projection)",
    params: {
      table: "traces",
      fromBlock: toHex(1),
      toBlock: toHex(40_000_000),
      filter: { from: ["0xf12cea359512b8ccd5e7b33b3d308a174837250c"] },
      limit: toHex(100),
    },
  },
  {
    name: "traces — with transactions + blocks join",
    params: {
      table: "traces",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
      fields: { transactions: true, blocks: true },
    },
  },
  {
    name: "transfers — 10k rows, dense range",
    params: {
      table: "transfers",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
    },
  },
  {
    name: "transfers — large range, filter by from_address (projection)",
    params: {
      table: "transfers",
      fromBlock: toHex(1),
      toBlock: toHex(40_000_000),
      filter: { from: ["0xf12cea359512b8ccd5e7b33b3d308a174837250c"] },
      limit: toHex(100),
    },
  },
  {
    name: "transfers — with transactions + blocks join",
    params: {
      table: "transfers",
      fromBlock: toHex(DENSE_START),
      toBlock: toHex(DENSE_START + RANGE),
      limit: toHex(10000),
      fields: { transactions: true, blocks: true },
    },
  },
  {
    name: "examples - USDC transfers",
    params: {
      table: "logs",
      fromBlock: "latest",
      order: "desc",
      filter: {
        address: ["0x754704bc059f8c67012fed69bc8a327a5aafb603"],
        topics: [[TRANSFER_SIG]],
      },
      limit: toHex(50),
    },
  },
  {
    name: "examples - WMON transfers",
    params: {
      table: "logs",
      fromBlock: "latest",
      order: "desc",
      filter: {
        address: ["0x3bd359c1119da7da1d913d1c4d2b7c461115433a"],
        topics: [[TRANSFER_SIG]],
      },
      limit: toHex(50),
    },
  },
  {
    name: "examples - USDC approvals",
    params: {
      table: "logs",
      fromBlock: "latest",
      order: "desc",
      filter: {
        address: ["0x754704bc059f8c67012fed69bc8a327a5aafb603"],
        topics: [[APPROVAL_SIG]],
      },
      limit: toHex(50),
    },
  },
  {
    name: "examples - Txs from USDC",
    params: {
      table: "transactions",
      fromBlock: "latest",
      order: "desc",
      filter: {
        to: ["0x754704bc059f8c67012fed69bc8a327a5aafb603"],
      },
      limit: toHex(50),
    },
  },
  {
    name: "examples - Native transfers to WMON",
    params: {
      table: "traces",
      fromBlock: "latest",
      order: "desc",
      filter: {
        to: ["0x3bd359c1119da7da1d913d1c4d2b7c461115433a"],
        traceType: ["call"],
      },
      limit: toHex(50),
    },
  },
  {
    name: "examples - Latest blocks",
    params: {
      table: "blocks",
      fromBlock: "latest",
      order: "desc",
      limit: toHex(50),
    },
  },
] satisfies { name: string; params: BenchmarkParams }[];

const filter = process.argv[2];
const selected = filter
  ? benchmarks.filter((b) => b.name.includes(filter))
  : benchmarks;

console.log("Running benchmarks against", DISPLAY_RPC_URL);
if (filter)
  console.log(
    `Filter: "${filter}" (${selected.length}/${benchmarks.length} benchmarks)`,
  );
console.log(
  "Dense range starts at block",
  DENSE_START,
  `(${toHex(DENSE_START)})`,
);
console.log("=".repeat(70));

for (const b of selected) {
  const start = performance.now();
  try {
    const { rows, bytes } = await rpc(b.params);
    const ms = (performance.now() - start).toFixed(0);
    console.log(
      `${ms.padStart(6)}ms | ${String(rows).padStart(6)} rows | ${formatBytes(bytes).padStart(9)} | ${b.name}`,
    );
  } catch (e) {
    const ms = (performance.now() - start).toFixed(0);
    console.log(
      `${ms.padStart(6)}ms |  ERROR |           | ${b.name}: ${formatError(e)}`,
    );
  }
}
