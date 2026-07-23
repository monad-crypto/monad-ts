# Watch Methods Design

Status: Finalized for v1 implementation

## Summary

Add client-side watch actions for the five `eth_query*` methods. A watcher polls a moving chain tip, queries every newly available block in ascending order, and passes matching data to a callback. It also detects canonical-chain changes within a bounded history window, reports previously delivered data that became non-canonical, and then delivers replacement data.

This document proposes an initial shape and records the decisions that must be made before implementation. It does not change the `eth_query*` JSON-RPC specification.

## Goals

- Watch blocks, transactions, logs, traces, and native transfers using the existing query filters and field projections.
- Catch up through every scanned block, including when several blocks arrive between polls.
- Reuse the existing response format and pagination behavior.
- Detect same-height replacements, chain rollbacks, and replacement branches.
- Tell consumers which previously delivered data and block headers became non-canonical.
- Keep polling serial so slow requests and callbacks cannot overlap.
- Return an `unwatch` function consistent with Viem watch actions.

## Non-goals

- Add server-side subscriptions or new JSON-RPC methods.
- Persist watcher state across process restarts.
- Guarantee delivery after process termination.
- Decode ABI events or traces. ABI-aware query wrappers are a separate feature.
- Handle reorgs of unlimited depth using unbounded memory.
- Make descending queries live. Live consumption is oldest-first.

## Existing Constraints

The current package has five one-shot actions and five snapshot-oriented pagination actions. Pagination pins the first response's resolved `toBlock`, so it intentionally does not follow a moving tip.

Each query response contains `fromBlock`, `toBlock`, and `cursorBlock` references with `number`, `hash`, and `parentHash`. These references are enough to validate continuity at page boundaries, but not enough to reconstruct every block in a replaced branch. A page may scan many blocks while exposing only its first, last, and cursor headers.

Viem already exports an action named `watchBlocks`. Adding the same decorated action name would collide on clients that use Viem's public actions. Viem watch actions otherwise establish useful conventions:

- They return `() => void`.
- They default `pollingInterval` to `client.pollingInterval`.
- They report polling failures through `onError` and continue polling.
- Polling work is serial rather than interval-overlapped.

## Existing Prototype

