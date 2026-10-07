import type {
  Abi,
  AbiStateMutability,
  Address,
  Block,
  BlockTag,
  ContractEventArgs,
  ContractEventName,
  ContractFunctionArgs,
  ContractFunctionName,
  ContractFunctionReturnType,
  GetEventArgs,
  Hash,
  Hex,
  Log,
  ParseEventLogsReturnType,
  Prettify,
  RpcBlock,
  RpcLog,
  RpcTransaction,
  RpcTransactionReceipt,
  Transaction,
  TransactionReceipt,
  UnionOmit,
} from "viem";

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
    ReturnType: RpcQueryBlocksResponse;
  },
  {
    Method: "eth_queryTransactions";
    Parameters: [QueryTransactionsRequest<Hex, Hex>];
    ReturnType: RpcQueryTransactionsResponse;
  },
  {
    Method: "eth_queryLogs";
    Parameters: [QueryLogsRequest<Hex, Hex>];
    ReturnType: RpcQueryLogsResponse;
  },
  {
    Method: "eth_queryTraces";
    Parameters: [QueryTracesRequest<Hex, Hex>];
    ReturnType: RpcQueryTracesResponse;
  },
  {
    Method: "eth_queryTransfers";
    Parameters: [QueryTransfersRequest<Hex, Hex>];
    ReturnType: RpcQueryTransfersResponse;
  },
];

export type LightBlock<quantity = bigint> = {
  number: quantity;
  hash: Hash;
  parentHash: Hash;
};

export type BlocksFilter = {
  /** Block miner / coinbase address. Scalar or array (OR within field). */
  miner?: Address | Address[];
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
  /** If true, reverted traces are also returned. Defaults to `false`. */
  includeReverted?: boolean;
};

export type TransfersFilter = {
  /** Sender address. Scalar or array (OR within field). */
  from?: Address | Address[];
  /** Recipient address. Scalar or array (OR within field). */
  to?: Address | Address[];
  /** If true, reverted transfers are also returned. Defaults to `false`. */
  includeReverted?: boolean;
};

export type TableName =
  | "blocks"
  | "transactions"
  | "logs"
  | "traces"
  | "transfers";
export type Order = "asc" | "desc";

type BlockFieldNames = readonly `${keyof RpcBlockResponse}`[] | "all";
type TransactionFieldNames =
  | readonly `${keyof RpcTransactionResponse}`[]
  | "all";
type CallTraceFieldNames = readonly `${keyof RpcCallTraceResponse}`[] | "all";
type LogFieldNames = readonly `${keyof RpcLogResponse}`[] | "all";
type TransferFieldNames = readonly `${keyof RpcTransferResponse}`[] | "all";

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

export type CommonRequestFields<quantity = bigint, target = number> = {
  /** Starting block for the query, in the direction of traversal. Defaults to "earliest" (asc) or "latest" (desc). */
  fromBlock?: quantity | Exclude<BlockTag, "pending">;
  /** Ending block for the query (inclusive). Optional. */
  toBlock?: quantity | Exclude<BlockTag, "pending">;
  /** Traversal direction. @default "asc" */
  order?: Order;
  /** Target number of primary-table rows. @default 100 */
  target?: target;
};

export type QueryBlocksRequest<
  quantity = bigint,
  target = number,
> = CommonRequestFields<quantity, target> & {
  /** Row filter on blocks. */
  filter?: BlocksFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryBlocksFields;
};

export type QueryTransactionsRequest<
  quantity = bigint,
  target = number,
> = CommonRequestFields<quantity, target> & {
  /** Row filter on transactions. */
  filter?: TransactionsFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryTransactionsFields;
};

export type QueryLogsRequest<
  quantity = bigint,
  target = number,
> = CommonRequestFields<quantity, target> & {
  /** Row filter on logs. */
  filter?: LogsFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryLogsFields;
};

export type QueryContractLogsRequest<
  abi extends Abi | readonly unknown[] = Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined =
    | ContractEventName<abi>
    | undefined,
  strict extends boolean | undefined = boolean | undefined,
> = Omit<QueryLogsRequest, "filter"> & {
  abi: abi;
  address?: Address | Address[];
  eventName?: eventName;
  args?: ContractEventArgs<
    abi,
    eventName extends ContractEventName<abi>
      ? eventName
      : ContractEventName<abi>
  >;
  strict?: strict;
};

export type QueryContractTracesRequest<
  abi extends Abi | readonly unknown[] = Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi> | undefined =
    | ContractFunctionName<abi>
    | undefined,
> = Omit<QueryTracesRequest, "filter"> & {
  abi: abi;
  address?: Address | Address[];
  from?: Address | Address[];
  functionName?: functionName;
  /** If true, reverted traces are also returned. Defaults to `false`. */
  includeReverted?: boolean;
};

