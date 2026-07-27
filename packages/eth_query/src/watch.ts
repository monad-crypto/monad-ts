import type { LightBlock, TableName } from "./types.js";

type WatchRequest = {
  fields?: Partial<Record<TableName, readonly string[] | true | undefined>>;
  filter?: object;
  limit?: number;
};

type WatchTableData = Partial<Record<TableName, readonly object[]>>;

type WatchRange = {
  fromBlock: bigint | "latest";
  toBlock: bigint | "latest";
  order: "asc";
};

const tableNames = [
  "blocks",
  "transactions",
  "logs",
  "traces",
  "transfers",
] as const satisfies readonly TableName[];

export type WatchQueryResponse<data extends object = object> = {
  fromBlock: LightBlock;
  toBlock: LightBlock;
  cursorBlock: LightBlock;
  data: data;
};

export type WatchQueryOptions<response extends WatchQueryResponse> = {
  /** Called with each non-empty formatted query page. */
  onData: (response: response) => void | Promise<void>;
  /** Called before replaying pages rewound by a reorg. */
  onReorg?: (reorg: { removed: response["data"] }) => void | Promise<void>;
  /** Polling interval in milliseconds. Defaults to the client's interval. */
  pollingInterval?: number;
  /** Maximum page-rewind distance in blocks. @default 64 */
  maxReorgDepth?: number;
};

export function hasReorg(previous: LightBlock, next: LightBlock): boolean {
  return next.number === previous.number
    ? next.hash !== previous.hash
    : next.number !== previous.number + 1n || next.parentHash !== previous.hash;
}

function addRequiredBlockNumberFields(
  primaryTable: TableName,
  tables: readonly TableName[],
  fields: WatchRequest["fields"],
): NonNullable<WatchRequest["fields"]> {
  const result: NonNullable<WatchRequest["fields"]> = {};
  for (const table of tables) {
    const selection = fields?.[table];
    result[table] =
      selection === true || (selection === undefined && table === primaryTable)
        ? true
        : [
            ...new Set([
              ...(selection ?? []),
              table === "blocks" ? "number" : "blockNumber",
            ]),
          ];
  }
  return result;
}

function rowsForTable(data: object, table: TableName): readonly object[] {
  return (data as WatchTableData)[table] ?? [];
}

function hasRows(data: object, table: TableName): boolean {
  return rowsForTable(data, table).length > 0;
}

function removeRequiredBlockNumberFields<data extends object>(
  data: data,
  primaryTable: TableName,
  tables: readonly TableName[],
  fields: WatchRequest["fields"],
): data {
  const result: WatchTableData = {};
  for (const table of tables) {
    const selection =
      fields?.[table] ?? (table === primaryTable ? true : undefined);
    if (selection === undefined) continue;
    const blockNumberField = table === "blocks" ? "number" : "blockNumber";
    const removeBlockNumber =
      selection !== true && !selection.includes(blockNumberField);
    result[table] = rowsForTable(data, table).map((row) => {
      const copy = { ...row };
      if (removeBlockNumber) Reflect.deleteProperty(copy, blockNumberField);
      return copy;
    });
  }
  return result as data;
}

function rowBlockNumber(table: TableName, row: object): bigint {
  const number =
    table === "blocks"
      ? "number" in row
        ? row.number
        : undefined
      : "blockNumber" in row
        ? row.blockNumber
        : undefined;
  if (typeof number !== "bigint") {
    throw new Error(`Watch response ${table} row is missing its block number`);
  }
  return number;
}

function filterRowsByBlockNumber<data extends object>(
  data: data,
  tables: readonly TableName[],
  include: (number: bigint) => boolean,
): data {
  const result: WatchTableData = {};
  for (const table of tables) {
    result[table] = rowsForTable(data, table).filter((row) =>
      include(rowBlockNumber(table, row)),
    );
  }
  return result as data;
}

