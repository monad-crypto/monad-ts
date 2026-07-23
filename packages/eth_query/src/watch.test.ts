import { expect, test } from "bun:test";
import { ReorgBeyondMaxDepthError, watchQueryLogs } from "./index.js";
import type { QueryLogsResponse } from "./types.js";

type Hash = `0x${string}`;

type TestBlock = {
  hash: Hash;
  number: bigint;
  parentHash: Hash;
  timestamp: bigint;
};

type TestLog = {
  address: `0x${string}`;
  blockHash: Hash;
  blockNumber: bigint;
  data: Hash;
  logIndex: number;
  topics: Hash[];
  transactionHash: Hash;
  transactionIndex: number;
};

type RpcCall = {
  method: string;
  request: Record<string, unknown>;
};

type BlockNumberResponse = QueryLogsResponse<{
  fields: { logs: readonly ["blockNumber"] };
}>;

type ProjectedReorgResponse = QueryLogsResponse<{
  fields: {
    logs: readonly ["blockNumber", "logIndex", "data"];
    blocks: readonly ["number", "timestamp"];
  };
}>;

type ProjectedReorg = {
  commonAncestor: ProjectedReorgResponse["fromBlock"];
  oldBlocks: readonly ProjectedReorgResponse["fromBlock"][];
  newBlocks: readonly ProjectedReorgResponse["fromBlock"][];
  removed: ProjectedReorgResponse["data"];
};

const zeroHash = `0x${"0".repeat(64)}` as Hash;
const address = `0x${"1".repeat(40)}` as const;

