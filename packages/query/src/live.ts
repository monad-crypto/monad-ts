import type { Account, Chain, Client, Prettify, Transport } from "viem";
import type {
  BlockResponse,
  BlocksFilter,
  CallTraceResponse,
  LightBlock,
  LogResponse,
  LogsFilter,
  QueryLogsFields,
  QueryRpcSchema,
  QueryTracesFields,
  QueryTransfersFields,
  ResolveSelect,
  ResolveTransactionSelect,
  TableName,
  TracesFilter,
  TransactionsFilter,
  TransferResponse,
  TransfersFilter,
} from "./types.js";

type QueryClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Client<transport, chain, account, QueryRpcSchema>;

/**
 * Which chain head a live query follows.
 *
 * - `"finalized"`: append-only. Never emits `reorg` or `finalize` events.
 * - `"safe"` and `"latest"`: emit `reorg` and `finalize` events.
 */
export type LiveTag = "latest" | "safe" | "finalized";

/** Block reference attached to every live event. */
export type LiveBlock<quantity = bigint> = LightBlock<quantity> & {
  timestamp: quantity;
};

/**
 * The last block a consumer fully processed. Pass the `toBlock` of the last
 * handled `block` event (or the `block` of the last handled `reorg` event) to
 * resume without gaps or duplicates.
 */
export type LiveCursor<quantity = bigint> = Pick<
  LightBlock<quantity>,
  "number" | "hash"
>;

/**
 * Row filters per table. Each table accepts an array of filters that are
 * OR'd together. A table with a filter is a primary table; matched rows are
 * returned in `data[table]`.
 */
export type QueryLiveFilter = {
  blocks?: readonly BlocksFilter[];
  transactions?: readonly TransactionsFilter[];
  logs?: readonly LogsFilter[];
  traces?: readonly TracesFilter[];
  transfers?: readonly TransfersFilter[];
};

/**
 * Field projection per table. A table without a filter but with fields is a
 * relation; rows related to matched primary rows are returned.
 */
export type QueryLiveFields = {
  blocks?: QueryLogsFields["blocks"];
  transactions?: QueryLogsFields["transactions"];
  logs?: QueryLogsFields["logs"];
  traces?: QueryTracesFields["traces"];
  transfers?: QueryTransfersFields["transfers"];
};

export type QueryLiveRequest = {
  /** Chain head to follow. @default "finalized" */
  tag?: LiveTag;
  /**
   * Resume after this block. If the block is no longer canonical, the first
   * event is a `reorg`. If omitted, the first event is the current head of
   * `tag`.
   */
  cursorBlock?: LiveCursor;
  /** Row filters per table. */
  filter: QueryLiveFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryLiveFields;
  /**
   * Emit `finalize` events. Has no effect when `tag` is `"finalized"`.
   * @default false
   */
  includeFinalization?: boolean;
};

type LiveRow<table extends TableName, select> = {
  blocks: ResolveSelect<BlockResponse, select>;
  transactions: ResolveTransactionSelect<select, bigint, number>;
  logs: ResolveSelect<LogResponse, select>;
  traces: ResolveSelect<CallTraceResponse, select>;
  transfers: ResolveSelect<TransferResponse, select>;
}[table];

type FilterOf<request, table extends TableName> = request extends {
  filter: infer filter;
}
  ? table extends keyof filter
    ? filter[table]
    : undefined
  : undefined;

type FieldsOf<request, table extends TableName> = request extends {
  fields?: infer fields;
}
  ? fields extends object
    ? table extends keyof fields
      ? fields[table]
      : undefined
    : undefined
  : undefined;

type RequiredTables<request> = {
  [table in TableName]: undefined extends FilterOf<request, table>
    ? undefined extends FieldsOf<request, table>
      ? never
      : table
    : table;
}[TableName];

type OptionalTables<request> = Exclude<
  {
    [table in TableName]: [FilterOf<request, table>] extends [undefined]
      ? [FieldsOf<request, table>] extends [undefined]
        ? never
        : table
      : table;
  }[TableName],
  RequiredTables<request>
>;

/** Matched rows and requested relations, keyed by table. */
export type QueryLiveData<request extends QueryLiveRequest = QueryLiveRequest> =
  Prettify<
    {
      [table in RequiredTables<request>]: LiveRow<
        table,
        FieldsOf<request, table>
      >[];
    } & {
      [table in OptionalTables<request>]?: LiveRow<
        table,
        FieldsOf<request, table>
      >[];
    }
  >;

/**
 * Data for a contiguous range of canonical blocks. `fromBlock.parentHash`
 * equals the `toBlock.hash` of the previous `block` event, or the `block.hash`
 * of the preceding `reorg` event.
 */
export type QueryLiveBlockEvent<
  request extends QueryLiveRequest = QueryLiveRequest,
> = {
  type: "block";
  fromBlock: LiveBlock;
  toBlock: LiveBlock;
  data: QueryLiveData<request>;
};

/**
 * The chain was rewound to `block`. Every row above `block.number` that was
 * previously delivered is invalid and listed in `removed`. Replacement data
 * follows as `block` events.
 *
 * `block` is canonical but may be older than the exact common ancestor. It is
 * never below the last `finalize` event.
 */
export type QueryLiveReorgEvent<
  request extends QueryLiveRequest = QueryLiveRequest,