export type QueryTracesRequest<
  quantity = bigint,
  target = number,
> = CommonRequestFields<quantity, target> & {
  /** Row filter on traces. */
  filter?: TracesFilter;
  /** Field projection and relation selection per table. */
  fields?: QueryTracesFields;
};

export type QueryTransfersRequest<
  quantity = bigint,
  target = number,
> = CommonRequestFields<quantity, target> & {
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

type ResolveInclude<TResponse, TInclude> = [TInclude] extends ["all"]
  ? TResponse
  : [TInclude] extends [readonly (keyof TResponse)[]]
    ? Prettify<
        Pick<TResponse, (TInclude & readonly (keyof TResponse)[])[number]>
      >
    : TResponse;

type EmptyObject = Record<never, never>;

type ResolveTransactionSelect<TSelect, quantity, index> = [TSelect] extends [
  readonly (keyof RpcTransactionResponse)[],
]
  ? Prettify<
      Pick<
        TransactionResponse<quantity, index>,
        | (TSelect & readonly (keyof RpcTransactionResponse)[])[number]
        | ("type" extends (TSelect &
            readonly (keyof RpcTransactionResponse)[])[number]
            ? "typeHex"
            : never)
      >
    >
  : TransactionResponse<quantity, index>;

type ResolveTransactionInclude<TInclude, quantity, index> = [TInclude] extends [
  "all",
]
  ? TransactionResponse<quantity, index>
  : ResolveTransactionSelect<TInclude, quantity, index>;

type RpcBlockRelation<TRequest> = [ExtractField<TRequest, "blocks">] extends [
  undefined,
]
  ? EmptyObject
  : undefined extends ExtractField<TRequest, "blocks">
    ? {
        blocks?: ResolveInclude<
          RpcBlockResponse,
          ExtractField<TRequest, "blocks">
        >[];
      }
    : {
        blocks: ResolveInclude<
          RpcBlockResponse,
          ExtractField<TRequest, "blocks">
        >[];
      };

type RpcTransactionRelation<TRequest> = [
  ExtractField<TRequest, "transactions">,
] extends [undefined]
  ? EmptyObject
  : undefined extends ExtractField<TRequest, "transactions">
    ? {
        transactions?: ResolveInclude<
          RpcTransactionResponse,
          ExtractField<TRequest, "transactions">
        >[];
      }
    : {
        transactions: ResolveInclude<
          RpcTransactionResponse,
          ExtractField<TRequest, "transactions">
        >[];
      };

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
        transactions?: ResolveTransactionInclude<
          ExtractField<TRequest, "transactions">,
          quantity,
          index
        >[];
      }
    : {
        transactions: ResolveTransactionInclude<
          ExtractField<TRequest, "transactions">,
          quantity,
          index
        >[];
      };

export type RpcQueryBlocksResponse<
  request extends QueryBlocksRequest<Hex, Hex> = QueryBlocksRequest<Hex, Hex>,
> = {
  fromBlock: LightBlock<Hex>;
  toBlock: LightBlock<Hex>;
  cursorBlock: LightBlock<Hex>;
  data: {
    blocks: ResolveSelect<RpcBlockResponse, ExtractField<request, "blocks">>[];
  };
};

export type RpcQueryTransactionsResponse<
  request extends QueryTransactionsRequest<Hex, Hex> = QueryTransactionsRequest<
    Hex,
    Hex
  >,
> = {
  fromBlock: LightBlock<Hex>;
  toBlock: LightBlock<Hex>;
  cursorBlock: LightBlock<Hex>;
  data: {
    transactions: ResolveSelect<
      RpcTransactionResponse,
      ExtractField<request, "transactions">
    >[];
  } & RpcBlockRelation<request>;
};

export type RpcQueryLogsResponse<
  request extends QueryLogsRequest<Hex, Hex> = QueryLogsRequest<Hex, Hex>,
> = {
  fromBlock: LightBlock<Hex>;
  toBlock: LightBlock<Hex>;
  cursorBlock: LightBlock<Hex>;
  data: {
    logs: ResolveSelect<RpcLogResponse, ExtractField<request, "logs">>[];
  } & RpcTransactionRelation<request> &
    RpcBlockRelation<request>;
};

export type RpcQueryTracesResponse<
  request extends QueryTracesRequest<Hex, Hex> = QueryTracesRequest<Hex, Hex>,
> = {
  fromBlock: LightBlock<Hex>;
  toBlock: LightBlock<Hex>;
  cursorBlock: LightBlock<Hex>;
  data: {
    traces: ResolveSelect<
      RpcCallTraceResponse,
      ExtractField<request, "traces">
    >[];
  } & RpcTransactionRelation<request> &
    RpcBlockRelation<request>;
};