function hash(value: number): Hash {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function makeChain(
  length: number,
  hashOffset: number,
  prefix: readonly TestBlock[] = [],
): TestBlock[] {
  const blocks = [...prefix];
  for (let number = blocks.length; number <= length; number++) {
    blocks.push({
      number: BigInt(number),
      hash: hash(hashOffset + number),
      parentHash: blocks[number - 1]?.hash ?? zeroHash,
      timestamp: BigInt(1_000 + number),
    });
  }
  return blocks;
}

function makeLog(block: TestBlock, logIndex = 0): TestLog {
  return {
    address,
    blockHash: block.hash,
    blockNumber: block.number,
    data: hash(10_000 + Number(block.number)),
    logIndex,
    topics: [hash(20_000 + Number(block.number))],
    transactionHash: hash(30_000 + Number(block.number)),
    transactionIndex: 0,
  };
}

function toQuantity(value: bigint | number): `0x${string}` {
  return `0x${BigInt(value).toString(16)}`;
}

function project(
  row: Record<string, unknown>,
  fields: unknown,
): Record<string, unknown> {
  if (fields === true || fields === undefined) return { ...row };
  if (!Array.isArray(fields)) return {};
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function rawBlock(block: TestBlock): Record<string, unknown> {
  return {
    hash: block.hash,
    number: toQuantity(block.number),
    parentHash: block.parentHash,
    timestamp: toQuantity(block.timestamp),
  };
}

function rawLog(log: TestLog): Record<string, unknown> {
  return {
    ...log,
    blockNumber: toQuantity(log.blockNumber),
    logIndex: toQuantity(log.logIndex),
    transactionIndex: toQuantity(log.transactionIndex),
  };
}

function asNumber(value: unknown, tip: bigint): bigint {
  if (value === undefined) return tip;
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && value.startsWith("0x")) {
    return BigInt(value);
  }
  if (value === "earliest") return 0n;
  if (value === "latest" || value === "safe" || value === "finalized") {
    return tip;
  }
  throw new Error(`Unsupported block reference: ${String(value)}`);
}

function blockTagIn(request: Record<string, unknown>) {
  return [request.fromBlock, request.toBlock].some(
    (value) => value === "latest" || value === "safe" || value === "finalized",
  );
}

function createChainClient(options: {
  chain: TestBlock[];
  logs?: TestLog[];
  maxRange?: bigint;
  pageCursor?: (fromBlock: bigint, toBlock: bigint) => bigint;
}) {
  let chain = options.chain;
  const logsByHash = new Map<Hash, TestLog[]>();
  const calls: RpcCall[] = [];
  const limitExceededCalls: RpcCall[] = [];

  const addLogs = (logs: readonly TestLog[]) => {
    for (const log of logs) {
      const existing = logsByHash.get(log.blockHash) ?? [];
      existing.push(log);
      logsByHash.set(log.blockHash, existing);
    }
  };
  addLogs(options.logs ?? []);

  const client = {
    pollingInterval: 1,
    request: async ({
      method,
      params,
    }: {
      method: string;
      params?: readonly [Record<string, unknown>];
    }) => {
      const request = params?.[0] ?? {};
      const call = { method, request: structuredClone(request) };
      calls.push(call);

      if (method !== "eth_queryBlocks" && method !== "eth_queryLogs") {
        throw new Error(`Unexpected RPC method: ${method}`);
      }

      const tip = BigInt(chain.length - 1);
      const fromBlock = asNumber(request.fromBlock, tip);
      const toBlock = asNumber(request.toBlock, tip);
      if (fromBlock > toBlock || toBlock > tip) {
        throw new Error(
          `Invalid range ${fromBlock.toString()}-${toBlock.toString()} at tip ${tip.toString()}`,
        );
      }
      if (
        options.maxRange !== undefined &&
        toBlock - fromBlock + 1n > options.maxRange
      ) {
        limitExceededCalls.push(call);
        throw Object.assign(new Error("query range exceeds test limit"), {
          code: -32005,
        });
      }

      const from = chain[Number(fromBlock)];
      const to = chain[Number(toBlock)];
      if (!from || !to) throw new Error("Requested block is not available");

      const fields = (request.fields ?? {}) as Record<string, unknown>;
      const cursorBlock =
        method === "eth_queryLogs"
          ? (options.pageCursor?.(fromBlock, toBlock) ?? toBlock)
          : toBlock;
      if (cursorBlock < fromBlock || cursorBlock > toBlock) {
        throw new Error("Test page cursor is outside its response range");
      }
      const cursor = chain[Number(cursorBlock)];
      if (!cursor) throw new Error("Cursor block is not available");

      if (method === "eth_queryBlocks") {
        return {
          fromBlock: rawBlock(from),
          toBlock: rawBlock(to),
          cursorBlock: rawBlock(cursor),
          data: {
            blocks: chain
              .slice(Number(fromBlock), Number(cursorBlock) + 1)
              .map((block) => project(rawBlock(block), fields.blocks)),
          },
        };
      }

      const pageBlocks = chain.slice(
        Number(fromBlock),
        Number(cursorBlock) + 1,
      );
      const pageLogs = pageBlocks.flatMap(
        (block) => logsByHash.get(block.hash) ?? [],
      );
      const data: Record<string, unknown> = {
        logs: pageLogs.map((log) => project(rawLog(log), fields.logs)),
      };
      if (Object.hasOwn(fields, "blocks")) {
        data.blocks = pageBlocks
          .filter((block) => logsByHash.has(block.hash))
          .map((block) => project(rawBlock(block), fields.blocks));
      }

      return {
        fromBlock: rawBlock(from),
        toBlock: rawBlock(to),
        cursorBlock: rawBlock(cursor),
        data,
      };
    },
  } as never;

  return {
    addLogs,
    calls,
    client,
    limitExceededCalls,
    setChain(nextChain: TestBlock[]) {
      chain = nextChain;
    },
  };
}

function primaryRanges(calls: readonly RpcCall[]) {
  return calls
    .filter((call) => call.method === "eth_queryLogs")
    .map((call) => ({
      fromBlock: call.request.fromBlock,
      toBlock: call.request.toBlock,
    }));
}

async function waitFor(
  condition: () => boolean,
  message: string,
  attempts = 1_000,
) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (condition()) return;
    await Bun.sleep(1);
  }
  throw new Error(`Timed out waiting for ${message}`);
}

