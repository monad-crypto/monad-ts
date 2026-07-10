import type {
  Address,
  Block,
  BlockTag,
  Hash,
  Hex,
  Log,
  Prettify,
  Transaction,
  TransactionReceipt,
} from "viem";
import type { CallFrame } from "./debug.js";

export type MethodName =
  | "eth_queryBlocks"
  | "eth_queryTransactions"
  | "eth_queryLogs"
  | "eth_queryTraces"
  | "eth_queryTransfers";

export type QueryRpcSchema = [
  {
    Method: "eth_queryBlocks";
    Parameters: [QueryBlocksRequest<Hex, Hex>];
    ReturnType: QueryBlocksResponse<QueryBlocksRequest, Hex>;
  },
  {
    Method: "eth_queryTransactions";
    Parameters: [QueryTransactionsRequest<Hex, Hex>];
    ReturnType: QueryTransactionsResponse<QueryTransactionsRequest, Hex, Hex>;
  },
  {
    Method: "eth_queryLogs";
    Parameters: [QueryLogsRequest<Hex, Hex>];
    ReturnType: QueryLogsResponse<QueryLogsRequest, Hex, Hex>;
  },
  {
    Method: "eth_queryTraces";
    Parameters: [QueryTracesRequest<Hex, Hex>];
    ReturnType: QueryTracesResponse<QueryTracesRequest, Hex, Hex>;
  },
  {
    Method: "eth_queryTransfers";
    Parameters: [QueryTransfersRequest<Hex, Hex>];
    ReturnType: QueryTransfersResponse<QueryTransfersRequest, Hex, Hex>;
  },
];

export type LightBlock<quantity = bigint> = {
  number: quantity;
  hash: Hash;
  parentHash: Hash;
};

export type TransactionsFilter = {
  /** Sender address. Scalar or array (OR within field). */
  from?: Address | Address[];
  /** Recipient address. Scalar or array (OR within field). */
  to?: Address | Address[];
  /** 4-byte function selector. Scalar or array (OR within field). */
  selector?: Hex | Hex[];
};

export type LogsFilter = {
  /** Contract address. Scalar or array (OR within field). */
  address?: Address | Address[];
  /** Positional topic filter (same semantics as eth_getLogs). */
  topics?: (Hex | Hex[] | null)[];
};

export type TracesFilter = {
  /** Sender address. Scalar or array (OR within field). */
  from?: Address | Address[];
  /** Recipient address. Scalar or array (OR within field). */
  to?: Address | Address[];
  /** 4-byte function selector. Scalar or array (OR within field). */
  selector?: Hex | Hex[];
  /** If true, only top-level traces (those with an empty traceAddress) are returned. */
  isTopLevel?: boolean;
};

export type TransfersFilter = {
  /** Sender address. Scalar or array (OR within field). */
  from?: Address | Address[];
  /** Recipient address. Scalar or array (OR within field). */
  to?: Address | Address[];
  /** If true, only top-level transfers (those initiated directly by a transaction) are returned. */
  isTopLevel?: boolean;
};

export type TableName =
  | "blocks"
  | "transactions"
  | "logs"
  | "traces"
  | "transfers";
export type Order = "asc" | "desc";

type BlockFieldNames = readonly `${keyof BlockResponse}`[] | true;
type TransactionFieldNames = readonly `${keyof TransactionResponse}`[] | true;
type CallTraceFieldNames = readonly `${keyof CallTraceResponse}`[] | true;
type LogFieldNames = readonly `${keyof LogResponse}`[] | true;
type TransferFieldNames = readonly `${keyof TransferResponse}`[] | true;

export type QueryBlocksFields = {
  blocks?: BlockFieldNames;
};

export type QueryTransactionsFields = {
  blocks?: BlockFieldNames;
  transactions?: TransactionFieldNames;
};

export type QueryTracesFields = {
  blocks?: BlockFieldNames;
  transactions?: TransactionFieldNames;
  traces?: CallTraceFieldNames;
};

export type QueryLogsFields = {
  blocks?: BlockFieldNames;
  transactions?: TransactionFieldNames;
  logs?: LogFieldNames;
};

