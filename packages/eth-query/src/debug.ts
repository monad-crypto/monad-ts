import type { Address, Hash, Hex, LogTopic } from "viem";

/** @see https://github.com/alloy-rs/alloy/blob/main/crates/rpc-types-trace/src/geth/call.rs */
/** @see https://github.com/alloy-rs/alloy/blob/main/crates/rpc-types-trace/src/common.rs */

/** Result type for geth style transaction trace. */
type CallTrace<
  quantity = bigint,
  onlyTopCall extends boolean = false,
  withLog extends boolean = false,
> = {
  /** Transaction hash. */
  txHash: Hex;
  /** Trace results produced by the tracer.  */
  result: CallFrame<quantity, onlyTopCall, withLog>;
};

/**
 * The response object for `debug_traceBlockByNumber` and `debug_traceBlockByHash`
 * with `"tracer": "callTracer"`.
 */
export type CallFrame<
  quantity = bigint,
  onlyTopCall extends boolean = false,
  withLog extends boolean = false,
> = {
  /** The type of the call. */
  type:
    | "CALL"
    | "CALLCODE"
    | "DELEGATECALL"
    | "STATICCALL"
    | "CREATE"
    | "CREATE2"
    | "SELFDESTRUCT";
  /** The address initiating the call. */
  from: Address;
  /** The target address receiving the call. */
  to?: Address;
  /** Amount of ETH transfer. */
  value?: quantity;
  /** Gas provided for call. */
  gas: quantity;
  /** Gas used during call. */
  gasUsed: quantity;
  /** Call data. */
  input: Hex;
  /** Return data. */
  output?: Hex;
  /** error informaction if the call failed. */
  error?: string;
  /** Solidity revert reason, if any. */
  revertReason?: string;
  /** list of nested sub-calls. */
  calls?: onlyTopCall extends true
    ? []
    : CallFrame<quantity, onlyTopCall, withLog>[];
  /** Logs emitted by this call. */
  logs?: withLog extends true ? CallLogFrame[] : undefined;
};

/** Represents a recorded log that is emitted during a trace call. */
type CallLogFrame = {
  /** The address of the contract that was called. */
  address: Address;
  /** The topics of the log. */
  topics: LogTopic[];
  /** The data of the log. */
  data: Hex;
  /** The position of the log relative to subcalls within the same trace. */
  position: number;
  /** The index of the log in the trace. */
  index: number;
};

/** The configuration for the call tracer. */
type CallTracerConfig = {
  /** When set to true, this will only trace the primary (top-level) call and not any sub-calls. */
  onlyTopCall?: boolean;
  /** When set to true, this will include the logs emitted by the call. */
  withLog?: boolean;
};

/** The configuration for the prestate tracer. */
type PrestateTracerConfig = {
  /**
   * When set to true, the response frame includes all the account and storage diffs
   * for the transaction. Else, it only returns the accounts and storage
   * necessary to execute the transaction.
   */
  diffMode?: boolean;
  /** When set to true, the response frame will not include code. */
  disableCode?: boolean;
  /** When set to true, the response frame will not include storage. */
  disableStorage?: boolean;
};

/** Represents the state of an account. */
type AccountState = {
  /** Account balance. */
  balance?: Hex;
  /** Account nonce. */
  nonce?: number;
  /** Contract bytecode. */
  code?: Hex;
  /** Storage slots. */
  storage?: Record<Hex, Hex>;
};

type PrestateResult<diffMode extends boolean = false> = diffMode extends true
  ? /** Represents the account states before and after the transaction is executed. */
    {
      /** The account states before the transaction is executed. */
      pre: Record<Address, AccountState>;
      /** The account states after the transaction is executed. */
      post: Record<Address, AccountState>;
    }
  : /** Includes all the account states necessary to execute a given transaction. */
    Record<Address, AccountState>;

type CallTracerOptions = {
  tracer: "callTracer";
  tracerConfig?: CallTracerConfig;
};

type PrestateTracerOptions = {
  tracer: "prestateTracer";
  tracerConfig?: PrestateTracerConfig;
};

export type DebugRpcSchema = [
  /**
   * @description Returns tracing results by executing all transactions in the block specified by the block hash.
   * @example
   * provider.request({ method: 'debug_traceBlockByHash', params: ['0x...', { tracer: "callTracer" }] })
   */
  {
    Method: "debug_traceBlockByHash";
    Parameters: [hash: Hash, tracingOptions: CallTracerOptions];
    ReturnType: CallTrace<Hex>[];
  },
  {
    Method: "debug_traceBlockByHash";
    Parameters: [hash: Hash, tracingOptions: PrestateTracerOptions];
    ReturnType: PrestateResult<boolean>[];
  },
  /**
   * @description Returns tracing results by executing all transactions in the block specified by block number.
   * @example
   * provider.request({ method: 'debug_traceBlockByNumber', params: ['0x1b4', { tracer: "callTracer" }] })
   */
  {
    Method: "debug_traceBlockByNumber";
    Parameters: [block: Hex, tracingOptions: CallTracerOptions];
    ReturnType: CallTrace<Hex>[];
  },
  {
    Method: "debug_traceBlockByNumber";
    Parameters: [block: Hex, tracingOptions: PrestateTracerOptions];
    ReturnType: PrestateResult<boolean>[];
  },
  /**
   * @description Returns tracing results for a single transaction by its hash.
   * @example
   * provider.request({ method: 'debug_traceTransaction', params: ['0x...', { tracer: "callTracer" }] })
   */
  {
    Method: "debug_traceTransaction";
    Parameters: [hash: Hash, tracingOptions: CallTracerOptions];
    ReturnType: CallFrame<Hex>;
  },
  {
    Method: "debug_traceTransaction";
    Parameters: [hash: Hash, tracingOptions: PrestateTracerOptions];
    ReturnType: PrestateResult<boolean>;
  },
];
