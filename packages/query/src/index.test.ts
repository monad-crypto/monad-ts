import { expect, expectTypeOf, test } from "bun:test";
import {
  blockFields,
  type callTraceFields,
  formatQueryBlocksResponse,
  formatQueryLogsResponse,
  formatQueryTracesResponse,
  formatQueryTransactionsResponse,
  formatQueryTransfersResponse,
  getFieldsForRequest,
  type logFields,
  type RpcBlockResponse,
  type RpcCallTraceResponse,
  type RpcLogResponse,
  type RpcTransactionResponse,
  type RpcTransferResponse,
  transactionFields,
  type transferFields,
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
      typeHex: "0x2",
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

test("formatQueryTransactionsResponse formats receipt and EIP-7702 fields", () => {
  const transactionHash =
    "0x2222222222222222222222222222222222222222222222222222222222222222";
  const address = "0x3333333333333333333333333333333333333333";
  const transactions = formatQueryTransactionsResponse(
    rpcFixture<Parameters<typeof formatQueryTransactionsResponse>[0]>({
      ...envelope,
      data: {
        transactions: [
          {
            authorizationList: [
              {
                address,
                chainId: "0x8f",
                nonce: "0x1",
                r: block.hash,
                s: block.parentHash,
                yParity: "0x1",
              },
            ],
            blobGasPrice: "0x3",
            blobGasUsed: "0x4",
            blockNumber: "0x1",
            blockTimestamp: "0x2",
            chainId: "0x8f",
            contractAddress: null,
            cumulativeGasUsed: "0x5",
            effectiveGasPrice: "0x6",
            gasUsed: "0x7",
            logsBloom: "0x00",
            root: block.hash,
            status: "0x1",
            transactionHash,
            transactionIndex: "0x0",
            type: "0x4",
            value: "0x2",
          },
        ],
      },
    }),
  );

  expect(transactions.data.transactions as unknown).toEqual([
    {
      authorizationList: [
        {
          address,
          chainId: 143,
          nonce: 1,
          r: block.hash,
          s: block.parentHash,
          yParity: 1,
        },
      ],
      blobGasPrice: 3n,
      blobGasUsed: 4n,
      blockNumber: 1n,
      blockTimestamp: 2n,
      chainId: 143,
      contractAddress: null,
      cumulativeGasUsed: 5n,
      effectiveGasPrice: 6n,
      gasUsed: 7n,
      logsBloom: "0x00",
      root: block.hash,
      status: "success",
      transactionHash,
      transactionIndex: 0,
      type: "eip7702",
      typeHex: "0x4",
      value: 2n,
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
            status: "0x1",
          },
          {
            blockNumber: "0x2",
            error: "execution reverted",
            revertReason: "NotAllowed()",
            status: "0x0",
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
      error: "execution reverted",
      revertReason: "NotAllowed()",
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
            status: "0x1",
          },
          {
            blockNumber: "0x2",
            status: "0x0",
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

test("field inventories are exhaustive for raw response rows", () => {
  expectTypeOf<
    Exclude<keyof RpcBlockResponse, (typeof blockFields)[number]>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Exclude<keyof RpcTransactionResponse, (typeof transactionFields)[number]>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Exclude<keyof RpcCallTraceResponse, (typeof callTraceFields)[number]>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Exclude<keyof RpcLogResponse, (typeof logFields)[number]>
  >().toEqualTypeOf<never>();
  expectTypeOf<
    Exclude<keyof RpcTransferResponse, (typeof transferFields)[number]>
  >().toEqualTypeOf<never>();
});
