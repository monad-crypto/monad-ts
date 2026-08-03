import { expect, test } from "bun:test";
import {
  createClient,
  custom,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  encodeFunctionResult,
  type Hex,
  http,
  rpcSchema,
  toEventSelector,
} from "viem";
import {
  isLastPage,
  type QueryBlocksRequest,
  type QueryRpcSchema,
  queryActions,
  queryBlocks,
  queryBlocksWithPagination,
  queryContractLogs,
  queryContractLogsWithPagination,
  queryContractTraces,
  queryContractTracesWithPagination,
  queryLogs,
  queryLogsWithPagination,
  queryTraces,
  queryTracesWithPagination,
  queryTransactions,
  queryTransactionsWithPagination,
  queryTransfers,
  queryTransfersWithPagination,
} from "./index.js";

const RPC_URL = process.env.RPC_URL;
const client = createClient({
  rpcSchema: rpcSchema<QueryRpcSchema>(),
  transport: http(RPC_URL ?? "http://127.0.0.1"),
});
const publicClient = createClient({
  transport: http(RPC_URL ?? "http://127.0.0.1"),
});

async function getLatestBlockNumber() {
  const hex = await publicClient.request({ method: "eth_blockNumber" });
  return BigInt(hex);
}

async function collectPages<T>(pages: AsyncGenerator<T>, limit: number) {
  const collected: T[] = [];
  for await (const page of pages) {
    collected.push(page);
    if (collected.length === limit) break;
  }
  return collected;
}

async function captureRpcError(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    const rpcError = error as {
      code?: number;
      details?: string;
      name?: string;
      shortMessage?: string;
    };
    return {
      name: rpcError.name,
      code: rpcError.code,
      details: rpcError.details,
      shortMessage: rpcError.shortMessage,
    };
  }
  throw new Error("Expected request to fail");
}

function keys(row: object | undefined) {
  return row ? Object.keys(row).sort() : [];
}

function pickFields(row: object, fields: string[]) {
  return Object.fromEntries(
    fields.map((field) => [field, Reflect.get(row, field)]),
  );
}

function summarizeEnvelope(
  response: {
    cursorBlock: { number: bigint };
    data: object;
    fromBlock: { number: bigint };
    toBlock: { number: bigint };
  },
  dataKey: string,
  fields: string[],
) {
  const rows = (response.data as Record<string, object[]>)[dataKey] ?? [];
  return {
    fromBlock: response.fromBlock.number,
    toBlock: response.toBlock.number,
    cursorBlock: response.cursorBlock.number,
    rowKeys: keys(rows[0]),
    rows: rows.map((row) => pickFields(row, fields)),
  };
}

function summarizePages(
  pages: {
    cursorBlock: { number: bigint };
    data: object;
  }[],
  dataKey: string,
  fields: string[],
) {
  return pages.map((page) => ({
    cursorBlock: page.cursorBlock.number,
    rowCount: ((page.data as Record<string, object[]>)[dataKey] ?? []).length,
    firstRowKeys: keys((page.data as Record<string, object[]>)[dataKey]?.[0]),
    firstRow: (page.data as Record<string, object[]>)[dataKey]?.[0]
      ? pickFields((page.data as Record<string, object[]>)[dataKey][0], fields)
      : undefined,
  }));
}

function summarizeRows(rows: readonly object[] | undefined, fields: string[]) {
  return {
    rowCount: rows?.length ?? 0,
    firstRowKeys: keys(rows?.[0]),
    rows:
      rows?.slice(0, 3).map((row) => {
        return pickFields(row, fields);
      }) ?? [],
  };
}

const mockBlock = {
  hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
  parentHash:
    "0x0000000000000000000000000000000000000000000000000000000000000000",
};

function blockEnvelope(number: bigint) {
  return {
    ...mockBlock,
    number: `0x${number.toString(16)}` as const,
  };
}

function blockRow(number: bigint) {
  return {
    ...mockBlock,
    number: `0x${number.toString(16)}` as const,
  };
}

type MockPage = {
  cursorBlock: bigint;
  fromBlock: bigint;
  rows?: bigint[];
  toBlock: bigint;
};

function mockQueryClient(pages: MockPage[]) {
  const calls: { method: string; params: unknown }[] = [];
  let index = 0;
  const mockClient = createClient({
    rpcSchema: rpcSchema<QueryRpcSchema>(),
    transport: custom({
      request: async ({ method, params }) => {
        calls.push({ method, params });
        const page = pages[index++];
        if (!page) throw new Error("Unexpected extra request");
        return {
          fromBlock: blockEnvelope(page.fromBlock),
          toBlock: blockEnvelope(page.toBlock),
          cursorBlock: blockEnvelope(page.cursorBlock),
          data: {
            blocks: (page.rows ?? []).map(blockRow),
          },
        };
      },
    }),
  });
  return { calls, mockClient };
}

test("queryBlocksWithPagination handles edge cases", async () => {
  const oneRowPages = await collectPages(
    queryBlocksWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_002n,
      limit: 1,
      fields: {
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    oneRowPages.map((page) => ({
      cursorBlock: page.cursorBlock.number,
      rowNumbers: page.data.blocks.map((block) => block.number),
    })),
  ).toEqual([
    { cursorBlock: 30_000_000n, rowNumbers: [30_000_000n] },
    { cursorBlock: 30_000_001n, rowNumbers: [30_000_001n] },
    { cursorBlock: 30_000_002n, rowNumbers: [30_000_002n] },
  ]);

  const ascPages = await collectPages(
    queryBlocksWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_003n,
      limit: 2,
      fields: {
        blocks: ["number"],
      },
    }),
    2,
  );
  expect(
    ascPages.flatMap((page) => page.data.blocks.map((block) => block.number)),
  ).toEqual([30_000_000n, 30_000_001n, 30_000_002n, 30_000_003n]);

  const descPages = await collectPages(
    queryBlocksWithPagination(client, {
      fromBlock: 30_000_003n,
      toBlock: 30_000_000n,
      order: "desc",
      limit: 2,
      fields: {
        blocks: ["number"],
      },
    }),
    2,
  );
  expect(
    descPages.flatMap((page) => page.data.blocks.map((block) => block.number)),
  ).toEqual([30_000_003n, 30_000_002n, 30_000_001n, 30_000_000n]);

  const latestBlockNumber = await getLatestBlockNumber();
  const latestPage = await collectPages(
    queryBlocksWithPagination(client, {
      fromBlock: "latest",
      toBlock: latestBlockNumber - 1_000n,
      order: "desc",
      limit: 1,
      fields: {
        blocks: ["number"],
      },
    }),
    1,
  );
  expect(latestPage).toHaveLength(1);
  expect(latestPage[0].fromBlock.number).toBeGreaterThan(
    latestPage[0].toBlock.number,
  );
  expect(latestPage[0].toBlock.number).toBe(latestBlockNumber - 1_000n);
  expect(latestPage[0].cursorBlock.number).toBe(latestPage[0].fromBlock.number);
  expect(latestPage[0].data.blocks.map((block) => block.number)).toEqual([
    latestPage[0].fromBlock.number,
  ]);
});

