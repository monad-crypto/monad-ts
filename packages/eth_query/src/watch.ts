import type { Hex } from "viem";
import { hexToBigInt, numberToHex } from "viem";
import type { LightBlock, MethodName, TableName } from "./types.js";

type Row = Record<string, unknown>;
type Data = Partial<Record<TableName, Row[]>>;

export type WatchQueryResponse = {
  fromBlock: LightBlock;
  toBlock: LightBlock;
  cursorBlock: LightBlock;
  data: Data;
};

export type QueryReorg<data extends object> = {
  commonAncestor: LightBlock;
  oldBlocks: readonly LightBlock[];
  newBlocks: readonly LightBlock[];
  removed: data;
};

export type WatchQueryOptions<response extends { data: object }> = {
  /** Called with each non-empty formatted query page. */
  onData: (response: response) => void | Promise<void>;
  /** Called before replacement data when previously delivered rows are removed. */
  onReorg?: (reorg: QueryReorg<response["data"]>) => void | Promise<void>;
  /** Called for polling and callback errors. */
  onError?: (error: Error) => void;
  /** Polling interval in milliseconds. Defaults to the client's interval. */
  pollingInterval?: number;
  /** Maximum recoverable reorg depth. @default 64 */
  maxReorgDepth?: number;
  /** Moving block tag to follow. @default "latest" */
  targetBlock?: "latest" | "safe" | "finalized";
};

type WatchClient = {
  pollingInterval: number;
  request: (args: {
    method: MethodName;
    params: readonly [Record<string, unknown>];
  }) => Promise<unknown>;
};

export type WatchRuntimeParameters = {
  fields?: Record<string, readonly string[] | true | undefined>;
  filter?: object;
  fromBlock?: bigint;
  limit?: number;
  maxReorgDepth?: number;
  onData: (response: WatchQueryResponse) => void | Promise<void>;
  onError?: (error: Error) => void;
  onReorg?: (reorg: QueryReorg<Data>) => void | Promise<void>;
  pollingInterval?: number;
  targetBlock?: "latest" | "safe" | "finalized";
};

export type WatchQueryConfig = {
  formatResponse: (raw: unknown) => WatchQueryResponse;
  method: MethodName;
  primaryTable: TableName;
};

type RawLightBlock = LightBlock<Hex>;

type RawResponse = {
  fromBlock: RawLightBlock;
  toBlock: RawLightBlock;
  cursorBlock: RawLightBlock;
  data: Record<string, Row[]>;
};

type Delivery = {
  data: Data;
};

const identityFields = {
  blocks: ["number", "hash"],
  transactions: ["blockNumber", "blockHash", "hash"],
  logs: ["blockNumber", "blockHash", "transactionHash", "logIndex"],
  traces: ["blockNumber", "blockHash", "transactionHash", "traceAddress"],
  transfers: ["blockNumber", "blockHash", "transactionHash", "traceAddress"],
} as const satisfies Record<TableName, readonly string[]>;

const headerFields = ["number", "hash", "parentHash"] as const;
const scanRangeSize = 1_000n;

class WatchConsistencyError extends Error {
  override name = "WatchConsistencyError";
}

class ChainChangedError extends Error {
  override name = "ChainChangedError";
}

export class ReorgBeyondMaxDepthError extends Error {
  override name = "ReorgBeyondMaxDepthError";