export type QueryTransfersFields = {
  blocks?: BlockFieldNames;
  transactions?: TransactionFieldNames;
  transfers?: TransferFieldNames;
};

export type CommonRequestFields<quantity = bigint, limit = number> = {
  /** Starting block for the query, in the direction of traversal. Defaults to "earliest" (asc) or "latest" (desc). */
  fromBlock?: quantity | Exclude<BlockTag, "pending">;
  /** Ending block for the query (inclusive). Optional. */
  toBlock?: quantity | Exclude<BlockTag, "pending">;
  /** Traversal direction. @default "asc" */
  order?: Order;
  /** Target number of primary-table rows. @default 100 */
  limit?: limit;
};

export type QueryBlocksRequest<
  quantity = bigint,
  limit = number,
> = CommonRequestFields<quantity, limit> & {
  /** Field projection and relation selection per table. */
  fields?: QueryBlocksFields;
};

export type QueryTransactionsRequest<
  quantity = bigint,
  limit = number,
> = CommonRequestFields<quantity, limit> & {
  /** Row filter on transactions. */
  filter?: TransactionsFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryTransactionsFields;
};

export type QueryLogsRequest<
  quantity = bigint,
  limit = number,
> = CommonRequestFields<quantity, limit> & {
  /** Row filter on logs. */
  filter?: LogsFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryLogsFields;
};

export type QueryTracesRequest<
  quantity = bigint,
  limit = number,
> = CommonRequestFields<quantity, limit> & {
  /** Row filter on traces. */
  filter?: TracesFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryTracesFields;
};

export type QueryTransfersRequest<
  quantity = bigint,
  limit = number,
> = CommonRequestFields<quantity, limit> & {
  /** Row filter on transfers. */
  filter?: TransfersFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryTransfersFields;
};

type ExtractField<TRequest, TKey extends string> = TRequest extends {
  fields?: infer F;
}
  ? F extends object
    ? TKey extends keyof F
      ? F[TKey]
      : undefined
    : undefined
  : undefined;

type ResolveSelect<TResponse, TSelect> = [TSelect] extends [
  readonly (keyof TResponse)[],
]
  ? Prettify<Pick<TResponse, (TSelect & readonly (keyof TResponse)[])[number]>>
  : TResponse;

type ResolveInclude<TResponse, TInclude> = [TInclude] extends [true]
  ? TResponse
  : [TInclude] extends [readonly (keyof TResponse)[]]
    ? Prettify<
        Pick<TResponse, (TInclude & readonly (keyof TResponse)[])[number]>
      >
    : TResponse;

type EmptyObject = Record<never, never>;

type BlockRelation<TRequest, quantity> = [
  ExtractField<TRequest, "blocks">,
] extends [undefined]
  ? EmptyObject
  : undefined extends ExtractField<TRequest, "blocks">
    ? {
        blocks?: ResolveInclude<
          BlockResponse<quantity>,
          ExtractField<TRequest, "blocks">
        >[];
      }
    : {
        blocks: ResolveInclude<
          BlockResponse<quantity>,
          ExtractField<TRequest, "blocks">
        >[];
      };

type TransactionRelation<TRequest, quantity, index> = [
  ExtractField<TRequest, "transactions">,
] extends [undefined]
  ? EmptyObject
  : undefined extends ExtractField<TRequest, "transactions">
    ? {
        transactions?: ResolveInclude<
          TransactionResponse<quantity, index>,
          ExtractField<TRequest, "transactions">
        >[];
      }
    : {
        transactions: ResolveInclude<
          TransactionResponse<quantity, index>,
          ExtractField<TRequest, "transactions">
        >[];
      };

export type QueryBlocksResponse<
  request extends QueryBlocksRequest = QueryBlocksRequest,
  quantity = bigint,
> = {
  fromBlock: LightBlock<quantity>;
  toBlock: LightBlock<quantity>;
  cursorBlock: LightBlock<quantity>;
  data: {
    blocks: ResolveSelect<
      BlockResponse<quantity>,
      ExtractField<request, "blocks">
    >[];
  };
};

