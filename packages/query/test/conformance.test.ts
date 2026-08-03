import { test } from "bun:test";
import { createClient, type Hex, http, rpcSchema } from "viem";
import type {
  QueryBlocksRequest,
  QueryLogsRequest,
  QueryRpcSchema,
  QueryTracesRequest,
  QueryTransactionsRequest,
  QueryTransfersRequest,
} from "../src/index.js";
import {
  queryBlocksResponseSchema,
  queryLogsResponseSchema,
  queryTracesResponseSchema,
  queryTransactionsResponseSchema,
  queryTransfersResponseSchema,
} from "./schemas.js";

const client = createClient({
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1"),
  rpcSchema: rpcSchema<QueryRpcSchema>(),
});

const range = {
  fromBlock: "0x1c9c380",
  toBlock: "0x1c9c383",
  limit: "0xa",
} as const;

test("eth_queryBlocks conforms to the default response shape", async () => {
  const request: QueryBlocksRequest<Hex, Hex> = range;
  const response = await client.request({
    method: "eth_queryBlocks",
    params: [request],
  });

  queryBlocksResponseSchema(request).parse(response);
});

test("eth_queryTransactions conforms to the default response shape", async () => {
  const request: QueryTransactionsRequest<Hex, Hex> = range;
  const response = await client.request({
    method: "eth_queryTransactions",
    params: [request],
  });

  queryTransactionsResponseSchema(request).parse(response);
});

test("eth_queryLogs conforms to the default response shape", async () => {
  const request: QueryLogsRequest<Hex, Hex> = range;
  const response = await client.request({
    method: "eth_queryLogs",
    params: [request],
  });

  queryLogsResponseSchema(request).parse(response);
});

test("eth_queryTraces conforms to the default response shape", async () => {
  const request: QueryTracesRequest<Hex, Hex> = range;
  const response = await client.request({
    method: "eth_queryTraces",
    params: [request],
  });

  queryTracesResponseSchema(request).parse(response);
});

test("eth_queryTransfers conforms to the default response shape", async () => {
  const request: QueryTransfersRequest<Hex, Hex> = range;
  const response = await client.request({
    method: "eth_queryTransfers",
    params: [request],
  });

  queryTransfersResponseSchema(request).parse(response);
});

test("eth_queryBlocks conforms to the raw response schema", async () => {
  const request: QueryBlocksRequest<Hex, Hex> = {
    ...range,
    fields: { blocks: ["number", "hash", "timestamp"] },
  };
  const response = await client.request({
    method: "eth_queryBlocks",
    params: [request],
  });

  queryBlocksResponseSchema(request).parse(response);
});

test("eth_queryTransactions conforms with field selection and block relations", async () => {
  const request: QueryTransactionsRequest<Hex, Hex> = {
    ...range,
    fields: {
      transactions: ["hash", "from", "to", "blockNumber", "status"],
      blocks: ["number", "hash", "timestamp"],
    },
  };
  const response = await client.request({
    method: "eth_queryTransactions",
    params: [request],
  });

  queryTransactionsResponseSchema(request).parse(response);
});

test("eth_queryLogs conforms with field selection and transaction/block relations", async () => {
  const request: QueryLogsRequest<Hex, Hex> = {
    ...range,
    fields: {
      logs: ["address", "topics", "data", "blockNumber", "logIndex"],
      transactions: ["hash", "from", "input"],
      blocks: ["number", "timestamp"],
    },
  };
  const response = await client.request({
    method: "eth_queryLogs",
    params: [request],
  });

  queryLogsResponseSchema(request).parse(response);
});

test("eth_queryTraces conforms with field selection and relations", async () => {
  const request: QueryTracesRequest<Hex, Hex> = {
    ...range,
    fields: {
      traces: ["from", "to", "value", "gas", "status", "traceAddress"],
      transactions: ["hash", "from"],
      blocks: ["number", "hash"],
    },
  };
  const response = await client.request({
    method: "eth_queryTraces",
    params: [request],
  });

  queryTracesResponseSchema(request).parse(response);
});

test("eth_queryTransfers conforms with field selection and relations", async () => {
  const request: QueryTransfersRequest<Hex, Hex> = {
    ...range,
    fields: {
      transfers: ["from", "to", "value", "blockNumber", "status"],
      transactions: ["hash", "from"],
      blocks: ["number", "timestamp"],
    },
  };
  const response = await client.request({
    method: "eth_queryTransfers",
    params: [request],
  });

  queryTransfersResponseSchema(request).parse(response);
});