export type RpcQueryTransfersResponse<
  request extends QueryTransfersRequest<Hex, Hex> = QueryTransfersRequest<
    Hex,
    Hex
  >,
> = {
  fromBlock: LightBlock<Hex>;
  toBlock: LightBlock<Hex>;
  cursorBlock: LightBlock<Hex>;
  data: {
    transfers: ResolveSelect<
      RpcTransferResponse,
      ExtractField<request, "transfers">
    >[];
  } & RpcTransactionRelation<request> &
    RpcBlockRelation<request>;
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
    transactions: ResolveTransactionSelect<
      ExtractField<request, "transactions">,
      quantity,
      index
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

export type ContractLogDecoded<
  abi extends Abi | readonly unknown[] = Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined =
    | ContractEventName<abi>
    | undefined,
  strict extends boolean | undefined = boolean | undefined,
> = ParseEventLogsReturnType<
  abi,
  eventName extends ContractEventName<abi> ? eventName : undefined,
  strict
>[number];

type ContractLogDecodedFields<
  abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined,
> =
  eventName extends ContractEventName<abi>
    ? {
        eventName: eventName;
        args: GetEventArgs<
          abi,
          eventName,
          {
            EnableUnion: false;
            IndexedOnly: false;
            Required: false;
          }
        >;
      }
    : {
        [name in ContractEventName<abi>]: {
          eventName: name;
          args: GetEventArgs<
            abi,
            name,
            {
              EnableUnion: false;
              IndexedOnly: false;
              Required: false;
            }
          >;
        };
      }[ContractEventName<abi>];

export type ContractLogResponse<
  request extends QueryContractLogsRequest = QueryContractLogsRequest,
  quantity = bigint,
  index = number,
> = Omit<
  QueryLogsResponse<request & QueryLogsRequest, quantity, index>,
  "data"
> & {
  data: Omit<
    QueryLogsResponse<request & QueryLogsRequest, quantity, index>["data"],
    "logs"
  > & {
    logs: (ResolveSelect<
      LogResponse<quantity, index>,
      ExtractField<request, "logs">
    > &
      ContractLogDecodedFields<
        request["abi"],
        request["eventName"] & ContractEventName<request["abi"]>
      >)[];
  };
};

type ContractTraceDecodedForName<
  abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi>,
> = {
  functionName: functionName;
  args: ContractFunctionArgs<abi, AbiStateMutability, functionName>;
  result?: ContractFunctionReturnType<abi, AbiStateMutability, functionName>;
};

export type ContractTraceDecoded<
  abi extends Abi | readonly unknown[] = Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi> | undefined =
    | ContractFunctionName<abi>
    | undefined,
> =
  functionName extends ContractFunctionName<abi>
    ? ContractTraceDecodedForName<abi, functionName>
    : {
        [name in ContractFunctionName<abi>]: ContractTraceDecodedForName<
          abi,
          name
        >;
      }[ContractFunctionName<abi>];

export type ContractTraceResponse<
  request extends QueryContractTracesRequest = QueryContractTracesRequest,
  quantity = bigint,
  index = number,
> = Omit<
  QueryTracesResponse<request & QueryTracesRequest, quantity, index>,
  "data"
> & {
  data: Omit<
    QueryTracesResponse<request & QueryTracesRequest, quantity, index>["data"],
    "traces"
  > & {
    traces: (ResolveSelect<
      CallTraceResponse<quantity, index>,
      ExtractField<request, "traces">
    > &
      ContractTraceDecoded<
        request["abi"],
        request["functionName"] & ContractFunctionName<request["abi"]>
      >)[];
  };
};

export type QueryContractLogsResponse<
  request extends QueryContractLogsRequest = QueryContractLogsRequest,
  quantity = bigint,
  index = number,
> = ContractLogResponse<request, quantity, index>;

export type QueryContractTracesResponse<
  request extends QueryContractTracesRequest = QueryContractTracesRequest,
  quantity = bigint,
  index = number,
> = ContractTraceResponse<request, quantity, index>;

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

/**
 * Block fields that Monad does not return. `requestsHash` is added separately
 * because Viem does not define it.
 */
type UnsupportedBlockFields =
  | "transactions"
  | "sealFields"
  | "uncles"
  | "withdrawals";

/** Transaction and receipt fields that Monad does not return. */
type UnsupportedTransactionFields = "blobVersionedHashes" | "maxFeePerBlobGas";
type UnsupportedReceiptFields =
  | "logs"
  | "transactionHash"
  | "blobGasPrice"
  | "blobGasUsed"
  | "root";

/** Raw block row returned over JSON-RPC. */
export type RpcBlockResponse = Omit<
  RpcBlock<Exclude<BlockTag, "pending">, false>,
  UnsupportedBlockFields
> & {
  /** EIP-7685 requests hash. Present only in blocks from `MONAD_FOUR`. */
  requestsHash?: Hash | undefined;
};

/**
 * Raw transaction and receipt row returned over JSON-RPC. Monad does not
 * accept type `0x3` (EIP-4844) transactions.
 */
export type RpcTransactionResponse = UnionOmit<
  Exclude<RpcTransaction<false>, { type: "0x3" }>,
  UnsupportedTransactionFields
> &
  Omit<RpcTransactionReceipt, UnsupportedReceiptFields>;

/** Call frame type of a trace. */
export type CallType =
  | "CALL"
  | "CALLCODE"
  | "DELEGATECALL"
  | "STATICCALL"
  | "CREATE"
  | "CREATE2"
  | "SELFDESTRUCT";

/** Call frame type of a transfer. `DELEGATECALL` and `CALLCODE` do not move value. */
export type TransferCallType = Exclude<CallType, "DELEGATECALL" | "CALLCODE">;

type TraceRow<quantity, index, type extends CallType> = {
  /** The type of the call. */
  type: type;
  /** The address initiating the call. */
  from: Address;
  /**
   * The target address of the call. For `CREATE` and `CREATE2`, the address
   * of the created contract. For `SELFDESTRUCT`, the beneficiary address.
   * `null` if a `CREATE` or `CREATE2` frame failed.
   */
  to: Address | null;
  /** Amount of native token sent with the call. */
  value: quantity;
  /** Gas provided for the call. */
  gas: quantity;
  /** Gas used during the call. */
  gasUsed: quantity;
  /** Call data. For `CREATE` and `CREATE2`, the init code. */
  input: Hex;
  /**
   * Return data. For a successful `CREATE` or `CREATE2`, the deployed code.
   * `0x` if the frame returned no data.
   */
  output: Hex;
  /**
   * Failure of this call frame itself, such as a revert, out of gas, or an
   * invalid opcode. `null` if this frame returned normally.
   */
  error: string | null;
  /**
   * `true` if the state changes of this call were discarded. This happens when
   * the call itself failed or when one of its parent calls failed.
   *
   * A reverted call can have a `null` `error` and a valid `output`. This
   * happens when the call returned normally but a parent call failed after it.
   */
  reverted: boolean;
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
};

/** Raw call trace row returned over JSON-RPC. */
export type RpcCallTraceResponse = TraceRow<Hex, Hex, CallType>;

/** Raw log row returned over JSON-RPC. */
export type RpcLogResponse = Omit<
  RpcLog,
  | "blockHash"
  | "blockNumber"
  | "blockTimestamp"
  | "transactionHash"
  | "transactionIndex"
  | "logIndex"
> & {
  /** Hash of block containing this log. */
  blockHash: Hash;
  /** Number of block containing this log. */
  blockNumber: Hex;
  /** Timestamp of block containing this log. */
  blockTimestamp: Hex;
  /** Hash of transaction containing this log. */
  transactionHash: Hash;
  /** Index of transaction containing this log. */
  transactionIndex: Hex;
  /** Index of this log in the block. */
  logIndex: Hex;
};

/** Raw native transfer row returned over JSON-RPC. */
export type RpcTransferResponse = TraceRow<Hex, Hex, TransferCallType>;

export type BlockResponse<quantity = bigint> = Omit<
  Block<quantity, false, Exclude<BlockTag, "pending">>,
  UnsupportedBlockFields
> & {
  /** EIP-7685 requests hash. Present only in blocks from `MONAD_FOUR`. */
  requestsHash?: Hash | undefined;
};

export type TransactionResponse<
  quantity = bigint,
  index = number,
  status = "success" | "reverted",
> = UnionOmit<
  Exclude<Transaction<quantity, index, false>, { type: "eip4844" }>,
  UnsupportedTransactionFields
> &
  Omit<TransactionReceipt<quantity, index, status>, UnsupportedReceiptFields>;

export type CallTraceResponse<quantity = bigint, index = number> = TraceRow<
  quantity,
  index,
  CallType
>;

export type LogResponse<quantity = bigint, index = number> = Omit<
  Log<quantity, index, false>,
  "blockTimestamp"
> & {
  /** Timestamp of block containing this log. */
  blockTimestamp: quantity;
};

export type TransferResponse<quantity = bigint, index = number> = TraceRow<
  quantity,
  index,
  TransferCallType
>;