export type QueryTransactionsResponse<
  request extends QueryTransactionsRequest = QueryTransactionsRequest,
  quantity = bigint,
  index = number,
> = {
  fromBlock: LightBlock<quantity>;
  toBlock: LightBlock<quantity>;
  cursorBlock: LightBlock<quantity>;
  data: {
    transactions: ResolveSelect<
      TransactionResponse<quantity, index>,
      ExtractField<request, "transactions">
    >[];
  } & BlockRelation<request, quantity>;
};

export type QueryLogsResponse<
  request extends QueryLogsRequest = QueryLogsRequest,
  quantity = bigint,
  index = number,
> = {
  fromBlock: LightBlock<quantity>;
  toBlock: LightBlock<quantity>;
  cursorBlock: LightBlock<quantity>;
  data: {
    logs: ResolveSelect<
      LogResponse<quantity, index>,
      ExtractField<request, "logs">
    >[];
  } & TransactionRelation<request, quantity, index> &
    BlockRelation<request, quantity>;
};

export type QueryTracesResponse<
  request extends QueryTracesRequest = QueryTracesRequest,
  quantity = bigint,
  index = number,
> = {
  fromBlock: LightBlock<quantity>;
  toBlock: LightBlock<quantity>;
  cursorBlock: LightBlock<quantity>;
  data: {
    traces: ResolveSelect<
      CallTraceResponse<quantity, index>,
      ExtractField<request, "traces">
    >[];
  } & TransactionRelation<request, quantity, index> &
    BlockRelation<request, quantity>;
};

export type QueryTransfersResponse<
  request extends QueryTransfersRequest = QueryTransfersRequest,
  quantity = bigint,
  index = number,
> = {
  fromBlock: LightBlock<quantity>;
  toBlock: LightBlock<quantity>;
  cursorBlock: LightBlock<quantity>;
  data: {
    transfers: ResolveSelect<
      TransferResponse<quantity, index>,
      ExtractField<request, "transfers">
    >[];
  } & TransactionRelation<request, quantity, index> &
    BlockRelation<request, quantity>;
};

export type BlockResponse<quantity = bigint> = Omit<
  Block<quantity, false, Exclude<BlockTag, "pending">>,
  "transactions"
>;

export type TransactionResponse<
  quantity = bigint,
  index = number,
  status = "success" | "reverted",
> = Transaction<quantity, index, false> &
  Omit<TransactionReceipt<quantity, index, status>, "logs">;

export type CallTraceResponse<
  quantity = bigint,
  index = number,
  status = "success" | "reverted",
> = Omit<CallFrame<quantity>, "calls" | "logs"> & {
  /** Hash of block containing this trace. */
  blockHash: Hash;
  /** Number of block containing this trace. */
  blockNumber: quantity;
  /** Hash of transaction containing this trace. */
  transactionHash: Hash;
  /** Index of transaction containing this trace. */
  transactionIndex: index;
  /** Path through nested call tree. */
  traceAddress: number[];
  /** Number of sub-calls. */
  subcalls: index;
  /**
   * `reverted` if this trace was reverted or `success` otherwise.
   *
   * Note: A trace can have no `error` but still be `reverted` if a parent trace is `reverted`.
   */
  status: status;
};

export type LogResponse<quantity = bigint, index = number> = Log<
  quantity,
  index,
  false
>;

export type TransferResponse<
  quantity = bigint,
  index = number,
  status = "success" | "reverted",
> = {
  /** Hash of block containing this trace. */
  blockHash: Hash;
  /** Number of block containing this trace. */
  blockNumber: quantity;
  /** Hash of transaction containing this trace. */
  transactionHash: Hash;
  /** Index of transaction containing this trace. */
  transactionIndex: index;
  /** Path through nested call tree of this trace. */
  traceAddress: number[];
  /** The address initiating the transfer. */
  from: Address;
  /** The target address receiving the transfer. */
  to?: Address;
  /** Amount of ETH transfer. */
  value: quantity;
  /**
   * `reverted` if this trace was reverted or `success` otherwise.
   *
   * Note: A trace can have no `error` but still be `reverted` if a parent trace is `reverted`.
   */
  status: status;
};