test("queryTransactionsWithPagination handles an empty final page", async () => {
  const pages = await collectPages(
    queryTransactionsWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_003n,
      filter: {
        from: "0x0000000000000000000000000000000000000000",
      },
      limit: 1,
      fields: {
        transactions: ["hash"],
      },
    }),
    2,
  );

  expect(pages).toHaveLength(1);
  expect(pages[0].cursorBlock.number).toBe(pages[0].toBlock.number);
  expect(pages[0].data.transactions).toEqual([]);
});

test.failing("eth_queryBlocks accepts explicit earliest tags per spec", async () => {
  const page = await queryBlocks(client, {
    fromBlock: "earliest",
    toBlock: "earliest",
    limit: 1,
    fields: {
      blocks: ["number"],
    },
  });

  expect(page.toBlock.number).toBe(page.fromBlock.number);
  expect(page.cursorBlock.number).toBe(page.fromBlock.number);
  expect(page.data.blocks.map((block) => block.number)).toEqual([
    page.fromBlock.number,
  ]);
});

test("eth_queryBlocks accepts the earliest indexed numeric range", async () => {
  const page = await queryBlocks(client, {
    fromBlock: 1n,
    toBlock: 1n,
    limit: 1,
    fields: {
      blocks: ["number"],
    },
  });

  expect(page.fromBlock.number).toBe(1n);
  expect(page.toBlock.number).toBe(1n);
  expect(page.cursorBlock.number).toBe(1n);
  expect(page.data.blocks.map((block) => block.number)).toEqual([1n]);
});

test("pagination preserves block tags in the initial request", async () => {
  const { calls, mockClient } = mockQueryClient([
    { fromBlock: 0n, toBlock: 0n, cursorBlock: 0n, rows: [0n] },
  ]);

  await collectPages(
    queryBlocksWithPagination(mockClient, {
      fromBlock: "earliest",
      toBlock: "latest",
      limit: 1,
      fields: {
        blocks: ["number"],
      },
    }),
    1,
  );

  expect(calls).toEqual([
    {
      method: "eth_queryBlocks",
      params: [
        {
          fields: { blocks: ["number"] },
          fromBlock: "earliest",
          limit: "0x1",
          toBlock: "latest",
        },
      ],
    },
  ]);
});

test("pagination pins resolved toBlock after first page", async () => {
  const { calls, mockClient } = mockQueryClient([
    { fromBlock: 1n, toBlock: 10n, cursorBlock: 1n, rows: [1n] },
    { fromBlock: 2n, toBlock: 10n, cursorBlock: 10n, rows: [2n] },
  ]);

  await collectPages(
    queryBlocksWithPagination(mockClient, {
      fromBlock: 1n,
      toBlock: "latest",
      limit: 1,
      fields: {
        blocks: ["number"],
      },
    }),
    2,
  );

  expect(calls).toEqual([
    {
      method: "eth_queryBlocks",
      params: [
        {
          fields: { blocks: ["number"] },
          fromBlock: "0x1",
          limit: "0x1",
          toBlock: "latest",
        },
      ],
    },
    {
      method: "eth_queryBlocks",
      params: [
        {
          fields: { blocks: ["number"] },
          fromBlock: "0x2",
          limit: "0x1",
          toBlock: "0xa",
        },
      ],
    },
  ]);
});

test("pagination pins omitted toBlock after first page", async () => {
  const { calls, mockClient } = mockQueryClient([
    { fromBlock: 1n, toBlock: 10n, cursorBlock: 1n, rows: [1n] },
    { fromBlock: 2n, toBlock: 10n, cursorBlock: 10n, rows: [2n] },
  ]);

  await collectPages(
    queryBlocksWithPagination(mockClient, {
      fromBlock: 1n,
      limit: 1,
      fields: {
        blocks: ["number"],
      },
    }),
    2,
  );

  expect(calls).toEqual([
    {
      method: "eth_queryBlocks",
      params: [
        {
          fields: { blocks: ["number"] },
          fromBlock: "0x1",
          limit: "0x1",
        },
      ],
    },
    {
      method: "eth_queryBlocks",
      params: [
        {
          fields: { blocks: ["number"] },
          fromBlock: "0x2",
          limit: "0x1",
          toBlock: "0xa",
        },
      ],
    },
  ]);
});

test("pagination rejects cursorBlock outside the requested range", async () => {
  const { calls, mockClient } = mockQueryClient([
    { fromBlock: 5n, toBlock: 10n, cursorBlock: 4n, rows: [5n] },
  ]);

  await expect(async () => {
    await collectPages(
      queryBlocksWithPagination(mockClient, {
        fromBlock: 5n,
        toBlock: 10n,
        limit: 1,
        fields: {
          blocks: ["number"],
        },
      }),
      1,
    );
  }).toThrow("Pagination cursorBlock is outside the requested range");

  expect(calls).toHaveLength(1);
});

test("pagination rejects responses that do not advance fromBlock", async () => {
  const { calls, mockClient } = mockQueryClient([
    { fromBlock: 1n, toBlock: 10n, cursorBlock: 1n, rows: [1n] },
    { fromBlock: 1n, toBlock: 10n, cursorBlock: 2n, rows: [2n] },
  ]);

  await expect(async () => {
    await collectPages(
      queryBlocksWithPagination(mockClient, {
        fromBlock: 1n,
        toBlock: 10n,
        limit: 1,
        fields: {
          blocks: ["number"],
        },
      }),
      2,
    );
  }).toThrow("Pagination response fromBlock does not match request");

  expect(calls).toHaveLength(2);
});

test("descending pagination does not request below block 0", async () => {
  const { calls, mockClient } = mockQueryClient([
    { fromBlock: 1n, toBlock: 0n, cursorBlock: 0n, rows: [1n, 0n] },
  ]);
  const pages = await collectPages(
    queryBlocksWithPagination(mockClient, {
      fromBlock: 1n,
      toBlock: 0n,
      order: "desc",
      limit: 1,
      fields: {
        blocks: ["number"],
      },
    }),
    1,
  );

  expect(pages).toHaveLength(1);

  expect(calls).toEqual([
    {
      method: "eth_queryBlocks",
      params: [
        {
          fields: { blocks: ["number"] },
          fromBlock: "0x1",
          limit: "0x1",
          order: "desc",
          toBlock: "0x0",
        },
      ],
    },
  ]);
});