  constructor(public readonly maxReorgDepth: number) {
    super(
      `Reorg exceeded maxReorgDepth (${maxReorgDepth}): unable to reconcile`,
    );
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isLimitExceeded(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === -32005
  );
}

function formatLightBlock(block: RawLightBlock): LightBlock {
  return {
    number: hexToBigInt(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
  };
}

function parseRawResponse(raw: unknown): RawResponse {
  return raw as RawResponse;
}

async function request(
  client: WatchClient,
  method: MethodName,
  parameters: Record<string, unknown>,
): Promise<RawResponse> {
  return parseRawResponse(
    await client.request({ method, params: [parameters] }),
  );
}

function headerFromRow(row: Row): LightBlock {
  if (
    typeof row.number !== "string" ||
    typeof row.hash !== "string" ||
    typeof row.parentHash !== "string"
  ) {
    throw new WatchConsistencyError("Block header response is missing fields");
  }
  return {
    number: hexToBigInt(row.number as Hex),
    hash: row.hash as Hex,
    parentHash: row.parentHash as Hex,
  };
}

function validateHeaderSequence(headers: readonly LightBlock[]) {
  for (let index = 1; index < headers.length; index++) {
    const previous = headers[index - 1];
    const current = headers[index];
    if (
      !previous ||
      !current ||
      current.number !== previous.number + 1n ||
      current.parentHash !== previous.hash
    ) {
      throw new WatchConsistencyError("Block header range is not contiguous");
    }
  }
}

async function resolveTarget(
  client: WatchClient,
  targetBlock: "latest" | "safe" | "finalized",
): Promise<LightBlock> {
  const raw = await request(client, "eth_queryBlocks", {
    fields: { blocks: headerFields },
    fromBlock: targetBlock,
    toBlock: targetBlock,
    limit: "0x1",
    order: "asc",
  });
  return formatLightBlock(raw.toBlock);
}

async function fetchHeaders(
  client: WatchClient,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<LightBlock[]> {
  if (fromBlock > toBlock) return [];

  const headers: LightBlock[] = [];
  let nextBlock = fromBlock;
  let rangeSize = scanRangeSize;

  while (nextBlock <= toBlock) {
    const rangeEnd =
      nextBlock + rangeSize - 1n < toBlock
        ? nextBlock + rangeSize - 1n
        : toBlock;
    let raw: RawResponse;
    try {
      raw = await request(client, "eth_queryBlocks", {
        fields: { blocks: headerFields },
        fromBlock: numberToHex(nextBlock),
        toBlock: numberToHex(rangeEnd),
        limit: numberToHex(rangeEnd - nextBlock + 1n),
        order: "asc",
      });
    } catch (error) {
      if (isLimitExceeded(error) && rangeSize > 1n) {
        rangeSize = rangeSize / 2n;
        continue;
      }
      throw error;
    }
    const from = formatLightBlock(raw.fromBlock);
    const to = formatLightBlock(raw.toBlock);
    const cursor = formatLightBlock(raw.cursorBlock);

    if (from.number !== nextBlock || to.number !== rangeEnd) {
      throw new WatchConsistencyError(
        "Block header response does not match requested range",
      );
    }
    if (cursor.number < nextBlock || cursor.number > rangeEnd) {
      throw new WatchConsistencyError(
        "Block header cursor is outside the requested range",
      );
    }

    const rows = raw.data.blocks ?? [];
    const pageHeaders = rows.map(headerFromRow);
    if (
      pageHeaders.length === 0 ||
      pageHeaders[0]?.number !== nextBlock ||
      pageHeaders.at(-1)?.number !== cursor.number
    ) {
      throw new WatchConsistencyError(
        "Block header rows do not cover the scanned range",
      );
    }
    validateHeaderSequence(pageHeaders);
    if (
      headers.length > 0 &&
      pageHeaders[0]?.parentHash !== headers.at(-1)?.hash
    ) {
      throw new ChainChangedError("Block header pages do not connect");
    }
    headers.push(...pageHeaders);

    if (cursor.number === toBlock) break;
    nextBlock = cursor.number + 1n;
  }

  return headers;
}

function includedTables(
  primaryTable: TableName,
  fields: Record<string, readonly string[] | true | undefined> | undefined,
): TableName[] {
  const tables = new Set<TableName>([primaryTable]);
  for (const table of Object.keys(fields ?? {}) as TableName[]) {
    if (fields?.[table] !== undefined) tables.add(table);
  }
  return [...tables];
}

function augmentFields(
  primaryTable: TableName,
  fields: Record<string, readonly string[] | true | undefined> | undefined,
): Record<string, readonly string[] | true> {
  const result: Record<string, readonly string[] | true> = {};
  for (const table of includedTables(primaryTable, fields)) {
    const selection = fields?.[table];
    if (
      selection === true ||
      (selection === undefined && table === primaryTable)
    ) {
      result[table] = true;
      continue;
    }
    result[table] = [
      ...new Set([...(selection ?? []), ...identityFields[table]]),
    ];
  }
  return result;
}

function selectionFor(
  table: TableName,
  primaryTable: TableName,
  fields: Record<string, readonly string[] | true | undefined> | undefined,
): readonly string[] | true | undefined {
  const selection = fields?.[table];
  if (selection !== undefined) return selection;
  return table === primaryTable ? true : undefined;
}

function projectRow(row: Row, selection: readonly string[] | true): Row {
  if (selection === true) return { ...row };
  return Object.fromEntries(selection.map((field) => [field, row[field]]));
}

function projectData(
  data: Data,
  primaryTable: TableName,
  fields: Record<string, readonly string[] | true | undefined> | undefined,
): Data {
  const result: Data = {};
  for (const table of includedTables(primaryTable, fields)) {
    const selection = selectionFor(table, primaryTable, fields);
    if (selection === undefined) continue;
    result[table] = (data[table] ?? []).map((row) =>
      projectRow(row, selection),
    );
  }
  return result;
}

function projectResponse(
  response: WatchQueryResponse,
  primaryTable: TableName,
  fields: Record<string, readonly string[] | true | undefined> | undefined,
): WatchQueryResponse {
  return {
    ...response,
    data: projectData(response.data, primaryTable, fields),
  };
}

function rowBlockNumber(table: TableName, row: Row): bigint {
  const number = table === "blocks" ? row.number : row.blockNumber;
  if (typeof number !== "bigint") {
    throw new WatchConsistencyError(
      `Watch response ${table} row is missing its block number`,
    );
  }
  return number;
}

function filterData(
  data: Data,
  tables: readonly TableName[],
  predicate: (number: bigint) => boolean,
): Data {
  const result: Data = {};
  for (const table of tables) {
    result[table] = (data[table] ?? []).filter((row) =>
      predicate(rowBlockNumber(table, row)),
    );
  }
  return result;
}

function removedData(
  deliveries: readonly Delivery[],
  commonAncestor: bigint,
  primaryTable: TableName,
  fields: Record<string, readonly string[] | true | undefined> | undefined,
): Data {
  const tables = includedTables(primaryTable, fields);
  const result: Data = Object.fromEntries(
    tables.map((table) => [table, []]),
  ) as Data;

  for (const delivery of [...deliveries].reverse()) {
    for (const table of tables) {
      const rows = (delivery.data[table] ?? [])
        .filter((row) => rowBlockNumber(table, row) > commonAncestor)
        .reverse();
      result[table]?.push(...rows);
    }
  }
  return projectData(result, primaryTable, fields);
}

function retainDeliveries(
  deliveries: readonly Delivery[],
  tables: readonly TableName[],
  predicate: (number: bigint) => boolean,
): Delivery[] {
  return deliveries
    .map((delivery) => ({
      data: filterData(delivery.data, tables, predicate),
    }))
    .filter((delivery) =>
      tables.some((table) => (delivery.data[table]?.length ?? 0) > 0),
    );
}

function trimHeaders(
  headers: readonly LightBlock[],
  tip: bigint,
  maxReorgDepth: number,
): LightBlock[] {
  const minimum = tip - BigInt(maxReorgDepth);
  return headers.filter(
    (header) => header.number >= minimum && header.number <= tip,
  );
}

function canonicalMap(headers: readonly LightBlock[]) {
  return new Map(headers.map((header) => [header.number, header]));
}

function validateResponse(
  response: WatchQueryResponse,
  expectedFrom: bigint,
  expectedTo: bigint,
  canonical: ReadonlyMap<bigint, LightBlock>,
) {
  if (
    response.fromBlock.number !== expectedFrom ||
    response.toBlock.number !== expectedTo
  ) {
    throw new WatchConsistencyError(
      "Watch response does not match requested range",
    );
  }
  if (
    response.cursorBlock.number < expectedFrom ||
    response.cursorBlock.number > expectedTo
  ) {
    throw new WatchConsistencyError(
      "Watch cursor is outside the requested range",
    );
  }
  for (const block of [
    response.fromBlock,
    response.toBlock,
    response.cursorBlock,
  ]) {
    const expected = canonical.get(block.number);
    if (expected && expected.hash !== block.hash) {
      throw new ChainChangedError(
        "Watch response changed while the range was being scanned",
      );
    }
  }
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function startWatchQuery(
  client: WatchClient,
  config: WatchQueryConfig,
  parameters: WatchRuntimeParameters,
): () => void {
  const {
    fields,
    filter,
    fromBlock,
    limit,
    maxReorgDepth = 64,
    onData,
    onError,
    onReorg,
    pollingInterval = client.pollingInterval,
    targetBlock = "latest",
  } = parameters;
  if (!Number.isInteger(maxReorgDepth) || maxReorgDepth < 1) {
    throw new RangeError("maxReorgDepth must be a positive integer");
  }
  if (!Number.isFinite(pollingInterval) || pollingInterval < 0) {
    throw new RangeError("pollingInterval must be a non-negative number");
  }

  const tables = includedTables(config.primaryTable, fields);
  const internalFields = augmentFields(config.primaryTable, fields);
  const query = {
    ...(filter !== undefined && { filter }),
    fields: internalFields,
    ...(limit !== undefined && { limit: numberToHex(limit) }),
    order: "asc",
  };

  let active = true;
  let initialized = false;
  let startFloor = fromBlock;
  let nextBlock = fromBlock;
  let checkpoint: LightBlock | undefined;
  let headers: LightBlock[] = [];
  let deliveries: Delivery[] = [];

  const commitProgress = (
    cursor: LightBlock,
    canonical: readonly LightBlock[],
  ) => {
    checkpoint = cursor;
    nextBlock = cursor.number + 1n;
    const mergedHeaders = new Map(
      headers.map((header) => [header.number, header]),
    );
    for (const header of canonical) {
      if (header.number <= cursor.number) {
        mergedHeaders.set(header.number, header);
      }
    }
    headers = trimHeaders(
      [...mergedHeaders.values()].sort((a, b) =>
        a.number < b.number ? -1 : a.number > b.number ? 1 : 0,
      ),
      cursor.number,
      maxReorgDepth,
    );
    const minimum = cursor.number - BigInt(maxReorgDepth);
    deliveries = retainDeliveries(
      deliveries,
      tables,
      (number) => number >= minimum,
    );
  };

  const scanData = async (from: bigint, to: bigint) => {
    if (from > to) return;
    let pageFrom = from;
    let rangeSize = scanRangeSize;

    while (active && pageFrom <= to) {
      const rangeEnd =
        pageFrom + rangeSize - 1n < to ? pageFrom + rangeSize - 1n : to;
      const canonical = await fetchHeaders(client, pageFrom, rangeEnd);
      const firstHeader = canonical[0];
      if (
        checkpoint &&
        pageFrom === checkpoint.number + 1n &&
        firstHeader?.parentHash !== checkpoint.hash
      ) {
        throw new ChainChangedError(
          "Watch range does not connect to its checkpoint",
        );
      }

      let raw: RawResponse;
      try {
        raw = await request(client, config.method, {
          ...query,
          fromBlock: numberToHex(pageFrom),
          toBlock: numberToHex(rangeEnd),
        });
      } catch (error) {
        if (isLimitExceeded(error) && rangeSize > 1n) {
          rangeSize = rangeSize / 2n;
          continue;
        }
        throw error;
      }
      if (!active) return;
      const enriched = config.formatResponse(raw);
      validateResponse(enriched, pageFrom, rangeEnd, canonicalMap(canonical));

      if ((enriched.data[config.primaryTable]?.length ?? 0) > 0) {
        const projected = projectResponse(
          enriched,
          config.primaryTable,
          fields,
        );
        await onData(projected);
        if (!active) return;
        deliveries.push({ data: enriched.data });
      }

      commitProgress(enriched.cursorBlock, canonical);
      if (enriched.cursorBlock.number === to) break;
      pageFrom = enriched.cursorBlock.number + 1n;
    }
  };

  const initialize = async () => {
    const target = await resolveTarget(client, targetBlock);
    startFloor ??= target.number;
    nextBlock ??= startFloor;
    const firstBlock = nextBlock;
    const hasProgress = firstBlock > startFloor;

    if (hasProgress) {
      if (
        checkpoint &&
        (target.number < checkpoint.number ||
          (target.number === checkpoint.number &&
            target.hash !== checkpoint.hash))
      ) {
        initialized = true;
        throw new ChainChangedError(
          "Chain changed while historical data was being scanned",
        );
      }
      if (firstBlock <= target.number) {
        try {
          await scanData(firstBlock, target.number);
        } catch (error) {
          if (error instanceof ChainChangedError) initialized = true;
          throw error;
        }
      }
      return;
    }

    const seedFrom =
      target.number > BigInt(maxReorgDepth)
        ? target.number - BigInt(maxReorgDepth)
        : 0n;
    const canonical = await fetchHeaders(client, seedFrom, target.number);
    const canonicalTarget = canonical.at(-1);
    if (!canonicalTarget || canonicalTarget.hash !== target.hash) {
      throw new ChainChangedError(
        "Target changed while watch history was initialized",
      );
    }
    headers = canonical;

    if (firstBlock > target.number) {
      checkpoint = canonicalTarget;
      return;
    }

    checkpoint = canonical.find((header) => header.number === firstBlock - 1n);
    await scanData(firstBlock, target.number);
  };

  const poll = async () => {
    const target = await resolveTarget(client, targetBlock);
    const oldest = headers[0];
    if (!oldest || target.number < oldest.number) {
      throw new ReorgBeyondMaxDepthError(maxReorgDepth);
    }
    const comparisonEnd =
      checkpoint && checkpoint.number < target.number
        ? checkpoint.number
        : target.number;
    const canonicalHistory = await fetchHeaders(
      client,
      oldest.number,
      comparisonEnd,
    );
    if (!active) return;
    const historyByNumber = canonicalMap(canonicalHistory);
    const checkpointIsCanonical =
      checkpoint === undefined ||
      (target.number >= checkpoint.number &&
        historyByNumber.get(checkpoint.number)?.hash === checkpoint.hash);

    if (!checkpointIsCanonical) {
      const commonAncestor = [...headers]
        .reverse()
        .find(
          (header) =>
            header.number <= target.number &&
            historyByNumber.get(header.number)?.hash === header.hash,
        );
      if (!commonAncestor) {
        throw new ReorgBeyondMaxDepthError(maxReorgDepth);
      }

      const oldBlocks = headers.filter(
        (header) => header.number > commonAncestor.number,
      );
      const newBlocksEnd =
        commonAncestor.number + BigInt(maxReorgDepth) < target.number
          ? commonAncestor.number + BigInt(maxReorgDepth)
          : target.number;
      const newBlocks = await fetchHeaders(
        client,
        commonAncestor.number + 1n,
        newBlocksEnd,
      );
      if (
        newBlocks.length > 0 &&
        newBlocks[0]?.parentHash !== commonAncestor.hash
      ) {
        throw new ChainChangedError(
          "Replacement branch changed during reconciliation",
        );
      }
      const removed = removedData(
        deliveries,
        commonAncestor.number,
        config.primaryTable,
        fields,
      );
      await onReorg?.({ commonAncestor, oldBlocks, newBlocks, removed });
      if (!active) return;

      const validatedNewBlocks = await fetchHeaders(
        client,
        commonAncestor.number + 1n,
        newBlocksEnd,
      );
      if (
        validatedNewBlocks.length !== newBlocks.length ||
        validatedNewBlocks.some(
          (header, index) => header.hash !== newBlocks[index]?.hash,
        )
      ) {
        throw new ChainChangedError(
          "Replacement branch changed during reorg notification",
        );
      }

      const replacementStart =
        startFloor !== undefined && startFloor > commonAncestor.number + 1n
          ? startFloor
          : commonAncestor.number + 1n;
      let recoveryHeaders: LightBlock[];
      if (replacementStart <= target.number) {
        const recoveryTip = replacementStart - 1n;
        const recoveryStart =
          recoveryTip > BigInt(maxReorgDepth)
            ? recoveryTip - BigInt(maxReorgDepth)
            : 0n;
        recoveryHeaders = await fetchHeaders(
          client,
          recoveryStart,
          recoveryTip,
        );
      } else {
        const seedFrom =
          target.number > BigInt(maxReorgDepth)
            ? target.number - BigInt(maxReorgDepth)
            : 0n;
        recoveryHeaders = await fetchHeaders(client, seedFrom, target.number);
      }

      const expectedHeaders = canonicalMap([commonAncestor, ...newBlocks]);
      const branchChanged = recoveryHeaders.some((header) => {
        const expected = expectedHeaders.get(header.number);
        return expected !== undefined && expected.hash !== header.hash;
      });
      if (
        branchChanged ||
        (replacementStart > target.number &&
          recoveryHeaders.at(-1)?.hash !== target.hash)
      ) {
        throw new ChainChangedError(
          "Replacement branch changed during reorg notification",
        );
      }

      deliveries = retainDeliveries(
        deliveries,
        tables,
        (number) => number <= commonAncestor.number,
      );
      nextBlock = replacementStart;
      checkpoint = recoveryHeaders.at(-1);
      headers = trimHeaders(
        recoveryHeaders,
        checkpoint?.number ?? commonAncestor.number,
        maxReorgDepth,
      );
      if (replacementStart <= target.number) {
        await scanData(replacementStart, target.number);
      }
      return;
    }

    if (nextBlock !== undefined && nextBlock <= target.number) {
      await scanData(nextBlock, target.number);
      return;
    }

    const seedFrom =
      target.number > BigInt(maxReorgDepth)
        ? target.number - BigInt(maxReorgDepth)
        : 0n;
    const canonicalTarget =
      comparisonEnd === target.number && oldest.number === seedFrom
        ? canonicalHistory
        : await fetchHeaders(client, seedFrom, target.number);
    if (canonicalTarget.at(-1)?.hash !== target.hash) {
      throw new ChainChangedError("Target changed while watch was polling");
    }
    checkpoint = canonicalTarget.at(-1);
    headers = canonicalTarget;
  };

  const run = async () => {
    while (active) {
      try {
        if (!initialized) {
          await initialize();
          initialized = true;
        } else {
          await poll();
        }
      } catch (error) {
        if (!active) return;
        const cause = asError(error);
        try {
          onError?.(cause);
        } catch {
          // Error handlers must not create an unhandled rejection in the poller.
        }
        if (
          cause instanceof ReorgBeyondMaxDepthError ||
          cause instanceof WatchConsistencyError
        ) {
          active = false;
          return;
        }
      }
      if (active) await sleep(pollingInterval);
    }
  };

  void run();
  return () => {
    active = false;
  };
}

export function asWatchClient(client: unknown): WatchClient {
  return client as WatchClient;
}
