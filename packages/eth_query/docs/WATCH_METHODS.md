# Watch Methods Design

## Summary

The package provides live watchers for all five `eth_query*` methods:

- `watchQueryBlocks`
- `watchQueryTransactions`
- `watchQueryLogs`
- `watchQueryTraces`
- `watchQueryTransfers`

Each watcher calls its corresponding query method, awaits callbacks serially,
and returns an unsubscribe function. Non-block watchers never query
`eth_queryBlocks`.

## API

Watch parameters contain the original query's filters, fields, and limit, plus
the watch callbacks and controls:

```ts
type WatchQueryParameters<Query, Response extends { data: object }> = Omit<
  Query,
  "fromBlock" | "toBlock" | "order"
> & {
  onData: (response: Response) => void | Promise<void>;
  onReorg?: (reorg: { removed: Response["data"] }) => void | Promise<void>;
  pollingInterval?: number;
  maxReorgDepth?: number;
};
```

Watchers are live-only. They do not backfill a caller-selected range and always
scan in ascending order.

## Initialization

The first request is:

```text
fromBlock = latest
toBlock   = latest
```

The response is emitted when its primary table is non-empty. Its `cursorBlock`
becomes the local tip even when the response is empty.

## Polling

One outer request runs after each polling interval:

```text
fromBlock = localTip.number
toBlock   = latest
```

The overlap validates that the local tip remains canonical:

```text
response.fromBlock.hash == localTip.hash
```

Rows at the overlapping local tip are filtered out because they were already
processed. The response's `toBlock` pins the target for the rest of the cycle.
No separate target-resolution request is needed.

If the outer response stops before the target, the inner loop requests:

```text
fromBlock = cursorBlock.number + 1
toBlock   = pinnedTarget.number
```

Each inner page must connect to the preceding cursor:

```text
response.fromBlock.parentHash == cursorBlock.hash
response.toBlock.hash == pinnedTarget.hash
```

The inner loop ends when `cursorBlock.number == pinnedTarget.number`.

## Reorg Detection

A reorg is detected when:

- An outer response resolves a different hash at the local tip.
- An inner response's `fromBlock.parentHash` differs from the prior cursor.
- The pinned target's hash changes during pagination.

The reusable `hasReorg(previous, next)` helper compares overlapping blocks by
hash and adjacent blocks by `parentHash`.

## Reconciliation

Response boundaries can detect a reorg but cannot locate an exact common
ancestor inside a page that scanned several blocks. The watcher therefore uses
page-rewind semantics instead of claiming exact orphan classification.

The watcher retains:

- Previously delivered rows with internal block identity fields.
- Recent `fromBlock` and `cursorBlock` checkpoints.
- The parent hashes exposed by those checkpoints.

After detecting a reorg, it probes retained checkpoints newest-first using the
same underlying query method with a one-block range. The first checkpoint whose
hash still matches is the rewind point.

The watcher then:

1. Calls `onReorg` with all retained rows after the rewind point, newest-first.
2. Removes those rows and later checkpoints from local state.
3. Sets the local tip to the matching checkpoint.
4. Restarts the outer loop, which replays replacement data through `onData`.

The rewind can include unchanged rows when the exact common ancestor lies
inside a multi-block page. Consumers should remove every row passed to
`onReorg`; those rows will be replayed if they remain canonical.

If no checkpoint matches within `maxReorgDepth`, the watcher throws an uncaught
`Error` with a descriptive message and stops.

## Delivery Semantics

- Query pages and callbacks are serial.
- Empty pages advance progress without calling `onData`.
- State advances only after `onData` resolves.
- Internal identity fields are projected out unless requested by the caller.
- Calling the returned unsubscribe function prevents future callbacks.

## Errors

The watcher has no `onError` callback and does not retry failures. An RPC
failure, malformed response, `onData` or `onReorg` exception, or unrecoverable
reorg terminates the polling loop. The error is rethrown on the microtask queue
as an uncaught exception. Unless the application installs a process-level
uncaught-exception handler, the runtime determines the resulting process
behavior.

## Known Limitation

If the canonical chain rolls back below `localTip.number`, the outer numeric
`fromBlock` may be above `latest` and the RPC may reject the range. The watcher
currently throws that request error as an uncaught exception. A code TODO
records the future fallback: query `latest` to `latest`, then reconcile from
the rolled-back tip.
