import { expect, test } from "bun:test";
import { hasReorg, watchQueryLogs } from "./index.js";
import type { QueryLogsResponse } from "./types.js";

type Hash = `0x${string}`;

type TestBlock = {
  hash: Hash;
  number: bigint;
  parentHash: Hash;
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

const zeroHash = `0x${"0".repeat(64)}` as Hash;
const address = `0x${"1".repeat(40)}` as const;

function hash(value: number): Hash {
  return `0x${value.toString(16).padStart(64, "0")}`;
}

function makeChain(
  tip: number,
  hashOffset: number,
  prefix: readonly TestBlock[] = [],
): TestBlock[] {
  const blocks = [...prefix];
  for (let number = blocks.length; number <= tip; number++) {
    blocks.push({
      number: BigInt(number),
      hash: hash(hashOffset + number),
      parentHash: blocks[number - 1]?.hash ?? zeroHash,
    });
  }
  return blocks;
}

function makeLog(block: TestBlock, logIndex: number): TestLog {
  return {
    address,
    blockHash: block.hash,
    blockNumber: block.number,
    data: hash(10_000 + logIndex),
    logIndex,
    topics: [hash(20_000 + logIndex)],
    transactionHash: hash(30_000 + logIndex),
    transactionIndex: 0,
  };
}

function quantity(value: bigint | number): `0x${string}` {
  return `0x${BigInt(value).toString(16)}`;
}

function blockNumber(value: unknown, latest: bigint): bigint {
  if (value === "latest") return latest;
  if (typeof value === "string" && value.startsWith("0x")) return BigInt(value);
  throw new Error(`Unsupported block number: ${String(value)}`);
}

function project(row: Record<string, unknown>, fields: unknown) {
  if (fields === true || fields === undefined) return { ...row };
  if (!Array.isArray(fields)) return {};
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function rawBlock(block: TestBlock) {
  return {
    number: quantity(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
  };
}

function rawLog(log: TestLog) {
  return {
    ...log,
    blockNumber: quantity(log.blockNumber),
    logIndex: quantity(log.logIndex),
    transactionIndex: quantity(log.transactionIndex),
  };
}

function createClient(options: {
  chain: TestBlock[];
  logs?: TestLog[];
  pageCursor?: (fromBlock: bigint, toBlock: bigint) => bigint;
}) {
  let chain = options.chain;
  const calls: RpcCall[] = [];
  const logsByHash = new Map<Hash, TestLog[]>();

  for (const log of options.logs ?? []) {
    const logs = logsByHash.get(log.blockHash) ?? [];
    logs.push(log);
    logsByHash.set(log.blockHash, logs);
  }

  const client = {
    pollingInterval: 1,
    request: async ({
      method,
      params,
    }: {
      method: string;
      params: readonly [Record<string, unknown>];
    }) => {
      const request = params[0];
      calls.push({ method, request: structuredClone(request) });
      if (method !== "eth_queryLogs") {
        throw new Error(`Unexpected RPC method: ${method}`);
      }

      const latest = BigInt(chain.length - 1);
      const fromBlock = blockNumber(request.fromBlock, latest);
      const toBlock = blockNumber(request.toBlock, latest);
      if (fromBlock > toBlock) throw new Error("Invalid query range");

      const from = chain[Number(fromBlock)];
      const to = chain[Number(toBlock)];
      if (!from || !to) throw new Error("Requested block is unavailable");

      const cursorBlock = options.pageCursor?.(fromBlock, toBlock) ?? toBlock;
      const cursor = chain[Number(cursorBlock)];
      if (!cursor || cursorBlock < fromBlock || cursorBlock > toBlock) {
        throw new Error("Invalid test cursor");
      }

      const fields = (request.fields ?? {}) as Record<string, unknown>;
      const pageBlocks = chain.slice(
        Number(fromBlock),
        Number(cursorBlock) + 1,
      );
      const logs = pageBlocks.flatMap(
        (block) => logsByHash.get(block.hash) ?? [],
      );
      const data: Record<string, unknown> = {
        logs: logs.map((log) => project(rawLog(log), fields.logs)),
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
    calls,
    client,
    setChain(nextChain: TestBlock[]) {
      chain = nextChain;
    },
  };
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

test("detects overlapping and adjacent reorgs", () => {
  const chain = makeChain(2, 100);
  const replacement = makeChain(2, 200, chain.slice(0, 2));
  const disconnected = { ...chain[2], parentHash: replacement[2].hash };

  expect(hasReorg(chain[1], chain[1])).toBe(false);
  expect(hasReorg(chain[1], replacement[2])).toBe(false);
  expect(hasReorg(chain[1], disconnected)).toBe(true);
  expect(hasReorg(chain[0], chain[2])).toBe(true);
  expect(hasReorg(chain[2], replacement[2])).toBe(true);
});

test("queries latest/latest first and paginates the underlying method", async () => {
  const chain = makeChain(5, 300);
  const mock = createClient({
    chain: chain.slice(0, 2),
    logs: [makeLog(chain[1], 11), makeLog(chain[2], 12), makeLog(chain[5], 15)],
    pageCursor(fromBlock, toBlock) {
      if (fromBlock === 1n && toBlock === 5n) return 2n;
      if (fromBlock === 3n && toBlock === 5n) return 4n;
      return toBlock;
    },
  });
  const delivered: bigint[][] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fields: { logs: ["blockNumber"] },
    pollingInterval: 1,
    onData(response: BlockNumberResponse) {
      delivered.push(response.data.logs.map((log) => log.blockNumber));
      if (delivered.length === 1) mock.setChain(chain);
    },
  });

  try {
    await waitFor(() => delivered.length === 3, "all live pages");
    expect(delivered).toEqual([[1n], [2n], [5n]]);
    expect(mock.calls.slice(0, 4).map((call) => call.method)).toEqual([
      "eth_queryLogs",
      "eth_queryLogs",
      "eth_queryLogs",
      "eth_queryLogs",
    ]);
    expect(mock.calls.slice(0, 4).map((call) => call.request)).toMatchObject([
      { fromBlock: "latest", toBlock: "latest", order: "asc" },
      { fromBlock: "0x1", toBlock: "latest", order: "asc" },
      { fromBlock: "0x3", toBlock: "0x5", order: "asc" },
      { fromBlock: "0x5", toBlock: "0x5", order: "asc" },
    ]);
  } finally {
    unwatch();
  }
});

test("rewinds whole pages through the underlying method and replays", async () => {
  const oldChain = makeChain(5, 400);
  const newChain = makeChain(5, 500, oldChain.slice(0, 3));
  const logs = [
    makeLog(oldChain[1], 11),
    makeLog(oldChain[2], 12),
    makeLog(oldChain[3], 13),
    makeLog(oldChain[4], 14),
    makeLog(oldChain[5], 15),
    makeLog(newChain[3], 23),
    makeLog(newChain[4], 24),
    makeLog(newChain[5], 25),
  ];
  const mock = createClient({ chain: oldChain.slice(0, 2), logs });
  const delivered: number[][] = [];
  const removed: number[][] = [];

  const unwatch = watchQueryLogs(mock.client, {
    fields: { logs: ["blockNumber", "logIndex"] },
    pollingInterval: 1,
    onData(response) {
      const indexes = response.data.logs.map((log) => log.logIndex);
      delivered.push(indexes);
      if (indexes.includes(11)) mock.setChain(oldChain);
      if (indexes.includes(15)) mock.setChain(newChain);
    },
    onReorg(reorg) {
      removed.push(reorg.removed.logs.map((log) => log.logIndex));
    },
  });

  try {
    await waitFor(
      () => delivered.some((indexes) => indexes.includes(25)),
      "replacement page",
    );
    expect(delivered).toEqual([[11], [12, 13, 14, 15], [12, 23, 24, 25]]);
    expect(removed).toEqual([[15, 14, 13, 12]]);
    expect(mock.calls.every((call) => call.method === "eth_queryLogs")).toBe(
      true,
    );
    expect(
      mock.calls.some(
        (call) =>
          call.request.fromBlock === "0x1" && call.request.toBlock === "0x1",
      ),
    ).toBe(true);
  } finally {
    unwatch();
  }
});
