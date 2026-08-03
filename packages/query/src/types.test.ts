/**
 * Type-level tests for generic Query*Response inference.
 *
 * Run with `bun test ./src/types.test-d.ts`.
 * Type assertions are checked by `tsc --noEmit`.
 */

import { expectTypeOf, test } from "bun:test";
import type { Hash, Hex, Prettify } from "viem";
import type {
  BlockResponse,
  CallTraceResponse,
  ContractLogResponse,
  ContractTraceResponse,
  LogResponse,
  QueryBlocksResponse,
  QueryLogsResponse,
  QueryRpcSchema,
  QueryTracesResponse,
  QueryTransactionsFields,
  QueryTransactionsResponse,
  QueryTransfersResponse,
  RpcCallTraceResponse,
  RpcLogResponse,
  RpcQueryBlocksResponse,
  RpcQueryLogsResponse,
  RpcQueryTracesResponse,
  RpcQueryTransactionsResponse,
  RpcQueryTransfersResponse,
  RpcTransactionResponse,
  RpcTransferResponse,
  TransactionResponse,
  TransferResponse,
} from "./types.js";

const contractAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "forward",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [{ name: "ok", type: "bool" }],
  },
] as const;

test("default QueryTransactionsResponse has full types and optional relations", () => {
  type Response = QueryTransactionsResponse;
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    TransactionResponse[]
  >();
  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<
    BlockResponse[] | undefined
  >();
});

test("raw and formatted transaction responses use Viem representations", () => {
  expectTypeOf<RpcTransactionResponse["type"]>().toEqualTypeOf<
    "0x0" | "0x1" | "0x2" | "0x3" | "0x4"
  >();
  expectTypeOf<RpcTransactionResponse>().not.toHaveProperty("typeHex");
  expectTypeOf<RpcTransactionResponse["status"]>().toEqualTypeOf<
    "0x0" | "0x1"
  >();

  expectTypeOf<TransactionResponse["type"]>().toEqualTypeOf<
    "legacy" | "eip2930" | "eip1559" | "eip4844" | "eip7702"
  >();
  expectTypeOf<TransactionResponse["typeHex"]>().toEqualTypeOf<Hex | null>();
  expectTypeOf<TransactionResponse["status"]>().toEqualTypeOf<
    "success" | "reverted"
  >();
});

test("transaction type projection derives formatted typeHex", () => {
  type Request = { fields: { transactions: readonly ["type"] } };
  type RpcResponse = RpcQueryTransactionsResponse<Request>;
  type Response = QueryTransactionsResponse<Request>;

  expectTypeOf<RpcResponse["data"]["transactions"]>().toEqualTypeOf<
    Pick<RpcTransactionResponse, "type">[]
  >();
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    Prettify<Pick<TransactionResponse, "type" | "typeHex">>[]
  >();
});

test("QueryRpcSchema exposes raw responses", () => {
  type ReturnType<method extends QueryRpcSchema[number]["Method"]> = Extract<
    QueryRpcSchema[number],
    { Method: method }
  >["ReturnType"];

  expectTypeOf<
    ReturnType<"eth_queryBlocks">
  >().toEqualTypeOf<RpcQueryBlocksResponse>();
  expectTypeOf<
    ReturnType<"eth_queryTransactions">
  >().toEqualTypeOf<RpcQueryTransactionsResponse>();
  expectTypeOf<
    ReturnType<"eth_queryLogs">
  >().toEqualTypeOf<RpcQueryLogsResponse>();
  expectTypeOf<
    ReturnType<"eth_queryTraces">
  >().toEqualTypeOf<RpcQueryTracesResponse>();
  expectTypeOf<
    ReturnType<"eth_queryTransfers">
  >().toEqualTypeOf<RpcQueryTransfersResponse>();
});

test("formatted-only typeHex is not a wire field selector", () => {
  type Fields = Exclude<
    QueryTransactionsFields["transactions"],
    true | undefined
  >[number];

  expectTypeOf<"typeHex">().not.toMatchTypeOf<Fields>();
});

