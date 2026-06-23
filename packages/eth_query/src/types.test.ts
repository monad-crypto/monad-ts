/**
 * Type-level tests for generic Query*Response inference.
 *
 * Run with `bun test ./src/types.test-d.ts`.
 * Type assertions are checked by `tsc --noEmit`.
 */

import { expectTypeOf, test } from "bun:test";
import type { Prettify } from "viem";
import type {
  BlockResponse,
  CallTraceResponse,
  LogResponse,
  QueryBlocksResponse,
  QueryLogsResponse,
  QueryTracesResponse,
  QueryTransactionsResponse,
  QueryTransfersResponse,
  TransactionResponse,
  TransferResponse,
} from "./types.js";

test("default QueryTransactionsResponse has full types and optional relations", () => {
  type Response = QueryTransactionsResponse;
  expectTypeOf<Response["data"]["transactions"]>().toEqualTypeOf<
    TransactionResponse[]
  >();
  expectTypeOf<Response["data"]["blocks"]>().toEqualTypeOf<
    BlockResponse[] | undefined
  >();
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
