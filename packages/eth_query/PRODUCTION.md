# Production Readiness

This document describes the production expectations for `@monad-crypto/eth_query` and tracks the remaining work before the package should be published as production-ready.

`@monad-crypto/eth_query` is a TypeScript/Viem client for the Monad Data query API. It exposes typed read-only JSON-RPC actions for querying indexed blocks, transactions, logs, traces, and native transfers with field-level projection and optional pagination.

## API Surface

The package exports standalone actions that accept a Viem client plus one request object:

| Action | RPC method | Primary table |
| --- | --- | --- |
| `queryBlocks` | `eth_queryBlocks` | `blocks` |
| `queryTransactions` | `eth_queryTransactions` | `transactions` |
| `queryLogs` | `eth_queryLogs` | `logs` |
| `queryTraces` | `eth_queryTraces` | `traces` |
| `queryTransfers` | `eth_queryTransfers` | `transfers` |

Each action also has a `*WithPagination` async generator variant. The `queryActions(client)` helper returns the same actions already bound to a client.

The package also exports field constants, response/request types, `QueryRpcSchema`, `getFieldsForRequest`, and `isLastPage`.

## Request Model

All query requests share these fields:

| Field | Description |
| --- | --- |
| `fromBlock` | Starting block in traversal direction. Accepts `bigint`, `earliest`, or `latest`; `pending` is intentionally excluded. |
| `toBlock` | Inclusive ending block. Accepts `bigint`, `earliest`, or `latest`; `pending` is intentionally excluded. |
| `order` | Traversal direction, `asc` or `desc`. Defaults to server behavior when omitted. |
| `limit` | Target number of primary-table rows. Serialized to a hex quantity before the RPC call. |
| `fields` | Projection and relation selection per table. Omitted primary table fields mean all primary fields are requested. |

Filters are table-specific and are forwarded to the RPC server without client-side validation beyond TypeScript typing. Address and selector filters accept either a scalar value or an array, representing OR semantics within that field. Log topic filters follow `eth_getLogs` positional topic semantics.

## Response Formatting

The RPC server returns hex quantities. The package normalizes successful responses into Viem-style JavaScript values before returning them:

| Value | Returned as |
| --- | --- |
| Block numbers, gas values, balances, and transfer values | `bigint` |
| Transaction, log, and trace indexes | `number` |
| Transaction types | Viem-formatted transaction type strings |
| Receipt status | `success` or `reverted` |
| Trace status | `success` or `reverted` |

Projection is preserved during formatting. If a response row only includes selected fields, formatters should only return those selected fields. Related tables are only present when requested in `fields`.

## Pagination

Pagination helpers are async generators. Each helper:

1. Sends the initial request.
2. Yields the formatted response page.
3. Stops when `cursorBlock.number === toBlock.number`.
4. Otherwise advances `fromBlock` to `cursorBlock + 1` for ascending queries or `cursorBlock - 1` for descending queries.

Pagination is block-cursor based, not row-offset based. Callers should still choose an appropriate `limit` and apply their own upper bounds when consuming untrusted or very large ranges.

## Trust And Security Model

This package is a client-side wrapper around a configured JSON-RPC transport. It does not verify RPC responses against consensus data or independently validate indexed results.

Production users must treat the configured RPC endpoint as trusted for:

- The completeness and correctness of returned blocks, transactions, logs, traces, and transfers.
- The interpretation of `latest` and `earliest` block tags.
- Pagination cursor behavior and inclusive range semantics.
- Filter semantics and returned relation rows.

This package only performs request serialization, typed response shaping, and best-effort value formatting. It does not sign transactions, mutate chain state, manage keys, retry failed requests, rate limit traffic, verify Merkle proofs, or protect callers from malicious RPC responses.

## Production Invariants

Before release, the following invariants should be covered by tests or documented as intentional behavior:

- Public actions call only the fixed `eth_query*` methods listed in this document.
- `bigint` block and limit inputs are serialized as hex quantities before transport.
- Response formatters preserve projected field sets and do not add unrelated fields.
- Related tables are omitted unless explicitly requested in `fields`.
- `isLastPage` remains tied to `cursorBlock.number === toBlock.number`.
- Pagination handles ascending and descending inclusive block ranges without skipping or duplicating blocks.
- Invalid RPC parameters surface as Viem/RPC errors without being swallowed or rewritten.

## Productionization Checklist

Before publishing `@monad-crypto/eth_query` as production-ready:

- Add ABI-aware wrapper actions from monad-exp/monad-data-poc#60, including `queryContractLogs`, `queryContractLogsWithPagination`, `queryContractTraces`, and `queryContractTracesWithPagination` for typed event/call filtering and decoding.
- Audit pagination edge cases, especially zero/one-row pages, inclusive block ranges, `latest`/`earliest` tags, and underflow when paginating descending from block `0`.
- Remove or justify all `@ts-expect-error` casts in response formatting.
- Decide whether `debug.ts` types belong in the public package or should be internalized/removed.
- Add examples for standalone actions and `queryActions(client)` in the README.
- Review this document against the final public API, trust boundaries, formatting behavior, and non-goals.
- Add a changeset for the first release once the package API is finalized.