test("trace and transfer wire statuses match transaction receipts", () => {
  expectTypeOf<RpcCallTraceResponse["status"]>().toEqualTypeOf<"0x0" | "0x1">();
  expectTypeOf<RpcCallTraceResponse["error"]>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<RpcCallTraceResponse["revertReason"]>().toEqualTypeOf<
    string | undefined
  >();
  expectTypeOf<RpcTransferResponse["status"]>().toEqualTypeOf<"0x0" | "0x1">();
});

test("historical log identity fields are non-null", () => {
  expectTypeOf<RpcLogResponse["blockHash"]>().toEqualTypeOf<Hash>();
  expectTypeOf<RpcLogResponse["blockNumber"]>().toEqualTypeOf<Hex>();
  expectTypeOf<RpcLogResponse["transactionHash"]>().toEqualTypeOf<Hash>();
  expectTypeOf<RpcLogResponse["transactionIndex"]>().toEqualTypeOf<Hex>();
  expectTypeOf<RpcLogResponse["logIndex"]>().toEqualTypeOf<Hex>();
});

test("default QueryLogsResponse has full types and optional relations", () => {
  type Response = QueryLogsResponse;
  expectTypeOf<Response["data"]["logs"]>().toEqualTypeOf<LogResponse[]>();
  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<
    BlockResponse[] | undefined
  >();
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    TransactionResponse[] | undefined
  >();
});

test("default QueryBlocksResponse has full block type", () => {
  expectTypeOf<QueryBlocksResponse["data"]["blocks"]>().toEqualTypeOf<
    BlockResponse[]
  >();
});

test("primary table narrows to selected fields", () => {
  type Request = { fields: { transactions: readonly ["hash", "from", "to"] } };
  type Response = QueryTransactionsResponse<Request>;

  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    Prettify<Pick<TransactionResponse, "hash" | "from" | "to">>[]
  >();
});

test("relation is absent when not in fields", () => {
  type Request = { fields: { transactions: readonly ["hash"] } };
  type Response = QueryTransactionsResponse<Request>;

  expectTypeOf<Response["data"]>().not.toHaveProperty("blocks");
});

test("relation with true is required with full type", () => {
  type Request = {
    fields: { transactions: readonly ["hash", "value"]; blocks: true };
  };
  type Response = QueryTransactionsResponse<Request>;

  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<BlockResponse[]>();
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    Prettify<Pick<TransactionResponse, "hash" | "value">>[]
  >();
});

test("relation with field array is required and narrowed", () => {
  type Request = {
    fields: {
      transactions: readonly ["hash"];
      blocks: readonly ["number", "hash"];
    };
  };
  type Response = QueryTransactionsResponse<Request>;

  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<
    Prettify<Pick<BlockResponse, "number" | "hash">>[]
  >();
});

test("QueryBlocksResponse narrows primary fields", () => {
  type Request = {
    fields: { blocks: readonly ["number", "hash", "timestamp"] };
  };
  type Response = QueryBlocksResponse<Request>;

  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<
    Prettify<Pick<BlockResponse, "number" | "hash" | "timestamp">>[]
  >();
});

test("QueryLogsResponse narrows all tables independently", () => {
  type Request = {
    fields: {
      logs: readonly ["address", "data", "topics"];
      transactions: readonly ["hash", "from"];
      blocks: true;
    };
  };
  type Response = QueryLogsResponse<Request>;

  expectTypeOf<Response["data"]["logs"]>().toEqualTypeOf<
    Prettify<Pick<LogResponse, "address" | "data" | "topics">>[]
  >();
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    Prettify<Pick<TransactionResponse, "hash" | "from">>[]
  >();
  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<BlockResponse[]>();
});

test("QueryLogsResponse omits both relations when not in fields", () => {
  type Request = { fields: { logs: readonly ["address"] } };
  type Response = QueryLogsResponse<Request>;

  expectTypeOf<Response["data"]>().not.toHaveProperty("transactions");
  expectTypeOf<Response["data"]>().not.toHaveProperty("blocks");
});