test("queryBlocks", async () => {
  const projected = await queryBlocks(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    limit: 2,
    fields: {
      blocks: ["number", "hash", "timestamp"],
    },
  });
  expect(
    summarizeEnvelope(projected, "blocks", ["number", "hash", "timestamp"]),
  ).toMatchInlineSnapshot(`
      {
        "cursorBlock": 30000001n,
        "fromBlock": 30000000n,
        "rowKeys": [
          "hash",
          "number",
          "timestamp",
        ],
        "rows": [
          {
            "hash": "0x8bf5def13eaf745718b465f1cb02bf97e6f625e7cf45d74659f222880783fb97",
            "number": 30000000n,
            "timestamp": 1760882216n,
          },
          {
            "hash": "0xf64666610f1bebc7af972d37556a087d1ced678dee957c5b9798fe6081911e2b",
            "number": 30000001n,
            "timestamp": 1760882216n,
          },
        ],
        "toBlock": 30000003n,
      }
    `);

  const ascPages = await collectPages(
    queryBlocksWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_003n,
      limit: 2,
      fields: {
        blocks: ["number", "hash"],
      },
    }),
    2,
  );
  expect(
    summarizePages(ascPages, "blocks", ["number", "hash"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000001n,
            "firstRow": {
              "hash": "0x8bf5def13eaf745718b465f1cb02bf97e6f625e7cf45d74659f222880783fb97",
              "number": 30000000n,
            },
            "firstRowKeys": [
              "hash",
              "number",
            ],
            "rowCount": 2,
          },
          {
            "cursorBlock": 30000003n,
            "firstRow": {
              "hash": "0x07e805f66f2fa7069b874cf96cbd8409d16e145228c937a180285bce66c73762",
              "number": 30000002n,
            },
            "firstRowKeys": [
              "hash",
              "number",
            ],
            "rowCount": 2,
          },
        ]
      `);

  const descPages = await collectPages(
    queryBlocksWithPagination(client, {
      fromBlock: 30_000_003n,
      toBlock: 30_000_000n,
      order: "desc",
      limit: 2,
      fields: {
        blocks: ["number", "hash"],
      },
    }),
    2,
  );
  expect(
    summarizePages(descPages, "blocks", ["number", "hash"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000002n,
            "firstRow": {
              "hash": "0xea0a85b1a254a3568a5cb44a46120064b8f3a14ab08edd33ae766f86dd9d8dd9",
              "number": 30000003n,
            },
            "firstRowKeys": [
              "hash",
              "number",
            ],
            "rowCount": 2,
          },
          {
            "cursorBlock": 30000000n,
            "firstRow": {
              "hash": "0xf64666610f1bebc7af972d37556a087d1ced678dee957c5b9798fe6081911e2b",
              "number": 30000001n,
            },
            "firstRowKeys": [
              "hash",
              "number",
            ],
            "rowCount": 2,
          },
        ]
      `);

  const invalidLimit = await captureRpcError(() =>
    queryBlocks(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_003n,
      limit: 0,
      fields: {
        blocks: ["number"],
      },
    }),
  );
  expect(invalidLimit).toMatchInlineSnapshot(`
      {
        "code": -32602,
        "details": "limit must be at least 1",
        "name": "InvalidParamsRpcError",
        "shortMessage": 
      "Invalid parameters were provided to the RPC method.
      Double check you have provided the correct parameters."
      ,
      }
    `);
});

test("queryTransactions", async () => {
  const filtered = await queryTransactions(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    limit: 2,
    filter: {
      from: "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
    },
    fields: {
      transactions: [
        "hash",
        "from",
        "to",
        "value",
        "blockNumber",
        "transactionIndex",
      ],
      blocks: ["number", "hash"],
    },
  });
  expect({
    envelope: {
      fromBlock: filtered.fromBlock.number,
      toBlock: filtered.toBlock.number,
      cursorBlock: filtered.cursorBlock.number,
    },
    transactions: summarizeRows(filtered.data.transactions, [
      "hash",
      "from",
      "to",
      "value",
      "blockNumber",
      "transactionIndex",
    ]),
    blocks: summarizeRows(filtered.data.blocks, ["number", "hash"]),
  }).toMatchInlineSnapshot(`
      {
        "blocks": {
          "firstRowKeys": [
            "hash",
            "number",
          ],
          "rowCount": 1,
          "rows": [
            {
              "hash": "0x8bf5def13eaf745718b465f1cb02bf97e6f625e7cf45d74659f222880783fb97",
              "number": 30000000n,
            },
          ],
        },
        "envelope": {
          "cursorBlock": 30000003n,
          "fromBlock": 30000000n,
          "toBlock": 30000003n,
        },
        "transactions": {
          "firstRowKeys": [
            "blockNumber",
            "from",
            "hash",
            "to",
            "transactionIndex",
            "value",
          ],
          "rowCount": 1,
          "rows": [
            {
              "blockNumber": 30000000n,
              "from": "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
              "hash": "0xd9899e8aa5e2311afc32b7af04bdb8973342b60d4e61f9866c3b04aeb277cdbe",
              "to": "0x5447e0f54979fa6888b37631b9ce285cc4bc1a99",
              "transactionIndex": 0,
              "value": 0n,
            },
          ],
        },
      }
    `);

  const ascPages = await collectPages(
    queryTransactionsWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_999n,
      limit: 1,
      fields: {
        transactions: ["hash", "blockNumber"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(ascPages, "transactions", ["hash", "blockNumber"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000000n,
            "firstRow": {
              "blockNumber": 30000000n,
              "hash": "0xd9899e8aa5e2311afc32b7af04bdb8973342b60d4e61f9866c3b04aeb277cdbe",
            },
            "firstRowKeys": [
              "blockNumber",
              "hash",
            ],
            "rowCount": 1,
          },
          {
            "cursorBlock": 30000007n,
            "firstRow": {
              "blockNumber": 30000007n,
              "hash": "0x70aeaa1bcbf608f4963f5da4084076c6d26d307a39b210521e7febfa37788927",
            },
            "firstRowKeys": [
              "blockNumber",
              "hash",
            ],
            "rowCount": 1,
          },
          {
            "cursorBlock": 30000008n,
            "firstRow": {
              "blockNumber": 30000008n,
              "hash": "0x74ea3495339fd6b236fc2d3787221103173b06132f6f128dfa70c30a9521a37c",
            },
            "firstRowKeys": [
              "blockNumber",
              "hash",
            ],
            "rowCount": 1,
          },
        ]
      `);

  const descPages = await collectPages(
    queryTransactionsWithPagination(client, {
      fromBlock: 30_000_999n,
      toBlock: 30_000_000n,
      order: "desc",
      limit: 1,
      fields: {
        transactions: ["hash", "blockNumber"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(descPages, "transactions", ["hash", "blockNumber"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000999n,
            "firstRow": {
              "blockNumber": 30000999n,
              "hash": "0xa2bc6065dd8da0b77efdaac64ac0245bcb9b6a5c6a866d8915e9add85e0064d6",
            },
            "firstRowKeys": [
              "blockNumber",
              "hash",
            ],
            "rowCount": 2,
          },
          {
            "cursorBlock": 30000995n,
            "firstRow": {
              "blockNumber": 30000995n,
              "hash": "0xe081adc61d7cf536cc45f91f754ea01290b26adbc67a46c9d4a32d19654cf7b8",
            },
            "firstRowKeys": [
              "blockNumber",
              "hash",
            ],
            "rowCount": 1,
          },
          {
            "cursorBlock": 30000992n,
            "firstRow": {
              "blockNumber": 30000992n,
              "hash": "0xd81802d5060cc15bcf570c1f09220e609d27b25ae00681eccb3c5cf1a7313070",
            },
            "firstRowKeys": [
              "blockNumber",
              "hash",
            ],
            "rowCount": 1,
          },
        ]
      `);

  const empty = await queryTransactions(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    filter: {
      from: "0x0000000000000000000000000000000000000000",
    },
    fields: {
      transactions: ["hash"],
    },
  });
  expect(
    summarizeRows(empty.data.transactions, ["hash"]),
  ).toMatchInlineSnapshot(`
        {
          "firstRowKeys": [],
          "rowCount": 0,
          "rows": [],
        }
      `);

  const invalidBlock = await captureRpcError(() =>
    queryTransactions(client, {
      fromBlock: "bad" as QueryBlocksRequest["fromBlock"],
      toBlock: 30_000_003n,
      fields: {
        transactions: ["hash"],
      },
    }),
  );
  expect(invalidBlock).toMatchInlineSnapshot(`
      {
        "code": -32602,
        "details": "Invalid params",
        "name": "InvalidParamsRpcError",
        "shortMessage": 
      "Invalid parameters were provided to the RPC method.
      Double check you have provided the correct parameters."
      ,
      }
    `);
});