test("keeps polling when there is no new block and unwatch cancels future delivery", async () => {
  const fullChain = makeChain(12, 100);
  const mock = createChainClient({
    chain: fullChain.slice(0, 11),
    logs: [
      makeLog(fullChain[10]),
      makeLog(fullChain[11]),
      makeLog(fullChain[12]),
    ],
  });
  const delivered: bigint[][] = [];
  const errors: Error[] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fields: { logs: ["blockNumber"] },
    pollingInterval: 1,
    onData(response: BlockNumberResponse) {
      delivered.push(response.data.logs.map((log) => log.blockNumber));
    },
    onError(error: Error) {
      errors.push(error);
    },
  });

  try {
    await waitFor(() => delivered.length === 1, "initial target delivery");
    await waitFor(
      () =>
        mock.calls.filter(
          (call) =>
            call.method === "eth_queryBlocks" && blockTagIn(call.request),
        ).length >= 3,
      "two idle target checks",
    );

    expect(delivered).toEqual([[10n]]);
    expect(primaryRanges(mock.calls)).toEqual([
      { fromBlock: "0xa", toBlock: "0xa" },
    ]);
    expect(errors).toEqual([]);

    mock.setChain(fullChain.slice(0, 12));
    await waitFor(() => delivered.length === 2, "delivery after idle polls");
    expect(delivered).toEqual([[10n], [11n]]);

    unwatch();
    mock.setChain(fullChain);
    await Bun.sleep(10);
    expect(delivered).toEqual([[10n], [11n]]);
  } finally {
    unwatch();
  }
});

test("follows cursor pages without gaps and suppresses an empty data page", async () => {
  const chain = makeChain(5, 200);
  const mock = createChainClient({
    chain,
    logs: [makeLog(chain[1]), makeLog(chain[5])],
    pageCursor(fromBlock, toBlock) {
      if (fromBlock === 1n && toBlock === 5n) return 2n;
      if (fromBlock === 3n && toBlock === 5n) return 4n;
      return toBlock;
    },
  });
  const delivered: bigint[][] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fromBlock: 1n,
    fields: { logs: ["blockNumber"] },
    limit: 1,
    pollingInterval: 1,
    onData(response: BlockNumberResponse) {
      delivered.push(response.data.logs.map((log) => log.blockNumber));
    },
  });

  try {
    await waitFor(() => delivered.length === 2, "both non-empty pages");
    expect(delivered).toEqual([[1n], [5n]]);
    expect(primaryRanges(mock.calls).slice(0, 3)).toEqual([
      { fromBlock: "0x1", toBlock: "0x5" },
      { fromBlock: "0x3", toBlock: "0x5" },
      { fromBlock: "0x5", toBlock: "0x5" },
    ]);
  } finally {
    unwatch();
  }
});

test("reports callback failures, retries the page, and keeps polling serial", async () => {
  const chain = makeChain(2, 300);
  const mock = createChainClient({
    chain: chain.slice(0, 2),
    logs: [makeLog(chain[1]), makeLog(chain[2])],
  });
  const callbackError = new Error("consumer failed");
  const errors: Error[] = [];
  const attempts: bigint[][] = [];
  let releaseRetry: (() => void) | undefined;
  const retryGate = new Promise<void>((resolve) => {
    releaseRetry = resolve;
  });

  const unwatch = watchQueryLogs(mock.client, {
    fromBlock: 1n,
    fields: { logs: ["blockNumber"] },
    pollingInterval: 1,
    async onData(response: BlockNumberResponse) {
      attempts.push(response.data.logs.map((log) => log.blockNumber));
      if (attempts.length === 1) throw callbackError;
      if (attempts.length === 2) await retryGate;
    },
    onError(error: Error) {
      errors.push(error);
    },
  });

  try {
    await waitFor(() => attempts.length === 2, "callback retry");
    expect(errors).toEqual([callbackError]);
    expect(attempts).toEqual([[1n], [1n]]);

    mock.setChain(chain);
    await Bun.sleep(10);
    expect(attempts).toEqual([[1n], [1n]]);

    releaseRetry?.();
    await waitFor(() => attempts.length === 3, "next block after retry");
    expect(attempts).toEqual([[1n], [1n], [2n]]);
  } finally {
    releaseRetry?.();
    unwatch();
  }
});