function collectReorgedRows<data extends object>(
  deliveries: readonly data[],
  ancestorBlockNumber: bigint,
  tables: readonly TableName[],
): data {
  const removed: WatchTableData = {};
  const reversedDeliveries = [...deliveries].reverse();
  for (const table of tables) {
    removed[table] = reversedDeliveries.flatMap((delivery) =>
      rowsForTable(delivery, table)
        .filter((row) => rowBlockNumber(table, row) > ancestorBlockNumber)
        .reverse(),
    );
  }
  return removed as data;
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function startWatchQuery<
  request extends WatchRequest,
  response extends WatchQueryResponse,
  primaryTable extends TableName & keyof response["data"],
>(
  query: (
    request: request & {
      fromBlock: bigint | "latest";
      toBlock: bigint | "latest";
      order: "asc";
    },
  ) => Promise<response>,
  primaryTable: primaryTable,
  parameters: request & WatchQueryOptions<response>,
  defaultPollingInterval: number,
): () => void {
  const {
    maxReorgDepth = 64,
    onData,
    onReorg,
    pollingInterval = defaultPollingInterval,
    ...queryParameters
  } = parameters;
  if (!Number.isInteger(maxReorgDepth) || maxReorgDepth < 1) {
    throw new RangeError("maxReorgDepth must be a positive integer");
  }
  if (!Number.isFinite(pollingInterval) || pollingInterval < 0) {
    throw new RangeError("pollingInterval must be a non-negative number");
  }

  const requestedFields = parameters.fields;
  const tables = [
    ...new Set([
      primaryTable,
      ...tableNames.filter(
        (table) => requestedFields && Object.hasOwn(requestedFields, table),
      ),
    ]),
  ];
  const internalFields = addRequiredBlockNumberFields(
    primaryTable,
    tables,
    requestedFields,
  );
  let active = true;
  let tip: LightBlock | undefined;
  let checkpoints: Pick<LightBlock, "number" | "hash">[] = [];
  let deliveries: response["data"][] = [];

  const request = (
    fromBlock: bigint | "latest",
    toBlock: bigint | "latest",
  ) => {
    const internalRequest: WatchRequest & WatchRange = {
      ...queryParameters,
      fields: internalFields,
      fromBlock,
      toBlock,
      order: "asc",
    };
    return query(internalRequest as request & WatchRange);
  };

  const remember = (response: response) => {
    const remembered = new Map(
      checkpoints.map((block) => [block.number, block]),
    );
    for (const block of [response.fromBlock, response.cursorBlock]) {
      if (block.number > 0n) {
        remembered.set(block.number - 1n, {
          number: block.number - 1n,
          hash: block.parentHash,
        });
      }
      remembered.set(block.number, block);
    }
    const minimum = response.cursorBlock.number - BigInt(maxReorgDepth);
    checkpoints = [...remembered.values()]
      .filter((block) => block.number >= minimum)
      .sort((a, b) => (a.number < b.number ? -1 : 1));
  };

  const retainDeliveries = (predicate: (number: bigint) => boolean) => {
    deliveries = deliveries
      .map((data) => filterRowsByBlockNumber(data, tables, predicate))
      .filter((data) => hasRows(data, primaryTable));
  };

  const commit = async (response: response) => {
    if (!active) return;
    if (hasRows(response.data, primaryTable)) {
      await onData({
        ...response,
        data: removeRequiredBlockNumberFields(
          response.data,
          primaryTable,
          tables,
          requestedFields,
        ),
      });
      if (!active) return;
      deliveries.push(response.data);
    }
    tip = response.cursorBlock;
    remember(response);
    const minimum = tip.number - BigInt(maxReorgDepth);
    retainDeliveries((number) => number >= minimum);
  };

  const reconcile = async () => {
    const previousTip = tip;
    if (!previousTip) return;

    let ancestor: LightBlock | undefined;
    for (const checkpoint of [...checkpoints].reverse()) {
      if (previousTip.number - checkpoint.number > BigInt(maxReorgDepth)) {
        continue;
      }
      const response = await request(checkpoint.number, checkpoint.number);
      if (!active) return;
      if (response.fromBlock.hash === checkpoint.hash) {
        ancestor = response.fromBlock;
        break;
      }
    }
    if (!ancestor) {
      throw new Error(
        `Reorg exceeded maxReorgDepth (${maxReorgDepth}): unable to reconcile`,
      );
    }

    await onReorg?.({
      removed: removeRequiredBlockNumberFields(
        collectReorgedRows(deliveries, ancestor.number, tables),
        primaryTable,
        tables,
        requestedFields,
      ),
    });
    if (!active) return;

    retainDeliveries((number) => number <= ancestor.number);
    checkpoints = checkpoints.filter(
      (checkpoint) => checkpoint.number <= ancestor.number,
    );
    tip = ancestor;
  };

  const initialize = async () => {
    const response = await request("latest", "latest");
    if (!active) return;
    if (
      response.fromBlock.number !== response.toBlock.number ||
      response.cursorBlock.number !== response.toBlock.number
    ) {
      throw new Error("Initial watch response did not resolve one block");
    }
    await commit(response);
  };

  const poll = async () => {
    if (!tip) return;

    const previousTip = tip;
    // TODO: If latest is below previousTip.number, query latest/latest and
    // reconcile the rollback instead of throwing an invalid-range error.
    const firstPage = await request(previousTip.number, "latest");
    if (!active) return;
    if (
      hasReorg(previousTip, firstPage.fromBlock) ||
      (firstPage.cursorBlock.number === firstPage.fromBlock.number + 1n &&
        hasReorg(firstPage.fromBlock, firstPage.cursorBlock))
    ) {
      await reconcile();
      return;
    }

    const target = firstPage.toBlock;
    if (firstPage.cursorBlock.number > previousTip.number) {
      await commit({
        ...firstPage,
        data: filterRowsByBlockNumber(
          firstPage.data,
          tables,
          (number) => number > previousTip.number,
        ),
      });
      if (!active) return;
    }

    while (active && tip && tip.number < target.number) {
      const page = await request(tip.number + 1n, target.number);
      if (!active) return;
      if (
        hasReorg(tip, page.fromBlock) ||
        hasReorg(target, page.toBlock) ||
        (page.cursorBlock.number === page.fromBlock.number + 1n &&
          hasReorg(page.fromBlock, page.cursorBlock))
      ) {
        await reconcile();
        return;
      }
      await commit(page);
    }
  };

  const run = async () => {
    await initialize();
    while (active) {
      await sleep(pollingInterval);
      if (active) await poll();
    }
  };

  void run().catch((error) => {
    queueMicrotask(() => {
      throw error;
    });
  });
  return () => {
    active = false;
  };
}
