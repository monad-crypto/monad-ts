# @monad-crypto/eth-query

Experimental [Viem](https://viem.sh) client for Monad RPC methods that query raw chain history: blocks, transactions, traces, logs, and native transfers. The methods support filtering, relations, field selection, ascending and descending ordering, and limit-based pagination.

## Installation

Install the package with its Viem peer dependency:

```bash
bun add @monad-crypto/eth-query viem
```

With npm or pnpm:

```bash
npm install @monad-crypto/eth-query viem
pnpm add @monad-crypto/eth-query viem
```

## Quick Start

Use an RPC endpoint that supports the Monad Data `eth_query*` methods. The standard public Monad RPC endpoint may not yet expose these methods.

```ts
import { createClient, http } from "viem";
import { monad } from "viem/chains";
import { queryActions } from "@monad-crypto/eth-query";

const client = createClient({
  transport: http("https://your-query-enabled-rpc.example"),
  chain: monad,
}).extend(queryActions);

const response = await client.queryTransactions({
  fromBlock: 1n,
  toBlock: 256n,
  filter: {
    from: "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
  },
  fields: {
    transactions: ["hash", "from", "to", "value"],
  },
});

console.log(response.data.transactions);
// ^? { hash: Hex; from: Address; to: Address | null; value: bigint }[]
```

## Response Shape

Every response includes a normalized `data` object plus block references for pagination and reorg detection:

```ts
response.fromBlock; // { number: bigint; hash: Hex; parentHash: Hex }
response.toBlock; // { number: bigint; hash: Hex; parentHash: Hex }
response.cursorBlock; // { number: bigint; hash: Hex; parentHash: Hex }
response.data; // primary rows and any requested relation tables
```

The client formats successful responses into Viem-style JavaScript values. Block numbers, gas values, and transfer values are returned as `bigint`; transaction, log, trace, and transfer indexes are returned as `number`; statuses are normalized to `"success"` or `"reverted"`.

## Field Selection

Specify which fields to return per table. The response type narrows automatically based on the fields you select.

```ts
// Only get hash and from — response type reflects this
const response = await client.queryTransactions({
  fromBlock: 1n,
  toBlock: 256n,
  fields: {
    transactions: ["hash", "from"],
  },
});

response.data.transactions[0].hash; // ✓ Hex
response.data.transactions[0].from; // ✓ Address
response.data.transactions[0].to;   // ✗ Type error — not selected
```

Use `true` to include all fields:

```ts
const response = await client.queryTransactions({
  fromBlock: 1n,
  toBlock: 256n,
  fields: {
    transactions: true, // all transaction fields
  },
});
```

## Relations

Queries can include related tables via the `fields` object. For example, when querying transactions you can also request the associated blocks:

```ts
const response = await client.queryTransactions({
  fromBlock: 1n,
  toBlock: 256n,
  fields: {
    transactions: ["hash", "from", "to"],
    blocks: ["number", "timestamp"], // include related blocks with specific fields
  },
});

response.data.transactions; // ✓ { hash, from, to }[]
response.data.blocks;       // ✓ { number, timestamp }[]
```

When a relation is not requested, it is omitted from the response type entirely.

## Filtering

Each query type supports table-specific filters:

```ts
// Filter transactions by sender
const response = await client.queryTransactions({
  fromBlock: 1n,
  toBlock: 65536n,
  filter: {
    from: ["0xc777cfb3bccc2f1d3049845d62639c769dff243d"],
  },
  fields: {
    transactions: ["hash", "from", "to", "value"],
  },
});

// Filter logs by address and topics
const response = await client.queryLogs({
  fromBlock: 1n,
  toBlock: 65536n,
  filter: {
    address: ["0xb983b1b6f1fc04030f9d8935dbbfd2a1239d00d9"],
    topics: [
      [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      ],
    ],
  },
  fields: {
    logs: ["address", "data", "topics"],
  },
});
```

## Pagination

Use the `*WithPagination` async generators to automatically paginate through large result sets:

```ts
for await (const page of client.queryTransactionsWithPagination({
  fromBlock: 1n,
  toBlock: 1_000_000n,
  limit: 100,
  fields: {
    transactions: ["hash", "from", "to", "value"],
  },
})) {
  console.log(page.data.transactions.length);
}
```

Pagination is block-cursor based. A page is final when `cursorBlock.number === toBlock.number`; otherwise the helper resumes from `cursorBlock + 1n` for ascending queries or `cursorBlock - 1n` for descending queries. The `limit` is a target number of primary-table rows, and the server may return more rows to avoid splitting a block across pages.

## Examples

Each action calls the corresponding Monad query method and returns a formatted Viem-style response. `bigint` block numbers and numeric limits are serialized before transport.

### Field Selection

Fetch only block number and timestamp without large fields like `logsBloom`:

```ts
const response = await client.queryBlocks({
  fromBlock: 30_000_000n,
  toBlock: 30_000_003n,
  limit: 2,
  fields: {
    blocks: ["number", "hash", "timestamp"],
  },
});

response.data.blocks;
// ^? { number: bigint; hash: Hex; timestamp: bigint }[]
```

### Transaction Filtering

Find transactions with a specific 4-byte function selector:

```ts
const response = await client.queryTransactions({
  fromBlock: 30_000_000n,
  toBlock: 30_010_000n,
  limit: 100,
  filter: {
    selector: "0xa9059cbb",
  },
  fields: {
    transactions: ["hash", "from", "to", "input", "blockNumber"],
  },
});

response.data.transactions;
```

### Relations

Query logs matching a filter and include the associated block timestamp in the same response:

```ts
const transferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const response = await client.queryLogs({
  fromBlock: 30_000_000n,
  toBlock: 30_000_999n,
  filter: {
    address: "0xb983b1b6f1fc04030f9d8935dbbfd2a1239d00d9",
    topics: [transferTopic],
  },
  fields: {
    logs: ["address", "topics", "data", "blockNumber", "transactionHash"],
    blocks: ["number", "timestamp"],
  },
});

response.data.logs;
response.data.blocks;
```

### Traces

Get top-level traces for a contract call target:

```ts
const response = await client.queryTraces({
  fromBlock: 30_000_000n,
  toBlock: 30_000_999n,
  filter: {
    to: "0x5447e0f54979fa6888b37631b9ce285cc4bc1a99",
    isTopLevel: true,
  },
  fields: {
    traces: ["from", "to", "value", "status", "traceAddress"],
    transactions: ["hash"],
  },
});
```

### Native Transfers

Query native token transfers, including only top-level transfers:

```ts
const response = await client.queryTransfers({
  fromBlock: 30_000_000n,
  toBlock: 30_000_999n,
  filter: {
    to: "0xacc0a0cf13571d30b4b8637996f5d6d774d4fd62",
    isTopLevel: true,
  },
  fields: {
    transfers: ["from", "to", "value", "blockNumber", "status"],
    blocks: ["number"],
  },
});
```

### Ordering

Use `order: "desc"` to scan newest-to-oldest:

```ts
const response = await client.queryTransactions({
  fromBlock: "latest",
  toBlock: 30_000_000n,
  order: "desc",
  limit: 25,
  fields: {
    transactions: ["hash", "blockNumber", "transactionIndex"],
  },
});
```

## API Reference

### Client Actions

| Action | Description |
| --- | --- |
| `client.queryBlocks` | Query blocks by range |
| `client.queryTransactions` | Query transactions with optional filters |
| `client.queryLogs` | Query event logs with optional filters |
| `client.queryTraces` | Query call traces with optional filters |
| `client.queryTransfers` | Query native transfers with optional filters |
| `client.queryContractLogs` | Query and decode ABI event logs |
| `client.queryContractTraces` | Query and decode ABI contract calls |

### Pagination Actions

| Action | Description |
| --- | --- |
| `client.queryBlocksWithPagination` | Async generator over block pages |
| `client.queryTransactionsWithPagination` | Async generator over transaction pages |
| `client.queryLogsWithPagination` | Async generator over log pages |
| `client.queryTracesWithPagination` | Async generator over trace pages |
| `client.queryTransfersWithPagination` | Async generator over transfer pages |
| `client.queryContractLogsWithPagination` | Async generator over decoded event-log pages |
| `client.queryContractTracesWithPagination` | Async generator over decoded contract-call pages |

### Utilities

| Export | Description |
| --- | --- |
| `queryActions` | Factory that bundles all query functions for a client |
| `isLastPage` | Check if a response is the final page |
| `getFieldsForRequest` | Resolve which fields will appear in a response |

### Formatters

| Export | Description |
| --- | --- |
| `formatQueryBlocksResponse` | Format a raw `eth_queryBlocks` response |
| `formatQueryTransactionsResponse` | Format a raw `eth_queryTransactions` response |
| `formatQueryLogsResponse` | Format a raw `eth_queryLogs` response |
| `formatQueryTracesResponse` | Format a raw `eth_queryTraces` response |
| `formatQueryTransfersResponse` | Format a raw `eth_queryTransfers` response |

### Types

| Export | Description |
| --- | --- |
| `QueryRpcSchema` | Viem RPC schema for the `eth_query*` methods |
| `QueryBlocksRequest`, `QueryBlocksResponse` | Block query request and response types |
| `QueryTransactionsRequest`, `QueryTransactionsResponse` | Transaction query request and response types |
| `QueryLogsRequest`, `QueryLogsResponse` | Log query request and response types |
| `QueryTracesRequest`, `QueryTracesResponse` | Trace query request and response types |
| `QueryContractLogsRequest`, `QueryContractLogsResponse` | ABI event-log request and decoded response types |
| `QueryContractTracesRequest`, `QueryContractTracesResponse` | ABI contract-call request and decoded response types |
| `QueryTransfersRequest`, `QueryTransfersResponse` | Transfer query request and response types |
| `TransactionsFilter`, `LogsFilter`, `TracesFilter`, `TransfersFilter` | Table-specific filter types |

### Field Constants

| Constant | Fields |
| --- | --- |
| `blockFields` | `number`, `hash`, `timestamp`, `gasUsed`, `gasLimit`, `miner`, `size`, ... (25 total) |
| `transactionFields` | `hash`, `from`, `to`, `value`, `gas`, `gasPrice`, `input`, `nonce`, ... (33 total) |
| `callTraceFields` | `from`, `to`, `value`, `gas`, `gasUsed`, `input`, `output`, `type`, ... (17 total) |
| `logFields` | `address`, `data`, `topics`, `blockNumber`, `transactionHash`, ... (8 total) |
| `transferFields` | `from`, `to`, `value`, `blockNumber`, `transactionHash`, ... (9 total) |

See [`docs/SPEC.md`](./docs/SPEC.md) for the full raw JSON-RPC method specification.