test("queryTransactions returns Viem transaction and receipt fields", async () => {
  const response = await queryTransactions(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    limit: 1,
    filter: {
      from: "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
    },
    fields: {
      transactions: ["hash", "type", "status", "gasUsed", "blockTimestamp"],
    },
  });
  const transaction = response.data.transactions[0];

  expect(transaction).toBeDefined();
  expect(transaction.typeHex).toMatch(/^0x/);
  expect(["success", "reverted"]).toContain(transaction.status);
  expect(typeof transaction.gasUsed).toBe("bigint");
  expect(typeof transaction.blockTimestamp).toBe("bigint");
});

test("queryLogs", async () => {
  const filtered = await queryLogs(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    filter: {
      address: "0xb983b1b6f1fc04030f9d8935dbbfd2a1239d00d9",
      topics: [
        ["0xc797025feeeaf2cd924c99e9205acb8ec04d5cad21c41ce637a38fb6dee6016a"],
      ],
    },
    fields: {
      logs: ["address", "topics", "blockNumber", "transactionHash", "logIndex"],
      transactions: ["hash", "from"],
      blocks: ["number"],
    },
  });
  expect({
    envelope: {
      fromBlock: filtered.fromBlock.number,
      toBlock: filtered.toBlock.number,
      cursorBlock: filtered.cursorBlock.number,
    },
    logs: summarizeRows(filtered.data.logs, [
      "address",
      "topics",
      "blockNumber",
      "transactionHash",
      "logIndex",
    ]),
    transactions: summarizeRows(filtered.data.transactions, ["hash", "from"]),
    blocks: summarizeRows(filtered.data.blocks, ["number"]),
  }).toMatchInlineSnapshot(`
      {
        "blocks": {
          "firstRowKeys": [
            "number",
          ],
          "rowCount": 1,
          "rows": [
            {
              "number": 30000000n,
            },
          ],
        },
        "envelope": {
          "cursorBlock": 30000003n,
          "fromBlock": 30000000n,
          "toBlock": 30000003n,
        },
        "logs": {
          "firstRowKeys": [
            "address",
            "blockNumber",
            "logIndex",
            "topics",
            "transactionHash",
          ],
          "rowCount": 1,
          "rows": [
            {
              "address": "0xb983b1b6f1fc04030f9d8935dbbfd2a1239d00d9",
              "blockNumber": 30000000n,
              "logIndex": 0,
              "topics": [
                "0xc797025feeeaf2cd924c99e9205acb8ec04d5cad21c41ce637a38fb6dee6016a",
                "0x0000000000000000000000000000000000000000000000000000000000006b9e",
              ],
              "transactionHash": "0xd9899e8aa5e2311afc32b7af04bdb8973342b60d4e61f9866c3b04aeb277cdbe",
            },
          ],
        },
        "transactions": {
          "firstRowKeys": [
            "from",
            "hash",
          ],
          "rowCount": 1,
          "rows": [
            {
              "from": "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
              "hash": "0xd9899e8aa5e2311afc32b7af04bdb8973342b60d4e61f9866c3b04aeb277cdbe",
            },
          ],
        },
      }
    `);

  const ascPages = await collectPages(
    queryLogsWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_999n,
      limit: 1,
      fields: {
        logs: ["blockNumber", "logIndex"],
        transactions: ["hash"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(ascPages, "logs", ["blockNumber", "logIndex"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000000n,
            "firstRow": {
              "blockNumber": 30000000n,
              "logIndex": 0,
            },
            "firstRowKeys": [
              "blockNumber",
              "logIndex",
            ],
            "rowCount": 3,
          },
          {
            "cursorBlock": 30000007n,
            "firstRow": {
              "blockNumber": 30000007n,
              "logIndex": 0,
            },
            "firstRowKeys": [
              "blockNumber",
              "logIndex",
            ],
            "rowCount": 3,
          },
          {
            "cursorBlock": 30000008n,
            "firstRow": {
              "blockNumber": 30000008n,
              "logIndex": 0,
            },
            "firstRowKeys": [
              "blockNumber",
              "logIndex",
            ],
            "rowCount": 3,
          },
        ]
      `);

  const descPages = await collectPages(
    queryLogsWithPagination(client, {
      fromBlock: 30_000_999n,
      toBlock: 30_000_000n,
      order: "desc",
      limit: 1,
      fields: {
        logs: ["blockNumber", "logIndex"],
        transactions: ["hash"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(descPages, "logs", ["blockNumber", "logIndex"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000999n,
            "firstRow": {
              "blockNumber": 30000999n,
              "logIndex": 5,
            },
            "firstRowKeys": [
              "blockNumber",
              "logIndex",
            ],
            "rowCount": 6,
          },
          {
            "cursorBlock": 30000995n,
            "firstRow": {
              "blockNumber": 30000995n,
              "logIndex": 3,
            },
            "firstRowKeys": [
              "blockNumber",
              "logIndex",
            ],
            "rowCount": 4,
          },
          {
            "cursorBlock": 30000992n,
            "firstRow": {
              "blockNumber": 30000992n,
              "logIndex": 2,
            },
            "firstRowKeys": [
              "blockNumber",
              "logIndex",
            ],
            "rowCount": 3,
          },
        ]
      `);

  const empty = await queryLogs(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    filter: {
      address: "0x0000000000000000000000000000000000000000",
    },
    fields: {
      logs: ["transactionHash"],
    },
  });
  expect(
    summarizeRows(empty.data.logs, ["transactionHash"]),
  ).toMatchInlineSnapshot(`
        {
          "firstRowKeys": [],
          "rowCount": 0,
          "rows": [],
        }
      `);

  const invalidBlock = await captureRpcError(() =>
    queryLogs(client, {
      fromBlock: "bad" as QueryBlocksRequest["fromBlock"],
      toBlock: 30_000_003n,
      fields: {
        logs: ["transactionHash"],
      },
    }),
  );
  expect(invalidBlock).toMatchInlineSnapshot(`
      {
        "code": -32602,
        "details": "Invalid params",
        "name": "InvalidParamsRpcError",
        "shortMessage": 
      "Invalid parameters were provided to the RPC method.
      Double check you have provided the correct parameters."
      ,
      }
    `);
});