An earlier implementation exists in [`monad-exp/monad-data-poc`](https://github.com/monad-exp/monad-data-poc) on branch `kjs/watch`:

- Function: `liveQueryBlocks`
- File: `packages/client/src/actions.ts`
- Commit: [`632e311`](https://github.com/monad-exp/monad-data-poc/commit/632e311520afd5cff7f4a93875640c02d2674405)

The prototype is an async generator that:

- Initially queries and emits the current `latest` block.
- Polls `eth_queryBlocks` from the prior tip plus one through `latest`.
- Detects a continuity break when `raw.fromBlock.parentHash !== tipBlock.hash`.
- Retains prior query responses and walks them backward during reconciliation.
- Refetches old response ranges until it finds an unchanged range ending.
- Emits `{ type: "reorg", removed }`, then emits replacement data.
- Uses `maxReorgDepth`, defaulting to `64`, to prune history.

These are valuable design precedents. In particular, consumers receive the actual data they previously processed rather than only a generic reorg flag, and reorg recovery uses the block references already returned by `eth_query`.

The prototype should be treated as a proof of concept rather than code to port unchanged. The generalized implementation must address these gaps:

- It requests `tip + 1` even when that block does not exist, so a normal poll with no new block can terminate the generator.
- It does not follow `cursorBlock`; a limited response can skip the remainder of the resolved range.
- The response that first detects a reorg is neither emitted nor retained, which can drop replacement-fork data above the old numeric tip.
- Reconciliation mutates retained arrays while flattening and reverses `newHistory` twice, leaving history in the wrong order.
- Reconciliation emits raw hex-valued data despite promising formatted response types.
- `maxReorgDepth` prunes response entries by ending block rather than retaining an exact number of block headers.
- A one-block reorg immediately after startup can exhaust history even though the configured depth is `64`.
- Errors terminate iteration, and there is no cancellation or retry policy.
- The function is specific to blocks and is not exported from the branch's package entry point or decorator.

The new implementation should preserve the prototype's observable strengths while replacing its polling and history mechanics with a shared, tested engine.

## V1 Decisions

The v1 design uses the following behavior:

- Name the actions `watchQueryBlocks`, `watchQueryTransactions`, `watchQueryLogs`, `watchQueryTraces`, and `watchQueryTransfers`.
- Use separate `onData` and `onReorg` callbacks rather than one discriminated event callback.
- Pass full formatted query response pages to `onData` so relation tables and block-reference envelopes are preserved.
- Include only rows from orphaned blocks in `onReorg.removed`; do not conservatively remove unchanged rows from an overlapping response range.
- Order removed rows newest-first so consumers can undo state in rollback order.
- Keep `onReorg` optional. Consumers may explicitly accept replacement-data duplicates if they do not handle removals.
- When `fromBlock` is omitted, immediately query and emit the current target before following future blocks.
- Accept only a numeric `fromBlock` in v1.
- Support `"latest"`, `"safe"`, and `"finalized"` as moving target tags, defaulting to `"latest"`.
- Default `maxReorgDepth` to `64` blocks and stop with `ReorgBeyondMaxDepthError` if recovery exceeds it.
- Await callbacks and retry a page after a callback failure, providing ordered at-least-once delivery.
- Initialize immediately rather than exposing `emitOnBegin`.
- Suppress empty `onData` pages while still advancing internal scan progress.
- Do not impose additional client-side catch-up caps in v1; server range and limit policies still apply.

## Proposed API

Use names that retain the `query` distinction and avoid the Viem collision:

- `watchQueryBlocks`
- `watchQueryTransactions`
- `watchQueryLogs`
- `watchQueryTraces`
- `watchQueryTransfers`

Each action would be available as a standalone function and through `queryActions`:

```ts
const unwatch = client.watchQueryLogs({
  fromBlock: 30_000_000n,
  filter: {
    address: "0xb983b1b6f1fc04030f9d8935dbbfd2a1239d00d9",
  },
  fields: {
    logs: ["blockNumber", "transactionHash", "logIndex", "topics", "data"],
  },
  pollingInterval: 1_000,
  onData(response) {
    consume(response.data.logs);
  },
  onReorg(reorg) {
    rollback(reorg.removed.logs);
  },
  onError(error) {
    report(error);
  },
});

unwatch();
```

The common shape is expected to resemble the following. This is illustrative rather than a final type definition.

```ts
type WatchQueryParameters<
  TRequest,
  TResponse extends { data: object },
> = Omit<
  TRequest,
  "order" | "toBlock"
> & {
  onData: (response: TResponse) => void | Promise<void>;
  onReorg?: (reorg: QueryReorg<TResponse["data"]>) => void | Promise<void>;
  onError?: (error: Error) => void;
  pollingInterval?: number;
  targetBlock?: "latest" | "safe" | "finalized";
  maxReorgDepth?: number;
};

type QueryReorg<TData> = {
  commonAncestor: LightBlock;
  oldBlocks: readonly LightBlock[];
  newBlocks: readonly LightBlock[];
  removed: TData;
};
```

The action-specific response type must continue to narrow from `fields` exactly as the corresponding one-shot query does.

### Request Differences

- `order` is not accepted because watchers always process blocks in ascending order.
- `toBlock` is not accepted because a fixed end is not a live watch. `targetBlock` selects the moving head instead.
- `limit` retains its existing meaning and controls page size while catching up.
- `fromBlock` is an optional `bigint`. If provided, the watcher backfills inclusively from that block before following the moving target.
- `targetBlock` defaults to `"latest"`.
- `pollingInterval` defaults to `client.pollingInterval`.
- `maxReorgDepth` bounds retained headers and delivery history. The prototype's default of `64` is proposed pending confirmation that it is appropriate for Monad.

### Callback Semantics

The proposed `onData` callback receives formatted query response pages rather than only the primary rows. This preserves relation tables and the block-reference envelope without inventing a second response format.

- Pages are delivered in ascending block order.
- A catch-up cycle pins one resolved target block and paginates through that fixed range before resolving the target again.
- Pages with no primary rows are not passed to `onData`, but still advance internal progress.
- Replacement-branch pages are delivered through `onData` after `onReorg`.
- `onReorg.removed` contains only formatted rows from orphaned blocks, not raw RPC values or unchanged rows from overlapping ranges.
- Callbacks are awaited, providing backpressure and preserving callback order.
- The internal checkpoint advances only after `onData` completes successfully. A failed callback can therefore cause the page to be delivered again, giving at-least-once delivery while the process is alive.
- `unwatch` prevents future callbacks. Whether it aborts in-flight RPC work should depend on available transport support and is not required for v1.

This differs from Viem's current callback implementation, which does not await callbacks. The stricter behavior is proposed because query pages can be large and ordered catch-up is part of this feature's contract.

## Polling Model

Only one polling cycle runs at a time. The next delay begins after the current cycle, including callbacks, finishes.

### Initialization

1. Resolve `targetBlock` to a concrete block header.
2. If `fromBlock` was omitted, query and emit the current target, matching the prototype's initial behavior.
3. If an explicit `fromBlock` was supplied, set the next scan to that block and backfill through the resolved target.
4. Seed the bounded header and delivery journals as blocks are scanned.

Initialization starts immediately. `pollingInterval` applies before each subsequent target check.

### Normal Extension

1. Resolve `targetBlock` once for the cycle.
2. Fetch block headers from the checkpoint through the target and compare the canonical hash at the checkpoint with the retained hash. Resolving the target before querying `checkpoint + 1` avoids requesting a future block when no extension exists.
3. If the checkpoint is still canonical, validate parent/hash continuity for each new header and append those headers to the journal.
4. Query the action's primary data from `checkpoint.number + 1` through the pinned target.
5. Follow `cursorBlock` until the pinned target is fully scanned.
6. Validate every response boundary hash against the journal. This catches a reorg that occurs after headers were fetched but before the primary-data page returns.
7. Validate continuity between pages using the prior cursor hash and the next page's `fromBlock.parentHash`.
8. Deliver non-empty pages in order, retain immutable formatted delivery records, and advance the checkpoint.
9. Trim header and delivery records older than `maxReorgDepth` while retaining the boundary needed to identify a common ancestor.

Resolving and journaling headers introduces extra `eth_queryBlocks` work for transaction, log, trace, and transfer watchers. This is the cost of reporting an exact bounded reorg instead of only detecting a mismatch at the latest cursor.

### No New Blocks

If the target number and hash equal the checkpoint, the cycle makes no primary-data request and emits nothing. The hash comparison is still necessary to detect a same-height replacement.

## Reorg Model

### Detection

A reorg is detected when any of the following occurs:

- The canonical hash at the checkpoint's number differs from the retained hash.
- A new block's `parentHash` does not equal the preceding retained block's `hash`.
- A response page does not connect to the previous page's cursor block.
- A response boundary hash differs from the corresponding journaled header.
- The resolved target moves below the checkpoint.

This detects reorgs even when the watched query has no matching primary rows.

### Recovery Within The Maximum Depth

1. Fetch canonical headers covering the retained journal range through the new target.
2. Walk backward to find the highest block number whose retained and canonical hashes match.
3. Build `oldBlocks` from the orphaned retained suffix in ascending order.
4. Build `newBlocks` from the replacement canonical suffix in ascending order, bounded to `maxReorgDepth` headers. This may be empty during a pure rollback with no replacement blocks yet; replacement query data still catches up through the full target.
5. Use internal block identity to select and combine the retained formatted rows invalidated after the common ancestor.
6. Call `onReorg` with those rows before delivering any replacement data.
7. Discard journal and delivery state after `commonAncestor`.
8. Replay the primary query from `commonAncestor.number + 1` through the pinned target using normal `onData` callbacks. This replay must include the response that originally exposed the continuity break.

Ordering `oldBlocks` and `newBlocks` from oldest to newest makes forward application straightforward. Consumers that undo state in reverse order can reverse `oldBlocks`.

### Reorg Beyond The Maximum Depth

If no common ancestor exists in retained history, exact automatic recovery is impossible. The watcher should create a dedicated `ReorgBeyondMaxDepthError`, pass it to `onError`, and stop delivering data rather than silently replaying from an arbitrary point.

Possible future policies include a required recovery block, a user-provided checkpoint loader, or an `onReorg` result that instructs the watcher where to resume. These add complexity and are not proposed for v1.

### Removed Data

The prototype establishes a strong and useful precedent: reorg notifications contain data that was previously delivered and is no longer canonical. The generalized API should preserve this behavior rather than requiring every consumer to reconstruct removals from block headers.

The engine must retain immutable formatted delivery records. It must never combine data by mutating a retained response. A reorg payload contains the same normalized data-table shape as `response.data`, filtered to rows associated with orphaned blocks.

A response can span both unchanged and orphaned blocks. To report only invalidated rows, the watcher may need to add identity fields to the internal request even when the public projection omits them:

- Blocks require `number` and `hash`.
- Transactions require `blockNumber`, `blockHash`, and `hash`.
- Logs require `blockNumber`, `blockHash`, `transactionHash`, and `logIndex`.
- Traces require `blockNumber`, `blockHash`, `transactionHash`, and `traceAddress`.
- Transfers require `blockNumber`, `blockHash`, `transactionHash`, and `traceAddress`.

These internal fields are projected out before `onData` while still allowing retained data to be grouped by canonical block. Relation tables need the same treatment so `removed` does not contain unrelated rows from an unchanged prefix. Combining affected records must construct fresh arrays and preserve the caller's requested field projection.

## Errors And Delivery Guarantees

Errors should be divided by whether retrying the same state can succeed.

Retriable errors include transport failures, transient RPC errors, and callback failures. They call `onError`, retain the prior checkpoint, wait one polling interval, and retry. The same page may be delivered more than once.

Fatal consistency errors include an invalid cursor, non-advancing pagination, malformed block continuity, and a reorg beyond the retained maximum depth. They call `onError` and stop the watcher.

The v1 guarantee is:

- Ordered, at-least-once delivery within one process.
- No concurrent `onData` or `onReorg` calls from one watcher.
- No guarantee across process restarts.
- Duplicate delivery is possible after callback or transport ambiguity, so consumers should be idempotent.

## Shared Polling

Viem's internal `observe` utility can combine equivalent watchers into one poller. That optimization should not be part of the first implementation. Watchers have independent async callbacks, checkpoints, retry state, and reorg journals, making a correct observer identity and backpressure policy more complex than the RPC savings justify initially.

## Implementation Plan

### Phase 1: Shared Engine

- Extract or reuse request serialization and pagination validation from `actions.ts`.
- Add a generic internal polling engine parameterized by method name, formatter, primary table name, and request/response types.
- Add target resolution and ascending block-header pagination.
- Add bounded, immutable header and delivery journals plus reorg comparison logic.
- Preserve the prototype's removed-data behavior without mutating retained responses.
- Add cancellation, serial scheduling, callback backpressure, and error classification.

### Phase 2: Public Actions

- Add all five standalone watch functions.
- Add all five functions to `queryActions`.
- Export watch parameter, reorg, and error types from `index.ts`.
- Add JSDoc that states start position, target tag, duplicate-delivery, callback, and maximum-reorg-depth behavior.

### Phase 3: Verification

- Add deterministic unit tests with a scripted mock client for polling and reorg scenarios.
- Port the prototype's intended scenarios as regression tests rather than porting its implementation directly.
- Add compile-time tests for field-projection inference on every watcher.
- Add focused integration coverage against an `eth_query` endpoint for catch-up and empty ranges.
- Update the package README with one basic watcher example and one reorg-handling example.

## Test Matrix

The implementation should cover at least:

- No new blocks.
- One new block and multiple new blocks between polls.
- Empty primary results while the checkpoint advances.
- Multiple pages in one catch-up cycle.
- A server page that stops before its requested limit.
- A page that includes more rows than `limit` to complete a block.
- Explicit historical backfill followed by live polling.
- Same-height replacement.
- One-block and multi-block replacement branches.
- Rollback to a lower head with no replacement block yet.
- Reorg while paginating a catch-up range.
- Reorg splitting a previously delivered page, with only orphaned rows removed.
- Delivery of replacement data both below and above the old numeric tip.
- Formatted, projected values in both `onData` and `onReorg`.
- Reorg exactly at the retained-depth boundary.
- Reorg deeper than the retained maximum depth.
- Malformed or non-advancing cursor responses.
- Transient RPC failure followed by recovery.
- Synchronous and asynchronous callback failure followed by retry.
- Unwatch before the first poll, during an RPC, and during a callback.
- Type narrowing for primary fields and relation fields.

## V1 Acceptance Criteria

Implementation can begin after the open decisions affecting public types and recovery guarantees are resolved. V1 is complete when:

- All five watchers expose standalone and decorated APIs.
- A watcher catches up to a pinned target without gaps and then continues polling.
- Reorgs within the configured maximum depth produce one ordered `onReorg` notification before replacement data.
- Reorgs beyond the maximum depth fail explicitly without silently advancing.
- Polling, callbacks, and retries never overlap within one watcher.
- Public types preserve the existing field-selection inference.
- Deterministic tests cover normal extension, pagination, transient errors, callback retry, cancellation, and the reorg matrix above.