test("QueryTracesResponse narrows traces with partial relations", () => {
  type Request = {
    fields: {
      traces: readonly ["from", "to", "value", "gas"];
      blocks: readonly ["number"];
    };
  };
  type Response = QueryTracesResponse<Request>;

  expectTypeOf<Response["data"]["traces"]>().toEqualTypeOf<
    Prettify<Pick<CallTraceResponse, "from" | "to" | "value" | "gas">>[]
  >();
  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<
    Prettify<Pick<BlockResponse, "number">>[]
  >();
  expectTypeOf<Response["data"]>().not.toHaveProperty("transactions");
});

test("QueryTransfersResponse narrows transfers with transactions included", () => {
  type Request = {
    fields: {
      transfers: readonly ["from", "to", "value"];
      transactions: true;
    };
  };
  type Response = QueryTransfersResponse<Request>;

  expectTypeOf<Response["data"]["transfers"]>().toEqualTypeOf<
    Prettify<Pick<TransferResponse, "from" | "to" | "value">>[]
  >();
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    TransactionResponse[]
  >();
  expectTypeOf<Response["data"]>().not.toHaveProperty("blocks");
});

test("envelope LightBlock fields always use the quantity generic", () => {
  type Request = { fields: { transactions: readonly ["hash"] } };
  type Response = QueryTransactionsResponse<Request>;

  expectTypeOf<Response["fromBlock"]["number"]>().toEqualTypeOf<bigint>();
  expectTypeOf<Response["toBlock"]["number"]>().toEqualTypeOf<bigint>();
  expectTypeOf<Response["cursorBlock"]["number"]>().toEqualTypeOf<bigint>();
});

test("CallTraceResponse quantity fields use the quantity generic", () => {
  expectTypeOf<CallTraceResponse["gas"]>().toEqualTypeOf<bigint>();
  expectTypeOf<CallTraceResponse["gasUsed"]>().toEqualTypeOf<bigint>();
  expectTypeOf<CallTraceResponse["value"]>().toEqualTypeOf<
    bigint | undefined
  >();

  expectTypeOf<CallTraceResponse<Hex, Hex>["gas"]>().toEqualTypeOf<Hex>();
  expectTypeOf<CallTraceResponse<Hex, Hex>["gasUsed"]>().toEqualTypeOf<Hex>();
  expectTypeOf<CallTraceResponse<Hex, Hex>["value"]>().toEqualTypeOf<
    Hex | undefined
  >();
});

test("ABI log responses infer decoded event names and arguments", () => {
  type Request = {
    abi: typeof contractAbi;
    eventName: "Transfer";
    fields: { logs: readonly ["address"] };
  };
  type Row = ContractLogResponse<Request>["data"]["logs"][number];

  expectTypeOf<Row["eventName"]>().toEqualTypeOf<"Transfer">();
  expectTypeOf<Row["address"]>().toEqualTypeOf<`0x${string}`>();
  expectTypeOf<
    Row["args"] extends { value?: bigint } ? true : false
  >().toEqualTypeOf<true>();
});

test("ABI log responses preserve discriminated unions when event is omitted", () => {
  type Request = { abi: typeof contractAbi };
  type Row = ContractLogResponse<Request>["data"]["logs"][number];
  type Transfer = Extract<Row, { eventName: "Transfer" }>;
  type Approval = Extract<Row, { eventName: "Approval" }>;

  expectTypeOf<
    Transfer["args"] extends { value?: bigint } ? true : false
  >().toEqualTypeOf<true>();
  expectTypeOf<
    Approval["args"] extends { value?: bigint } ? true : false
  >().toEqualTypeOf<true>();
});

test("ABI trace responses infer function arguments and optional results", () => {
  type Request = {
    abi: typeof contractAbi;
    functionName: "forward";
    fields: { traces: readonly ["to"] };
  };
  type Row = ContractTraceResponse<Request>["data"]["traces"][number];

  expectTypeOf<Row["functionName"]>().toEqualTypeOf<"forward">();
  expectTypeOf<Row["to"]>().toEqualTypeOf<`0x${string}` | undefined>();
  expectTypeOf<Row["args"]>().toEqualTypeOf<readonly [`0x${string}`]>();
  expectTypeOf<Row["result"]>().toEqualTypeOf<boolean | undefined>();
});