> = {
  type: "reorg";
  block: LiveBlock;
  removed: QueryLiveData<request>;
};

/**
 * Every block at or below `block` is final. `block.number` is monotonic and
 * never above the `toBlock` of the last `block` event.
 */
export type QueryLiveFinalizeEvent = {
  type: "finalize";
  block: LiveBlock;
};

type IsFinalizedTag<request> = [
  Extract<
    request extends { tag?: infer tag } ? tag : undefined,
    "latest" | "safe"
  >,
] extends [never]
  ? true
  : false;

type IncludesFinalization<request> =
  IsFinalizedTag<request> extends true
    ? false
    : request extends { includeFinalization?: infer include }
      ? true extends include
        ? true
        : false
      : false;

export type QueryLiveEvent<
  request extends QueryLiveRequest = QueryLiveRequest,
> =
  | QueryLiveBlockEvent<request>
  | (IsFinalizedTag<request> extends true
      ? never
      : QueryLiveReorgEvent<request>)
  | (IncludesFinalization<request> extends true
      ? QueryLiveFinalizeEvent
      : never);

export type WatchQueryCallbacks<
  request extends QueryLiveRequest = QueryLiveRequest,
> = {
  /** Called serially for each `block` event. The next event waits for the returned promise. */
  onBlock: (event: QueryLiveBlockEvent<request>) => void | Promise<void>;
  /**
   * Called once with an unrecoverable error, after which the watcher stops.
   * Dropped connections and transient RPC errors are retried by resuming from
   * the last delivered block.
   */
  onError?: (error: Error) => void;
} & (IsFinalizedTag<request> extends true
  ? { onReorg?: never }
  : {
      /** Called serially for each `reorg` event. Required when `tag` is not `"finalized"`. */
      onReorg: (event: QueryLiveReorgEvent<request>) => void | Promise<void>;
    }) &
  (IncludesFinalization<request> extends true
    ? {
        /** Called serially for each `finalize` event. Required when `includeFinalization` is `true`. */
        onFinalize: (event: QueryLiveFinalizeEvent) => void | Promise<void>;
      }
    : { onFinalize?: never });

/**
 * Live request with each member inferred separately, so callbacks that depend
 * on the request do not block inference.
 */
type InferredQueryLiveRequest<
  tag extends LiveTag | undefined,
  filter extends QueryLiveFilter,
  fields extends QueryLiveFields | undefined,
  includeFinalization extends boolean | undefined,
> = {
  tag?: tag;
  cursorBlock?: LiveCursor;
  filter: filter;
  fields?: fields;
  includeFinalization?: includeFinalization;
};

type ResolvedQueryLiveRequest<
  tag extends LiveTag | undefined,
  filter extends QueryLiveFilter,
  fields extends QueryLiveFields | undefined,
  includeFinalization extends boolean | undefined,
> = {
  tag: tag;
  filter: filter;
  fields: fields;
  includeFinalization: includeFinalization;
};

export type WatchQueryParameters<
  tag extends LiveTag | undefined = LiveTag | undefined,
  filter extends QueryLiveFilter = QueryLiveFilter,
  fields extends QueryLiveFields | undefined = QueryLiveFields | undefined,
  includeFinalization extends boolean | undefined = boolean | undefined,
> = InferredQueryLiveRequest<tag, filter, fields, includeFinalization> &
  WatchQueryCallbacks<
    ResolvedQueryLiveRequest<tag, filter, fields, includeFinalization>
  >;

export type StreamQueryParameters<
  tag extends LiveTag | undefined = LiveTag | undefined,
  filter extends QueryLiveFilter = QueryLiveFilter,
  fields extends QueryLiveFields | undefined = QueryLiveFields | undefined,
  includeFinalization extends boolean | undefined = boolean | undefined,
> = InferredQueryLiveRequest<tag, filter, fields, includeFinalization> & {
  /** Stops the stream. A pending `next()` resolves with `done: true`. */
  signal?: AbortSignal;
};

/**
 * Follow the chain and invoke callbacks for each live query event.
 *
 * Returns a function that stops the watcher.
 */
export function watchQuery<
  const filter extends QueryLiveFilter,
  const fields extends QueryLiveFields | undefined = undefined,
  tag extends LiveTag | undefined = undefined,
  includeFinalization extends boolean | undefined = undefined,
>(
  _client: QueryClient,
  _parameters: WatchQueryParameters<tag, filter, fields, includeFinalization>,
): () => void {
  throw new Error("watchQuery is not implemented");
}

/**
 * Follow the chain and yield each live query event.
 *
 * Breaking out of the loop or aborting `signal` stops the stream. Errors that
 * cannot be recovered by resuming are thrown from `next()`.
 */
export function streamQuery<
  const filter extends QueryLiveFilter,
  const fields extends QueryLiveFields | undefined = undefined,
  tag extends LiveTag | undefined = undefined,
  includeFinalization extends boolean | undefined = undefined,
>(
  _client: QueryClient,
  _parameters: StreamQueryParameters<tag, filter, fields, includeFinalization>,
): AsyncGenerator<
  QueryLiveEvent<
    ResolvedQueryLiveRequest<tag, filter, fields, includeFinalization>
  >,
  void,
  undefined
> {
  throw new Error("streamQuery is not implemented");
}