test("reports exact projected orphaned rows before replacement data, including above the old tip", async () => {
  const oldChain = makeChain(3, 400);
  const newChain = makeChain(4, 500, oldChain.slice(0, 2));
  const oldLogs = [
    makeLog(oldChain[1]),
    makeLog(oldChain[2]),
    makeLog(oldChain[3]),
  ];
  const newLogs = [
    makeLog(newChain[2]),
    makeLog(newChain[3]),
    makeLog(newChain[4]),
  ];
  const mock = createChainClient({
    chain: oldChain,
    logs: [...oldLogs, ...newLogs],
  });
  const events: string[] = [];
  const dataPages: unknown[] = [];
  const reorgs: unknown[] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fromBlock: 1n,
    fields: {
      logs: ["blockNumber", "logIndex", "data"],
      blocks: ["number", "timestamp"],
    },
    pollingInterval: 1,
    onData(response: ProjectedReorgResponse) {
      events.push("data");
      dataPages.push(response);
      if (dataPages.length === 1) mock.setChain(newChain);
    },
    onReorg(reorg: ProjectedReorg) {
      events.push("reorg");
      reorgs.push(reorg);
    },
  });

  try {
    await waitFor(
      () =>
        reorgs.length === 1 &&
        dataPages.some((page) =>
          (
            page as { data: { logs: { blockNumber: bigint }[] } }
          ).data.logs.some((log) => log.blockNumber === 4n),
        ),
      "reorg and replacement branch delivery",
    );

    expect(events[0]).toBe("data");
    expect(events.indexOf("reorg")).toBeGreaterThan(0);
    expect(events.slice(events.indexOf("reorg") + 1)).toContain("data");

    const firstPage = dataPages[0] as {
      data: { blocks: object[]; logs: object[] };
      fromBlock: { number: bigint };
      toBlock: { number: bigint };
      cursorBlock: { number: bigint };
    };
    expect({
      fromBlock: firstPage.fromBlock.number,
      toBlock: firstPage.toBlock.number,
      cursorBlock: firstPage.cursorBlock.number,
    }).toEqual({ fromBlock: 1n, toBlock: 3n, cursorBlock: 3n });
    expect(firstPage.data.logs.map((row) => Object.keys(row).sort())).toEqual([
      ["blockNumber", "data", "logIndex"],
      ["blockNumber", "data", "logIndex"],
      ["blockNumber", "data", "logIndex"],
    ]);
    expect(firstPage.data.blocks.map((row) => Object.keys(row).sort())).toEqual(
      [
        ["number", "timestamp"],
        ["number", "timestamp"],
        ["number", "timestamp"],
      ],
    );

    expect(reorgs[0]).toEqual({
      commonAncestor: {
        number: 1n,
        hash: oldChain[1].hash,
        parentHash: oldChain[1].parentHash,
      },
      oldBlocks: oldChain.slice(2).map(({ number, hash, parentHash }) => ({
        number,
        hash,
        parentHash,
      })),
      newBlocks: newChain.slice(2).map(({ number, hash, parentHash }) => ({
        number,
        hash,
        parentHash,
      })),
      removed: {
        logs: [oldLogs[2], oldLogs[1]].map(
          ({ blockNumber, logIndex, data }) => ({
            blockNumber,
            logIndex,
            data,
          }),
        ),
        blocks: [oldChain[3], oldChain[2]].map(({ number, timestamp }) => ({
          number,
          timestamp,
        })),
      },
    });

    const replacementNumbers = dataPages
      .slice(1)
      .flatMap(
        (page) =>
          (page as { data: { logs: { blockNumber: bigint }[] } }).data.logs,
      )
      .map((log) => log.blockNumber);
    expect(replacementNumbers).toEqual([2n, 3n, 4n]);
  } finally {
    unwatch();
  }
});

