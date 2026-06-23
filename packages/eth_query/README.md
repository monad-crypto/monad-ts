# @monad-crypto/eth_query

TypeScript client for the Monad Data query API. Provides typed [Viem](https://viem.sh) actions for querying blocks, transactions, logs, traces, and transfers with field-level projection and automatic pagination.

## Quick Start

```ts
import { createClient, http } from "viem";
import { monad } from "viem/chains";
import type { QueryRpcSchema } from "@monad-crypto/eth_query";
import { queryActions } from "@monad-crypto/eth_query";

const client = createClient<QueryRpcSchema>({
  transport: http("https://rpc.monad.xyz"),
  chain: monad,
});

const actions = queryActions(client);

const response = await actions.queryTransactions({
  fromBlock: 1n,
  toBlock: 256n,
  fields: {
    transactions: ["hash", "from", "to", "value"],
  },
});

console.log(response.data.transactions);
// ^? { hash: Hex; from: Address; to: Address | null; value: bigint }[]
```

## Field Selection

Specify which fields to return per table. The response type narrows automatically based on the fields you select.

```ts
// Only get hash and from — response type reflects this
const response = await actions.queryTransactions({
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
const response = await actions.queryTransactions({
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
const response = await actions.queryTransactions({
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
const response = await actions.queryTransactions({
  fromBlock: 1n,
  toBlock: 65536n,
  filter: {
    from: ["0x..."],
  },
  fields: {
    transactions: ["hash", "from", "to", "value"],
  },
});

// Filter logs by address and topics
const response = await actions.queryLogs({
  fromBlock: 1n,
  toBlock: 65536n,
  filter: {
    address: ["0x..."],
    topics: [["0x..."]],
  },
  fields: {
    logs: ["address", "data", "topics"],
  },
});
```

## Pagination

Use the `*WithPagination` async generators to automatically paginate through large result sets:

```ts
import { queryTransactionsWithPagination } from "@monad-crypto/eth_query";

for await (const page of queryTransactionsWithPagination(client, {
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

## API Reference

### Query Functions

| Function | Description |
| --- | --- |
| `queryBlocks` | Query blocks by range |
| `queryTransactions` | Query transactions with optional filters |
| `queryLogs` | Query event logs with optional filters |
| `queryTraces` | Query call traces with optional filters |
| `queryTransfers` | Query native transfers with optional filters |

### Pagination Functions

| Function | Description |
| --- | --- |
| `queryBlocksWithPagination` | Async generator over block pages |
| `queryTransactionsWithPagination` | Async generator over transaction pages |
| `queryLogsWithPagination` | Async generator over log pages |
| `queryTracesWithPagination` | Async generator over trace pages |
| `queryTransfersWithPagination` | Async generator over transfer pages |

### Utilities

| Export | Description |
| --- | --- |
| `queryActions` | Factory that bundles all query functions for a client |
| `isLastPage` | Check if a response is the final page |
| `getFieldsForRequest` | Resolve which fields will appear in a response |

### Field Constants

| Constant | Fields |
| --- | --- |
| `blockFields` | `number`, `hash`, `timestamp`, `gasUsed`, `gasLimit`, `miner`, `size`, ... (25 total) |
| `transactionFields` | `hash`, `from`, `to`, `value`, `gas`, `gasPrice`, `input`, `nonce`, ... (32 total) |
| `callTraceFields` | `from`, `to`, `value`, `gas`, `gasUsed`, `input`, `output`, `type`, ... (18 total) |
| `logFields` | `address`, `data`, `topics`, `blockNumber`, `transactionHash`, ... (8 total) |
| `transferFields` | `from`, `to`, `value`, `blockNumber`, `transactionHash`, ... (9 total) |
