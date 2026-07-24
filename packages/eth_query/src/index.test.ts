import { expect, test } from "bun:test";
import {
  blockFields,
  formatQueryBlocksResponse,
  formatQueryLogsResponse,
  formatQueryTracesResponse,
  formatQueryTransactionsResponse,
  formatQueryTransfersResponse,
  getFieldsForRequest,
  transactionFields,
} from "./index.js";

const block = {
  number: "0x1",
  hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
  parentHash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
};

const envelope = {
  fromBlock: block,
  toBlock: block,
  cursorBlock: block,
};

function rpcFixture<type>(value: unknown): type {
  return value as type;
}

test("formatters preserve projected row fields", () => {
  const blocks = formatQueryBlocksResponse(
    rpcFixture<Parameters<typeof formatQueryBlocksResponse>[0]>({
      ...envelope,
      data: {
        blocks: [
          {
            number: "0x1",
            hash: block.hash,
          },
        ],
      },
    }),
  );
  expect(blocks.data.blocks as unknown).toEqual([
    {
      number: 1n,
      hash: block.hash,
    },
  ]);

  const transactions = formatQueryTransactionsResponse(
    rpcFixture<Parameters<typeof formatQueryTransactionsResponse>[0]>({
      ...envelope,
      data: {
        transactions: [
          {
            hash: "0x2222222222222222222222222222222222222222222222222222222222222222",
            blockNumber: "0x1",
            gasUsed: "0x3",
            status: "0x1",
            transactionIndex: "0x0",
            type: "0x2",
            value: "0x2",
          },
        ],
      },
    }),
  );
  expect(transactions.data.transactions as unknown).toEqual([
    {
      hash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      blockNumber: 1n,
      gasUsed: 3n,
      status: "success",
      transactionIndex: 0,
      type: "eip1559",
      value: 2n,
    },
  ]);

  const logs = formatQueryLogsResponse(
    rpcFixture<Parameters<typeof formatQueryLogsResponse>[0]>({
      ...envelope,
      data: {
        logs: [
          {
            address: "0x3333333333333333333333333333333333333333",
            blockNumber: "0x1",
            logIndex: "0x0",
            transactionIndex: "0x0",
          },
        ],
      },
    }),
  );
  expect(logs.data.logs as unknown).toEqual([
    {
      address: "0x3333333333333333333333333333333333333333",
      blockNumber: 1n,
      logIndex: 0,
      transactionIndex: 0,
    },
  ]);
});

test("formatQueryTracesResponse normalizes status", () => {
  const traces = formatQueryTracesResponse(
    rpcFixture<Parameters<typeof formatQueryTracesResponse>[0]>({
      ...envelope,
      data: {
        traces: [
          {
            blockNumber: "0x1",
            status: "0x0",
          },
          {
            blockNumber: "0x2",
            status: "0x1",
          },
        ],
      },
    }),
  );

  expect(traces.data.traces as unknown).toEqual([
    {
      blockNumber: 1n,
      status: "success",
    },
    {
      blockNumber: 2n,
      status: "reverted",
    },
  ]);
});

test("formatQueryTransfersResponse normalizes status", () => {
  const transfers = formatQueryTransfersResponse(
    rpcFixture<Parameters<typeof formatQueryTransfersResponse>[0]>({
      ...envelope,
      data: {
        transfers: [
          {
            blockNumber: "0x1",
            status: "0x0",
          },
          {
            blockNumber: "0x2",
            status: "0x1",
          },
        ],
      },
    }),
  );

  expect(transfers.data.transfers as unknown).toEqual([
    {
      blockNumber: 1n,
      status: "success",
    },
    {
      blockNumber: 2n,
      status: "reverted",
    },
  ]);
});

test("getFieldsForRequest resolves primary, relation, and omitted fields", () => {
  expect(getFieldsForRequest("eth_queryBlocks")).toEqual({
    blocks: [...blockFields],
    transactions: [],
    traces: [],
    logs: [],
    transfers: [],
  });

  expect(
    getFieldsForRequest("eth_queryLogs", {
      logs: ["address", "topics"],
      transactions: true,
      blocks: ["number"],
    }),
  ).toEqual({
    blocks: ["number"],
    transactions: [...transactionFields],
    traces: [],
    logs: ["address", "topics"],
    transfers: [],
  });
});