test("queryTraces", async () => {
  const filtered = await queryTraces(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    filter: {
      from: "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
      to: "0x5447e0f54979fa6888b37631b9ce285cc4bc1a99",
      isTopLevel: true,
    },
    fields: {
      traces: [
        "from",
        "to",
        "value",
        "blockNumber",
        "transactionHash",
        "traceAddress",
        "status",
        "type",
      ],
      transactions: ["hash"],
      blocks: ["number"],
    },
  });
  expect({
    envelope: {
      fromBlock: filtered.fromBlock.number,
      toBlock: filtered.toBlock.number,
      cursorBlock: filtered.cursorBlock.number,
    },
    traces: summarizeRows(filtered.data.traces, [
      "from",
      "to",
      "value",
      "blockNumber",
      "transactionHash",
      "traceAddress",
      "status",
      "type",
    ]),
    transactions: summarizeRows(filtered.data.transactions, ["hash"]),
    blocks: summarizeRows(filtered.data.blocks, ["number"]),
  }).toMatchInlineSnapshot(`
      {
        "blocks": {
          "firstRowKeys": [
            "number",
          ],
          "rowCount": 1,
          "rows": [
            {
              "number": 30000000n,
            },
          ],
        },
        "envelope": {
          "cursorBlock": 30000003n,
          "fromBlock": 30000000n,
          "toBlock": 30000003n,
        },
        "traces": {
          "firstRowKeys": [
            "blockNumber",
            "from",
            "status",
            "to",
            "traceAddress",
            "transactionHash",
            "type",
            "value",
          ],
          "rowCount": 1,
          "rows": [
            {
              "blockNumber": 30000000n,
              "from": "0xc777cfb3bccc2f1d3049845d62639c769dff243d",
              "status": "success",
              "to": "0x5447e0f54979fa6888b37631b9ce285cc4bc1a99",
              "traceAddress": [],
              "transactionHash": "0xd9899e8aa5e2311afc32b7af04bdb8973342b60d4e61f9866c3b04aeb277cdbe",
              "type": "CALL",
              "value": 0n,
            },
          ],
        },
        "transactions": {
          "firstRowKeys": [
            "hash",
          ],
          "rowCount": 1,
          "rows": [
            {
              "hash": "0xd9899e8aa5e2311afc32b7af04bdb8973342b60d4e61f9866c3b04aeb277cdbe",
            },
          ],
        },
      }
    `);

  const ascPages = await collectPages(
    queryTracesWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_999n,
      limit: 1,
      fields: {
        traces: ["blockNumber", "traceAddress"],
        transactions: ["hash"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(ascPages, "traces", ["blockNumber", "traceAddress"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000000n,
            "firstRow": {
              "blockNumber": 30000000n,
              "traceAddress": [],
            },
            "firstRowKeys": [
              "blockNumber",
              "traceAddress",
            ],
            "rowCount": 6,
          },
          {
            "cursorBlock": 30000007n,
            "firstRow": {
              "blockNumber": 30000007n,
              "traceAddress": [],
            },
            "firstRowKeys": [
              "blockNumber",
              "traceAddress",
            ],
            "rowCount": 6,
          },
          {
            "cursorBlock": 30000008n,
            "firstRow": {
              "blockNumber": 30000008n,
              "traceAddress": [],
            },
            "firstRowKeys": [
              "blockNumber",
              "traceAddress",
            ],
            "rowCount": 6,
          },
        ]
      `);

  const descPages = await collectPages(
    queryTracesWithPagination(client, {
      fromBlock: 30_000_999n,
      toBlock: 30_000_000n,
      order: "desc",
      limit: 1,
      fields: {
        traces: ["blockNumber", "traceAddress"],
        transactions: ["hash"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(descPages, "traces", ["blockNumber", "traceAddress"]),
  ).toMatchInlineSnapshot(`
        [
          {
            "cursorBlock": 30000999n,
            "firstRow": {
              "blockNumber": 30000999n,
              "traceAddress": [
                0,
                3,
              ],
            },
            "firstRowKeys": [
              "blockNumber",
              "traceAddress",
            ],
            "rowCount": 12,
          },
          {
            "cursorBlock": 30000995n,
            "firstRow": {
              "blockNumber": 30000995n,
              "traceAddress": [
                3,
                0,
              ],
            },
            "firstRowKeys": [
              "blockNumber",
              "traceAddress",
            ],
            "rowCount": 9,
          },
          {
            "cursorBlock": 30000992n,
            "firstRow": {
              "blockNumber": 30000992n,
              "traceAddress": [
                0,
                3,
              ],
            },
            "firstRowKeys": [
              "blockNumber",
              "traceAddress",
            ],
            "rowCount": 6,
          },
        ]
      `);

  const empty = await queryTraces(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    filter: {
      from: "0x0000000000000000000000000000000000000000",
    },
    fields: {
      traces: ["transactionHash"],
    },
  });
  expect(
    summarizeRows(empty.data.traces, ["transactionHash"]),
  ).toMatchInlineSnapshot(`
        {
          "firstRowKeys": [],
          "rowCount": 0,
          "rows": [],
        }
      `);

  const invalidBlock = await captureRpcError(() =>
    queryTraces(client, {
      fromBlock: "bad" as QueryBlocksRequest["fromBlock"],
      toBlock: 30_000_003n,
      fields: {
        traces: ["transactionHash"],
      },
    }),
  );
  expect(invalidBlock).toMatchInlineSnapshot(`
      {
        "code": -32602,
        "details": "Invalid params",
        "name": "InvalidParamsRpcError",
        "shortMessage": 
      "Invalid parameters were provided to the RPC method.
      Double check you have provided the correct parameters."
      ,
      }
    `);
});

test("queryTransfers", async () => {
  const filtered = await queryTransfers(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_999n,
    limit: 1,
    filter: {
      from: "0xd9f51b1e2a2f2b900a15096b9f7e077a7c8a64d6",
      to: "0xacc0a0cf13571d30b4b8637996f5d6d774d4fd62",
      isTopLevel: true,
    },
    fields: {
      transfers: [
        "from",
        "to",
        "value",
        "blockNumber",
        "transactionHash",
        "traceAddress",
        "status",
      ],
      transactions: ["hash"],
      blocks: ["number"],
    },
  });
  expect({
    envelope: {
      fromBlock: filtered.fromBlock.number,
      toBlock: filtered.toBlock.number,
      cursorBlock: filtered.cursorBlock.number,
    },
    transfers: summarizeRows(filtered.data.transfers, [
      "from",
      "to",
      "value",
      "blockNumber",
      "transactionHash",
      "traceAddress",
      "status",
    ]),
    transactions: summarizeRows(filtered.data.transactions, ["hash"]),
    blocks: summarizeRows(filtered.data.blocks, ["number"]),
  }).toMatchInlineSnapshot(`
      {
        "blocks": {
          "firstRowKeys": [
            "number",
          ],
          "rowCount": 1,
          "rows": [
            {
              "number": 30000041n,
            },
          ],
        },
        "envelope": {
          "cursorBlock": 30000041n,
          "fromBlock": 30000000n,
          "toBlock": 30000999n,
        },
        "transactions": {
          "firstRowKeys": [
            "hash",
          ],
          "rowCount": 1,
          "rows": [
            {
              "hash": "0xc76a3ea4cd13bee5d505bdfaaaafb8f1c5f75b8c0adbaacc88be1dd2250fb7d6",
            },
          ],
        },
        "transfers": {
          "firstRowKeys": [
            "blockNumber",
            "from",
            "status",
            "to",
            "traceAddress",
            "transactionHash",
            "value",
          ],
          "rowCount": 1,
          "rows": [
            {
              "blockNumber": 30000041n,
              "from": "0xd9f51b1e2a2f2b900a15096b9f7e077a7c8a64d6",
              "status": "success",
              "to": "0xacc0a0cf13571d30b4b8637996f5d6d774d4fd62",
              "traceAddress": [],
              "transactionHash": "0xc76a3ea4cd13bee5d505bdfaaaafb8f1c5f75b8c0adbaacc88be1dd2250fb7d6",
              "value": 24n,
            },
          ],
        },
      }
    `);

  const ascPages = await collectPages(
    queryTransfersWithPagination(client, {
      fromBlock: 30_000_000n,
      toBlock: 30_000_999n,
      limit: 1,
      fields: {
        transfers: ["blockNumber", "traceAddress"],
        transactions: ["hash"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(ascPages, "transfers", ["blockNumber", "traceAddress"]),
  ).toMatchInlineSnapshot(`
      [
        {
          "cursorBlock": 30000041n,
          "firstRow": {
            "blockNumber": 30000041n,
            "traceAddress": [],
          },
          "firstRowKeys": [
            "blockNumber",
            "traceAddress",
          ],
          "rowCount": 1,
        },
        {
          "cursorBlock": 30000091n,
          "firstRow": {
            "blockNumber": 30000091n,
            "traceAddress": [],
          },
          "firstRowKeys": [
            "blockNumber",
            "traceAddress",
          ],
          "rowCount": 1,
        },
        {
          "cursorBlock": 30000141n,
          "firstRow": {
            "blockNumber": 30000141n,
            "traceAddress": [],
          },
          "firstRowKeys": [
            "blockNumber",
            "traceAddress",
          ],
          "rowCount": 1,
        },
      ]
    `);

  const descPages = await collectPages(
    queryTransfersWithPagination(client, {
      fromBlock: 30_000_999n,
      toBlock: 30_000_000n,
      order: "desc",
      limit: 1,
      fields: {
        transfers: ["blockNumber", "traceAddress"],
        transactions: ["hash"],
        blocks: ["number"],
      },
    }),
    3,
  );
  expect(
    summarizePages(descPages, "transfers", ["blockNumber", "traceAddress"]),
  ).toMatchInlineSnapshot(`
      [
        {
          "cursorBlock": 30000989n,
          "firstRow": {
            "blockNumber": 30000989n,
            "traceAddress": [],
          },
          "firstRowKeys": [
            "blockNumber",
            "traceAddress",
          ],
          "rowCount": 1,
        },
        {
          "cursorBlock": 30000939n,
          "firstRow": {
            "blockNumber": 30000939n,
            "traceAddress": [],
          },
          "firstRowKeys": [
            "blockNumber",
            "traceAddress",
          ],
          "rowCount": 1,
        },
        {
          "cursorBlock": 30000888n,
          "firstRow": {
            "blockNumber": 30000888n,
            "traceAddress": [],
          },
          "firstRowKeys": [
            "blockNumber",
            "traceAddress",
          ],
          "rowCount": 1,
        },
      ]
    `);

  const empty = await queryTransfers(client, {
    fromBlock: 30_000_000n,
    toBlock: 30_000_003n,
    filter: {
      from: "0x0000000000000000000000000000000000000000",
    },
    fields: {
      transfers: ["transactionHash"],
    },
  });
  expect(
    summarizeRows(empty.data.transfers, ["transactionHash"]),
  ).toMatchInlineSnapshot(`
        {
          "firstRowKeys": [],
          "rowCount": 0,
          "rows": [],
        }
      `);

  const invalidBlock = await captureRpcError(() =>
    queryTransfers(client, {
      fromBlock: "bad" as QueryBlocksRequest["fromBlock"],
      toBlock: 30_000_003n,
      fields: {
        transfers: ["transactionHash"],
      },
    }),
  );
  expect(invalidBlock).toMatchInlineSnapshot(`
      {
        "code": -32602,
        "details": "Invalid params",
        "name": "InvalidParamsRpcError",
        "shortMessage": 
      "Invalid parameters were provided to the RPC method.
      Double check you have provided the correct parameters."
      ,
      }
    `);
});

test("queryActions binds all actions to the provided client", async () => {
  const block = {
    number: "0x1",
    hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
    parentHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
  };
  const calls: { method: string; params: unknown }[] = [];
  const mockClient = createClient({
    rpcSchema: rpcSchema<QueryRpcSchema>(),
    transport: custom({
      request: async ({ method, params }) => {
        calls.push({ method, params });
        return {
          fromBlock: block,
          toBlock: block,
          cursorBlock: block,
          data: {
            blocks: [],
            logs: [],
            traces: [],
            transactions: [],
            transfers: [],
          },
        };
      },
    }),
  });
  const actions = queryActions(mockClient);
  const request = { fromBlock: 1n, toBlock: 1n, limit: 1 };

  await actions.queryBlocks(request);
  await actions.queryTransactions(request);
  await actions.queryLogs(request);
  await actions.queryTraces(request);
  await actions.queryTransfers(request);
  await collectPages(actions.queryBlocksWithPagination(request), 1);
  await collectPages(actions.queryTransactionsWithPagination(request), 1);
  await collectPages(actions.queryLogsWithPagination(request), 1);
  await collectPages(actions.queryTracesWithPagination(request), 1);
  await collectPages(actions.queryTransfersWithPagination(request), 1);

  expect(calls).toEqual([
    {
      method: "eth_queryBlocks",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryTransactions",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryLogs",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryTraces",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryTransfers",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryBlocks",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryTransactions",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryLogs",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryTraces",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
    {
      method: "eth_queryTransfers",
      params: [{ fromBlock: "0x1", limit: "0x1", toBlock: "0x1" }],
    },
  ]);
});

const address = "0x1111111111111111111111111111111111111111" as const;
const recipient = "0x2222222222222222222222222222222222222222" as const;
const hash = `0x${"1".repeat(64)}` as const;
const parentHash = `0x${"0".repeat(64)}` as const;

const abi = [
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
    inputs: [
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "function",
    name: "noResult",
    stateMutability: "view",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },
] as const;

const transferTopics = encodeEventTopics({
  abi,
  eventName: "Transfer",
  args: { from: address },
});
const transferData = encodeAbiParameters([{ type: "uint256" }], [7n]);
const forwardInput = encodeFunctionData({
  abi,
  functionName: "forward",
  args: [recipient, "0x1234"],
});
const forwardOutput = encodeFunctionResult({
  abi,
  functionName: "forward",
  result: true,
});
const noResultInput = encodeFunctionData({
  abi,
  functionName: "noResult",
  args: [9n],
});

function block(number: number) {
  return {
    number: `0x${number.toString(16)}`,
    hash,
    parentHash,
  };
}

function response<const data extends object>(
  data: data,
  cursor = 1,
  toBlock = 1,
  fromBlock = 1,
) {
  return {
    fromBlock: block(fromBlock),
    toBlock: block(toBlock),
    cursorBlock: block(cursor),
    data,
  };
}

function logRow(topics: readonly Hex[] = transferTopics as Hex[]) {
  return {
    address,
    blockHash: hash,
    blockNumber: "0x1",
    data: transferData,
    logIndex: "0x0",
    topics,
    transactionHash: hash,
    transactionIndex: "0x0",
    removed: false,
  };
}

function traceRow(
  input: `0x${string}`,
  status = "0x1",
  output = forwardOutput,
) {
  return {
    blockHash: hash,
    blockNumber: "0x1",
    from: address,
    gas: "0x10",
    gasUsed: "0x8",
    input,
    output,
    status,
    to: recipient,
    traceAddress: [],
    transactionHash: hash,
    transactionIndex: "0x0",
    type: "call",
    value: "0x0",
  };
}

function mockClient(results: unknown[]) {
  const calls: { method: string; params: unknown }[] = [];
  let index = 0;
  const client = createClient({
    rpcSchema: rpcSchema<QueryRpcSchema>(),
    transport: custom({
      request: async (request) => {
        calls.push(request);
        return results[index++];
      },
    }),
  });
  return { calls, client };
}

test("queryContractLogs translates filters, decodes rows, and restores projections", async () => {
  const { calls, client } = mockClient([
    response({
      logs: [logRow()],
      blocks: [{ number: "0x1" }],
    }),
  ]);
  const request = {
    abi,
    address,
    eventName: "Transfer" as const,
    args: { from: address },
    fromBlock: 1n,
    toBlock: 1n,
    strict: true as const,
    fields: {
      logs: ["address"] as const,
      blocks: ["number"] as const,
    },
  };

  const result = await queryContractLogs(client, request);

  expect(calls).toEqual([
    {
      method: "eth_queryLogs",
      params: [
        {
          filter: { address, topics: transferTopics },
          fields: { logs: ["address", "topics", "data"], blocks: ["number"] },
          fromBlock: "0x1",
          toBlock: "0x1",
        },
      ],
    },
  ]);
  expect(result.data.logs).toEqual([
    {
      address,
      eventName: "Transfer",
      args: { from: address, value: 7n },
    },
  ]);
  expect(result.data.blocks).toEqual([{ number: 1n }]);
});

test("queryContractLogs supports all ABI events and strict malformed-log behavior", async () => {
  const allEvents = mockClient([response({ logs: [] })]);
  await queryContractLogs(allEvents.client, {
    abi,
    fromBlock: 1n,
    toBlock: 1n,
  });
  const topics = (
    allEvents.calls[0].params as [{ filter: { topics: unknown } }]
  )[0].filter.topics;
  expect(topics).toEqual([
    [transferTopics[0], encodeEventTopics({ abi, eventName: "Approval" })[0]],
  ]);

  const malformed = mockClient([
    response({ logs: [logRow([transferTopics[0], "0x1234"])] }),
  ]);
  const nonStrict = await queryContractLogs(malformed.client, {
    abi,
    eventName: "Transfer",
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(nonStrict.data.logs).toEqual([
    expect.objectContaining({ eventName: "Transfer", args: {} }),
  ]);

  const strict = mockClient([
    response({ logs: [logRow([transferTopics[0], "0x1234"])] }),
  ]);
  const strictResult = await queryContractLogs(strict.client, {
    abi,
    eventName: "Transfer",
    strict: true,
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(strictResult.data.logs).toEqual([]);
});

test("queryContractLogs supports overloaded and anonymous events", async () => {
  const overloadedAbi = [
    {
      type: "event",
      name: "Value",
      inputs: [{ name: "value", type: "uint256", indexed: true }],
      anonymous: false,
    },
    {
      type: "event",
      name: "Value",
      inputs: [{ name: "value", type: "address", indexed: true }],
      anonymous: false,
    },
  ] as const;
  const overloaded = mockClient([response({ logs: [] })]);
  await queryContractLogs(overloaded.client, {
    abi: overloadedAbi,
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(
    (overloaded.calls[0].params as [{ filter: { topics: unknown } }])[0].filter
      .topics,
  ).toEqual([
    [toEventSelector(overloadedAbi[0]), toEventSelector(overloadedAbi[1])],
  ]);

  const anonymousEvent = {
    type: "event",
    name: "AnonymousValue",
    inputs: [
      { name: "who", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: true,
  } as const;
  const collidingNamedEvent = {
    ...anonymousEvent,
    anonymous: false,
    inputs: [
      { name: "who", type: "address", indexed: false },
      { name: "value", type: "uint256", indexed: true },
    ],
  } as const;
  const mixedAbi = [abi[0], collidingNamedEvent, anonymousEvent] as const;
  const anonymousTopic = transferTopics[1] as Hex;
  const anonymous = mockClient([
    response({ logs: [logRow([anonymousTopic])] }),
  ]);
  const anonymousResult = await queryContractLogs(anonymous.client, {
    abi: mixedAbi,
    address,
    fromBlock: 1n,
    toBlock: 1n,
    fields: { logs: [] },
  });
  expect(anonymous.calls[0]).toEqual({
    method: "eth_queryLogs",
    params: [
      {
        filter: { address },
        fields: { logs: ["topics", "data"] },
        fromBlock: "0x1",
        toBlock: "0x1",
      },
    ],
  });
  expect(anonymousResult.data.logs).toEqual([
    {
      eventName: "AnonymousValue",
      args: { who: address, value: 7n },
    },
  ]);

  const selected = mockClient([response({ logs: [logRow([anonymousTopic])] })]);
  await queryContractLogs(selected.client, {
    abi: [anonymousEvent],
    eventName: "AnonymousValue",
    args: { who: address },
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(
    (selected.calls[0].params as [{ filter: { topics: unknown } }])[0].filter
      .topics,
  ).toEqual([anonymousTopic]);
});

test("queryContractLogsWithPagination decodes every page without mutating the request", async () => {
  const { calls, client } = mockClient([
    response({ logs: [logRow()] }, 1, 2),
    response({ logs: [logRow()] }, 2, 2, 2),
  ]);
  const request = {
    abi,
    eventName: "Transfer" as const,
    fromBlock: 1n,
    toBlock: 2n,
    fields: { logs: ["logIndex"] as const },
  };
  const pages = [];
  for await (const page of queryContractLogsWithPagination(client, request)) {
    pages.push(page);
  }
  expect(pages).toHaveLength(2);
  expect(pages[0].data.logs[0]).toMatchObject({
    logIndex: 0,
    eventName: "Transfer",
  });
  expect(request).toEqual({
    abi,
    eventName: "Transfer",
    fromBlock: 1n,
    toBlock: 2n,
    fields: { logs: ["logIndex"] },
  });
  expect((calls[1].params as [{ fromBlock: string }])[0].fromBlock).toBe("0x2");
});

test("queryContractTraces decodes successful and reverted calls", async () => {
  const { calls, client } = mockClient([
    response({
      traces: [traceRow(forwardInput), traceRow(forwardInput, "0x0", "0x1234")],
    }),
  ]);
  const result = await queryContractTraces(client, {
    abi,
    address: recipient,
    from: address,
    functionName: "forward",
    isTopLevel: true,
    fromBlock: 1n,
    toBlock: 1n,
    fields: { traces: ["to", "status"] },
  });

  expect(calls[0]).toEqual({
    method: "eth_queryTraces",
    params: [
      {
        filter: {
          to: recipient,
          from: address,
          isTopLevel: true,
          selector: `0x${forwardInput.slice(2, 10)}`,
        },
        fields: { traces: ["to", "status", "input", "output"] },
        fromBlock: "0x1",
        toBlock: "0x1",
      },
    ],
  });
  expect(result.data.traces).toEqual([
    {
      to: recipient,
      status: "success",
      functionName: "forward",
      args: [recipient, "0x1234"],
      result: true,
    },
    {
      to: recipient,
      status: "reverted",
      functionName: "forward",
      args: [recipient, "0x1234"],
    },
  ]);
});

test("queryContractTraces passes through Viem decode errors", async () => {
  const { client } = mockClient([response({ traces: [traceRow("0x1234")] })]);

  await expect(
    queryContractTraces(client, {
      abi,
      functionName: "forward",
      fromBlock: 1n,
      toBlock: 1n,
    }),
  ).rejects.toThrow();
});

test("queryContractTraces restores empty projections and decodes overloaded results", async () => {
  const overloadedAbi = [
    {
      type: "function",
      name: "read",
      stateMutability: "view",
      inputs: [{ name: "value", type: "uint256" }],
      outputs: [{ name: "value", type: "uint256" }],
    },
    {
      type: "function",
      name: "read",
      stateMutability: "view",
      inputs: [{ name: "value", type: "address" }],
      outputs: [{ name: "value", type: "address" }],
    },
  ] as const;
  const input = encodeFunctionData({
    abi: overloadedAbi,
    functionName: "read",
    args: [address],
  });
  const output = encodeFunctionResult({
    abi: [overloadedAbi[1]],
    functionName: "read",
    result: address,
  });
  const { calls, client } = mockClient([
    response({ traces: [traceRow(input, "0x1", output)] }),
  ]);
  const result = await queryContractTraces(client, {
    abi: overloadedAbi,
    functionName: "read",
    fromBlock: 1n,
    toBlock: 1n,
    fields: { traces: [] },
  });
  expect(
    (calls[0].params as [{ fields: { traces: unknown } }])[0].fields.traces,
  ).toEqual(["input", "output", "status"]);
  expect(result.data.traces as unknown).toEqual([
    {
      functionName: "read",
      args: [address],
      result: address,
    },
  ]);
});

test("queryContractTraces rejects an ABI with no matching functions", async () => {
  const { calls, client } = mockClient([]);
  await expect(
    queryContractTraces(client, {
      abi: [abi[0]],
      fromBlock: 1n,
      toBlock: 1n,
    }),
  ).rejects.toThrow("ABI does not contain any functions");
  expect(calls).toEqual([]);
});

test("queryContractTracesWithPagination decodes pages and supports all function selectors", async () => {
  const { calls, client } = mockClient([
    response({ traces: [traceRow(noResultInput)] }, 1, 2),
    response({ traces: [traceRow(noResultInput)] }, 2, 2, 2),
  ]);
  const pages = [];
  for await (const page of queryContractTracesWithPagination(client, {
    abi,
    fromBlock: 1n,
    toBlock: 2n,
  })) {
    pages.push(page);
  }
  expect(pages).toHaveLength(2);
  expect(pages[0].data.traces[0]).toMatchObject({
    functionName: "noResult",
    args: [9n],
  });
  expect(
    (calls[0].params as [{ filter: { selector: unknown } }])[0].filter,
  ).toEqual({
    selector: [
      `0x${forwardInput.slice(2, 10)}`,
      `0x${noResultInput.slice(2, 10)}`,
    ],
  });
});

test("contract pagination preserves descending cursor validation", async () => {
  const { client } = mockClient([
    {
      fromBlock: block(2),
      toBlock: block(1),
      cursorBlock: block(0),
      data: { logs: [] },
    },
  ]);
  const pages = queryContractLogsWithPagination(client, {
    abi,
    fromBlock: 2n,
    toBlock: 1n,
    order: "desc",
  });
  await expect(pages.next()).rejects.toThrow(
    "Pagination cursorBlock is outside the requested range",
  );
});

test("isLastPage compares the cursor and resolved range", () => {
  expect(
    isLastPage({ cursorBlock: { number: "0x1" }, toBlock: { number: "0x1" } }),
  ).toBe(true);
  expect(
    isLastPage({ cursorBlock: { number: "0x1" }, toBlock: { number: "0x2" } }),
  ).toBe(false);
});

test("queryActions binds ABI-aware actions", async () => {
  const { client } = mockClient([
    response({ logs: [] }),
    response({ traces: [] }),
    response({ logs: [] }),
    response({ traces: [] }),
  ]);
  const actions = queryActions(client);
  await actions.queryContractLogs({ abi, fromBlock: 1n, toBlock: 1n });
  await actions.queryContractTraces({ abi, fromBlock: 1n, toBlock: 1n });
  for await (const _page of actions.queryContractLogsWithPagination({
    abi,
    fromBlock: 1n,
    toBlock: 1n,
  }))
    break;
  for await (const _page of actions.queryContractTracesWithPagination({
    abi,
    fromBlock: 1n,
    toBlock: 1n,
  }))
    break;
});