test("uses a default reorg depth of 64, reports a dedicated error, and stops", async () => {
  const oldChain = makeChain(65, 600);
  const newChain = makeChain(66, 700, oldChain.slice(0, 1));
  const mock = createChainClient({
    chain: oldChain,
    logs: [makeLog(oldChain[65]), makeLog(newChain[66])],
  });
  const errors: Error[] = [];
  const delivered: bigint[] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fromBlock: 0n,
    fields: { logs: ["blockNumber"] },
    pollingInterval: 1,
    onData(response: BlockNumberResponse) {
      delivered.push(...response.data.logs.map((log) => log.blockNumber));
      if (delivered.includes(65n)) mock.setChain(newChain);
    },
    onError(error: Error) {
      errors.push(error);
    },
  });

  try {
    await waitFor(
      () => errors.some((error) => error instanceof ReorgBeyondMaxDepthError),
      "deep reorg error",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(ReorgBeyondMaxDepthError);
    expect(errors[0].name).toBe("ReorgBeyondMaxDepthError");
    expect(delivered).toEqual([65n]);

    const callCountAfterError = mock.calls.length;
    await Bun.sleep(10);
    expect(mock.calls).toHaveLength(callCountAfterError);
    expect(delivered).toEqual([65n]);
  } finally {
    unwatch();
  }
});

test("finds the prior common ancestor after a one-block extension and reorg", async () => {
  const oldChain = makeChain(2, 800);
  const replacementChain = makeChain(2, 900, oldChain.slice(0, 2));
  const mock = createChainClient({
    chain: oldChain.slice(0, 2),
    logs: [
      makeLog(oldChain[1], 11),
      makeLog(oldChain[2], 12),
      makeLog(replacementChain[2], 22),
    ],
  });
  const deliveries: number[][] = [];
  const errors: Error[] = [];
  const reorgs: {
    commonAncestor: bigint;
    newBlocks: Hash[];
    oldBlocks: Hash[];
    removed: number[];
  }[] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fields: { logs: ["blockNumber", "logIndex"] },
    maxReorgDepth: 2,
    pollingInterval: 1,
    onData(response) {
      const indexes = response.data.logs.map((log) => log.logIndex);
      deliveries.push(indexes);
      if (indexes.includes(11)) mock.setChain(oldChain);
      if (indexes.includes(12)) mock.setChain(replacementChain);
    },
    onReorg(reorg) {
      reorgs.push({
        commonAncestor: reorg.commonAncestor.number,
        oldBlocks: reorg.oldBlocks.map((block) => block.hash),
        newBlocks: reorg.newBlocks.map((block) => block.hash),
        removed: reorg.removed.logs.map((log) => log.logIndex),
      });
    },
    onError(error) {
      errors.push(error);
    },
  });

  try {
    await waitFor(
      () => deliveries.some((indexes) => indexes.includes(22)),
      "one-block replacement delivery",
    );
    expect(deliveries).toEqual([[11], [12], [22]]);
    expect(reorgs).toEqual([
      {
        commonAncestor: 1n,
        oldBlocks: [oldChain[2].hash],
        newBlocks: [replacementChain[2].hash],
        removed: [12],
      },
    ]);
    expect(errors).toEqual([]);
  } finally {
    unwatch();
  }
});

test("reseeds history so consecutive in-depth reorgs both recover", async () => {
  const firstChain = makeChain(3, 1_000);
  const secondChain = makeChain(3, 1_100, firstChain.slice(0, 3));
  const thirdChain = makeChain(3, 1_200, firstChain.slice(0, 2));
  const mock = createChainClient({
    chain: firstChain,
    logs: [
      makeLog(firstChain[1], 11),
      makeLog(firstChain[2], 12),
      makeLog(firstChain[3], 13),
      makeLog(secondChain[3], 23),
      makeLog(thirdChain[2], 32),
      makeLog(thirdChain[3], 33),
    ],
  });
  const deliveries: number[][] = [];
  const errors: Error[] = [];
  const reorgs: {
    commonAncestor: bigint;
    newBlocks: Hash[];
    oldBlocks: Hash[];
    removed: number[];
  }[] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fromBlock: 1n,
    fields: { logs: ["blockNumber", "logIndex"] },
    maxReorgDepth: 2,
    pollingInterval: 1,
    onData(response) {
      const indexes = response.data.logs.map((log) => log.logIndex);
      deliveries.push(indexes);
      if (indexes.includes(13)) mock.setChain(secondChain);
      if (indexes.includes(23)) mock.setChain(thirdChain);
    },
    onReorg(reorg) {
      reorgs.push({
        commonAncestor: reorg.commonAncestor.number,
        oldBlocks: reorg.oldBlocks.map((block) => block.hash),
        newBlocks: reorg.newBlocks.map((block) => block.hash),
        removed: reorg.removed.logs.map((log) => log.logIndex),
      });
    },
    onError(error) {
      errors.push(error);
    },
  });

  try {
    await waitFor(
      () => deliveries.some((indexes) => indexes.includes(33)),
      "second replacement branch delivery",
    );
    expect(deliveries).toEqual([[11, 12, 13], [23], [32, 33]]);
    expect(reorgs).toEqual([
      {
        commonAncestor: 2n,
        oldBlocks: [firstChain[3].hash],
        newBlocks: [secondChain[3].hash],
        removed: [13],
      },
      {
        commonAncestor: 1n,
        oldBlocks: [firstChain[2].hash, secondChain[3].hash],
        newBlocks: [thirdChain[2].hash, thirdChain[3].hash],
        removed: [23, 12],
      },
    ]);
    expect(errors).toEqual([]);
  } finally {
    unwatch();
  }
});

test("revalidates a replacement branch after an async onReorg", async () => {
  const originalChain = makeChain(2, 1_300);
  const firstReplacement = makeChain(2, 1_400, originalChain.slice(0, 2));
  const finalReplacement = makeChain(2, 1_500, originalChain.slice(0, 2));
  const mock = createChainClient({
    chain: originalChain,
    logs: [
      makeLog(originalChain[2], 12),
      makeLog(firstReplacement[2], 22),
      makeLog(finalReplacement[2], 32),
    ],
  });
  const events: string[] = [];
  let enterFirstReorg = () => {};
  const firstReorgEntered = new Promise<void>((resolve) => {
    enterFirstReorg = resolve;
  });
  let releaseFirstReorg = () => {};
  const firstReorgGate = new Promise<void>((resolve) => {
    releaseFirstReorg = resolve;
  });

  const unwatch = watchQueryLogs(mock.client, {
    fields: { logs: ["blockNumber", "logIndex"] },
    maxReorgDepth: 2,
    pollingInterval: 1,
    onData(response) {
      const index = response.data.logs[0]?.logIndex;
      events.push(`data:${String(index)}`);
      if (index === 12) mock.setChain(firstReplacement);
    },
    async onReorg(reorg) {
      const replacementHash = reorg.newBlocks[0]?.hash;
      if (replacementHash === firstReplacement[2].hash) {
        events.push("reorg:first");
        mock.setChain(finalReplacement);
        enterFirstReorg();
        await firstReorgGate;
      } else if (replacementHash === finalReplacement[2].hash) {
        events.push("reorg:final");
      }
    },
    onError(error) {
      events.push(`error:${error.name}`);
    },
  });

  try {
    await firstReorgEntered;
    expect(events).toEqual(["data:12", "reorg:first"]);

    releaseFirstReorg();
    await waitFor(
      () => events.includes("data:32"),
      "validated replacement data",
    );
    expect(events).toEqual([
      "data:12",
      "reorg:first",
      "error:ChainChangedError",
      "reorg:final",
      "data:32",
    ]);
    expect(events).not.toContain("data:22");
  } finally {
    releaseFirstReorg();
    unwatch();
  }
});

test("reduces ranges after -32005 responses and completes the scan", async () => {
  const chain = makeChain(4, 1_600);
  const mock = createChainClient({
    chain,
    logs: chain.slice(1).map((block) => makeLog(block)),
    maxRange: 1n,
  });
  const delivered: bigint[] = [];
  const errors: Error[] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fromBlock: 1n,
    fields: { logs: ["blockNumber"] },
    pollingInterval: 1,
    onData(response) {
      delivered.push(...response.data.logs.map((log) => log.blockNumber));
    },
    onError(error) {
      errors.push(error);
    },
  });

  try {
    await waitFor(() => delivered.length === 4, "adaptively ranged scan");
    expect(delivered).toEqual([1n, 2n, 3n, 4n]);
    expect(
      mock.limitExceededCalls.some((call) => call.method === "eth_queryBlocks"),
    ).toBe(true);
    expect(
      mock.limitExceededCalls.some((call) => call.method === "eth_queryLogs"),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    unwatch();
  }
});
