import type { Abi, Account, Chain, Client, Hex, Transport } from "viem";
import {
  decodeEventLog,
  decodeFunctionData,
  decodeFunctionResult,
  encodeEventTopics,
  hexToBigInt,
  numberToHex,
  parseEventLogs,
  toEventSelector,
  toFunctionSelector,
} from "viem";
import {
  formatQueryBlocksResponse,
  formatQueryLogsResponse,
  formatQueryTracesResponse,
  formatQueryTransactionsResponse,
  formatQueryTransfersResponse,
} from "./index.js";
import type {
  CommonRequestFields,
  ContractLogResponse,
  ContractTraceResponse,
  QueryBlocksRequest,
  QueryBlocksResponse,
  QueryContractLogsRequest,
  QueryContractTracesRequest,
  QueryLogsRequest,
  QueryLogsResponse,
  QueryRpcSchema,
  QueryTracesRequest,
  QueryTracesResponse,
  QueryTransactionsRequest,
  QueryTransactionsResponse,
  QueryTransfersRequest,
  QueryTransfersResponse,
} from "./types.js";

function serializeRequest<
  T extends Pick<CommonRequestFields, "fromBlock" | "toBlock" | "limit">,
>(
  request: T,
): Omit<CommonRequestFields, "fromBlock" | "toBlock" | "limit"> &
  Pick<CommonRequestFields<Hex, Hex>, "fromBlock" | "toBlock" | "limit"> {
  const { fromBlock, toBlock, limit, ...rest } = request;
  return {
    ...rest,
    ...(fromBlock != null && {
      fromBlock:
        typeof fromBlock === "bigint" ? numberToHex(fromBlock) : fromBlock,
    }),
    ...(toBlock != null && {
      toBlock: typeof toBlock === "bigint" ? numberToHex(toBlock) : toBlock,
    }),
    ...(limit != null && { limit: numberToHex(limit) }),
  } as Omit<CommonRequestFields, "fromBlock" | "toBlock" | "limit"> &
    Pick<CommonRequestFields<Hex, Hex>, "fromBlock" | "toBlock" | "limit">;
}

type QueryClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Client<transport, chain, account, QueryRpcSchema>;

type AbiEvent = Extract<Abi[number], { type: "event" }>;
type EventTopic = Hex | Hex[] | null;

function advancePagination(
  request: CommonRequestFields,
  response: {
    fromBlock: { number: Hex };
    toBlock: { number: Hex };
    cursorBlock: { number: Hex };
  },
): boolean {
  const fromBlock = hexToBigInt(response.fromBlock.number);
  const toBlock = hexToBigInt(response.toBlock.number);
  const cursorBlock = hexToBigInt(response.cursorBlock.number);

  if (
    typeof request.fromBlock === "bigint" &&
    fromBlock !== request.fromBlock
  ) {
    throw new Error("Pagination response fromBlock does not match request");
  }

  if (request.order === "desc") {
    if (cursorBlock > fromBlock || cursorBlock < toBlock) {
      throw new Error("Pagination cursorBlock is outside the requested range");
    }
    request.toBlock = toBlock;
    if (cursorBlock === toBlock) return false;
    request.fromBlock = cursorBlock - 1n;
    return true;
  }

  if (cursorBlock < fromBlock || cursorBlock > toBlock) {
    throw new Error("Pagination cursorBlock is outside the requested range");
  }
  request.toBlock = toBlock;
  if (cursorBlock === toBlock) return false;
  request.fromBlock = cursorBlock + 1n;
  return true;
}

export async function queryBlocks<const request extends QueryBlocksRequest>(
  client: QueryClient,
  request: request,
): Promise<QueryBlocksResponse<request>> {
  const raw = await client.request({
    method: "eth_queryBlocks",
    params: [serializeRequest(request)],
  });
  return formatQueryBlocksResponse(raw) as QueryBlocksResponse<request>;
}

export async function queryTransactions<
  const request extends QueryTransactionsRequest,
>(
  client: QueryClient,
  request: request,
): Promise<QueryTransactionsResponse<request>> {
  const raw = await client.request({
    method: "eth_queryTransactions",
    params: [serializeRequest(request)],
  });
  return formatQueryTransactionsResponse(
    raw,
  ) as QueryTransactionsResponse<request>;
}

export async function queryLogs<const request extends QueryLogsRequest>(
  client: QueryClient,
  request: request,
): Promise<QueryLogsResponse<request>> {
  const raw = await client.request({
    method: "eth_queryLogs",
    params: [serializeRequest(request)],
  });
  return formatQueryLogsResponse(raw) as QueryLogsResponse<request>;
}

export async function queryTraces<const request extends QueryTracesRequest>(
  client: QueryClient,
  request: request,
): Promise<QueryTracesResponse<request>> {
  const raw = await client.request({
    method: "eth_queryTraces",
    params: [serializeRequest(request)],
  });
  return formatQueryTracesResponse(raw) as QueryTracesResponse<request>;
}

export async function queryTransfers<
  const request extends QueryTransfersRequest,
>(
  client: QueryClient,
  request: request,
): Promise<QueryTransfersResponse<request>> {
  const raw = await client.request({
    method: "eth_queryTransfers",
    params: [serializeRequest(request)],
  });
  return formatQueryTransfersResponse(raw) as QueryTransfersResponse<request>;
}

function injectRequiredAbiDecodeFields<const table extends "logs" | "traces">(
  fields: Partial<Record<table, readonly string[] | true>> | undefined,
  table: table,
  required: readonly string[],
) {
  const next: Partial<Record<table, readonly string[] | true>> = { ...fields };
  const current = next[table];
  if (current === undefined || current === true) next[table] = true;
  else if (Array.isArray(current)) {
    next[table] = [...new Set([...current, ...required])];
  }
  return next;
}

function restoreRequestedFields(
  row: Record<string, unknown>,
  fields: readonly string[] | true | undefined,
) {
  if (!Array.isArray(fields)) return row;
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function getAbiEvents(abi: Abi | readonly unknown[]): AbiEvent[] {
  return (abi as Abi).filter((item): item is AbiEvent => item.type === "event");
}

function mergeEventTopics(filters: readonly (readonly EventTopic[])[]) {
  const length = Math.max(...filters.map((filter) => filter.length));
  return Array.from({ length }, (_, index): EventTopic => {
    const values = filters.map((filter) => filter[index]);
    if (values.some((value) => value == null)) return null;
    const options = [
      ...new Set(
        values.flatMap((value) => (Array.isArray(value) ? value : [value])),
      ),
    ] as Hex[];
    return options.length === 1 ? options[0] : options;
  });
}

function prepareContractLogsRequest(request: QueryContractLogsRequest) {
  const { abi, eventName, args, strict, address, fields, ...rest } = request;
  const events = getAbiEvents(abi);
  const selectedEvents = events.filter(
    (event) => eventName === undefined || event.name === eventName,
  );
  if (selectedEvents.length === 0) {
    throw new Error(
      eventName === undefined
        ? "ABI does not contain any events"
        : `ABI does not contain event ${eventName}`,
    );
  }
  const encodeTopics = encodeEventTopics as unknown as (parameters: {
    abi: Abi | readonly unknown[];
    args?: unknown;
  }) => readonly EventTopic[];
  const encodedTopics = selectedEvents.map((event) =>
    encodeTopics({ abi: [event], args: eventName ? args : undefined }),
  );
  const includesAnonymous = selectedEvents.some((event) => event.anonymous);
  const includesNamed = selectedEvents.some((event) => !event.anonymous);
  const topics =
    includesAnonymous && includesNamed
      ? undefined
      : mergeEventTopics(
          includesAnonymous
            ? encodedTopics.map((filter) => filter.slice(1))
            : encodedTopics,
        );
  const filter = {
    ...(address !== undefined && { address }),
    ...(topics !== undefined && { topics }),
  };
  return {
    ...rest,
    ...(Object.keys(filter).length > 0 && { filter }),
    fields: injectRequiredAbiDecodeFields(fields, "logs", ["topics", "data"]),
  } as QueryLogsRequest;
}

function decodeContractLog(
  row: Record<string, unknown>,
  request: QueryContractLogsRequest,
) {
  const events = getAbiEvents(request.abi).filter(
    (event) =>
      request.eventName === undefined || event.name === request.eventName,
  );
  const namedEvents = events.filter((event) => !event.anonymous);
  const parsed = parseEventLogs({
    abi: namedEvents,
    logs: [row as never],
    strict: request.strict ?? false,
  } as never);
  const decoded = parsed[0] as { eventName: string; args: unknown } | undefined;
  if (decoded) return { eventName: decoded.eventName, args: decoded.args };

  if (!Array.isArray(row.topics) || typeof row.data !== "string") {
    return undefined;
  }
  for (const event of events) {
    if (!event.anonymous) continue;
    const indexedInputs = event.inputs.filter((input) => input.indexed).length;
    if (row.topics.length !== indexedInputs) continue;
    const anonymous = decodeEventLog({
      abi: [event],
      data: row.data as Hex,
      topics: [toEventSelector(event), ...(row.topics as Hex[])],
      strict: request.strict ?? false,
    } as never) as { eventName: string; args: unknown };
    return { eventName: anonymous.eventName, args: anonymous.args };
  }
  return undefined;
}

function prepareContractTracesRequest(request: QueryContractTracesRequest) {
  const { abi, functionName, address, from, isTopLevel, fields, ...rest } =
    request;
  const functions = (abi as readonly Record<string, unknown>[]).filter(
    (item) =>
      item.type === "function" &&
      (functionName === undefined || item.name === functionName),
  );
  if (functions.length === 0) {
    throw new Error(
      functionName === undefined
        ? "ABI does not contain any functions"
        : `ABI does not contain function ${functionName}`,
    );
  }
  const selectors = functions.map((item) => toFunctionSelector(item as never));
  const filter = {
    ...(address !== undefined && { to: address }),
    ...(from !== undefined && { from }),
    ...(isTopLevel !== undefined && { isTopLevel }),
    ...(selectors.length > 0 && {
      selector: selectors.length === 1 ? selectors[0] : selectors,
    }),
  };
  return {
    ...rest,
    fields: injectRequiredAbiDecodeFields(fields, "traces", [
      "input",
      "output",
      "status",
    ]),
    ...(Object.keys(filter).length > 0 && { filter }),
  } as QueryTracesRequest;
}

function decodeContractTrace(
  row: Record<string, unknown>,
  request: QueryContractTracesRequest,
) {
  if (typeof row.input !== "string") return undefined;
  const decoded = decodeFunctionData({
    abi: request.abi as never,
    data: row.input as Hex,
  }) as never as { functionName: string; args: unknown };
  const result: Record<string, unknown> = {
    functionName: decoded.functionName,
    args: decoded.args,
  };
  if (
    (row.status === "success" || row.status === "0x0") &&
    typeof row.output === "string"
  ) {
    const decodedResult = decodeFunctionResult({
      abi: request.abi as never,
      functionName: decoded.functionName as never,
      args: decoded.args as never,
      data: row.output as Hex,
    } as never);
    if (decodedResult !== undefined) result.result = decodedResult;
  }
  return result;
}

function decodeContractLogs<const request extends QueryContractLogsRequest>(
  response: QueryLogsResponse,
  request: request,
): ContractLogResponse<request> {
  const rows = response.data.logs as Record<string, unknown>[];
  response.data.logs = rows.flatMap((row) => {
    const decoded = decodeContractLog(row, request);
    if (!decoded) return [];
    return [
      {
        ...restoreRequestedFields(row, request.fields?.logs),
        ...decoded,
      },
    ];
  }) as never;
  return response as unknown as ContractLogResponse<request>;
}

function decodeContractTraces<const request extends QueryContractTracesRequest>(
  response: QueryTracesResponse,
  request: request,
): ContractTraceResponse<request> {
  const rows = response.data.traces as Record<string, unknown>[];
  response.data.traces = rows.flatMap((row) => {
    const decoded = decodeContractTrace(row, request);
    if (!decoded) return [];
    return [
      {
        ...restoreRequestedFields(row, request.fields?.traces),
        ...decoded,
      },
    ];
  }) as never;
  return response as unknown as ContractTraceResponse<request>;
}

export async function queryContractLogs<
  const request extends QueryContractLogsRequest,
>(
  client: QueryClient,
  request: request,
): Promise<ContractLogResponse<request>> {
  const response = await queryLogs(client, prepareContractLogsRequest(request));
  return decodeContractLogs(response, request);
}

export async function queryContractTraces<
  const request extends QueryContractTracesRequest,
>(
  client: QueryClient,
  request: request,
): Promise<ContractTraceResponse<request>> {
  const response = await queryTraces(
    client,
    prepareContractTracesRequest(request),
  );
  return decodeContractTraces(response, request);
}

export async function* queryContractLogsWithPagination<
  const request extends QueryContractLogsRequest,
>(
  client: QueryClient,
  request: request,
): AsyncGenerator<ContractLogResponse<request>> {
  const prepared = prepareContractLogsRequest(request);
  for await (const response of queryLogsWithPagination(client, prepared)) {
    yield decodeContractLogs(response, request);
  }
}

export async function* queryContractTracesWithPagination<
  const request extends QueryContractTracesRequest,
>(
  client: QueryClient,
  request: request,
): AsyncGenerator<ContractTraceResponse<request>> {
  const prepared = prepareContractTracesRequest(request);
  for await (const response of queryTracesWithPagination(client, prepared)) {
    yield decodeContractTraces(response, request);
  }
}

/**
 * Query block pages over a fixed resolved range.
 *
 * If `toBlock` is omitted or set to a block tag, the first page's resolved
 * `toBlock` is pinned for subsequent pages. This helper is snapshot-oriented
 * and does not live-follow a moving chain tip.
 */
export async function* queryBlocksWithPagination<
  const request extends QueryBlocksRequest,
>(
  client: QueryClient,
  _request: request,
): AsyncGenerator<QueryBlocksResponse<request>> {
  const request: QueryBlocksRequest = { ..._request };
  while (true) {
    const raw = await client.request({
      method: "eth_queryBlocks",
      params: [serializeRequest(request)],
    });
    const hasNextPage = advancePagination(request, raw);
    yield formatQueryBlocksResponse(raw) as QueryBlocksResponse<request>;
    if (!hasNextPage) break;
  }
}

/**
 * Query transaction pages over a fixed resolved range.
 *
 * If `toBlock` is omitted or set to a block tag, the first page's resolved
 * `toBlock` is pinned for subsequent pages. This helper is snapshot-oriented
 * and does not live-follow a moving chain tip.
 */
export async function* queryTransactionsWithPagination<
  const request extends QueryTransactionsRequest,
>(
  client: QueryClient,
  _request: request,
): AsyncGenerator<QueryTransactionsResponse<request>> {
  const request: QueryTransactionsRequest = { ..._request };
  while (true) {
    const raw = await client.request({
      method: "eth_queryTransactions",
      params: [serializeRequest(request)],
    });
    const hasNextPage = advancePagination(request, raw);
    yield formatQueryTransactionsResponse(
      raw,
    ) as QueryTransactionsResponse<request>;
    if (!hasNextPage) break;
  }
}

/**
 * Query log pages over a fixed resolved range.
 *
 * If `toBlock` is omitted or set to a block tag, the first page's resolved
 * `toBlock` is pinned for subsequent pages. This helper is snapshot-oriented
 * and does not live-follow a moving chain tip.
 */
export async function* queryLogsWithPagination<
  const request extends QueryLogsRequest,
>(
  client: QueryClient,
  _request: request,
): AsyncGenerator<QueryLogsResponse<request>> {
  const request: QueryLogsRequest = { ..._request };
  while (true) {
    const raw = await client.request({
      method: "eth_queryLogs",
      params: [serializeRequest(request)],
    });
    const hasNextPage = advancePagination(request, raw);
    yield formatQueryLogsResponse(raw) as QueryLogsResponse<request>;
    if (!hasNextPage) break;
  }
}

/**
 * Query trace pages over a fixed resolved range.
 *
 * If `toBlock` is omitted or set to a block tag, the first page's resolved
 * `toBlock` is pinned for subsequent pages. This helper is snapshot-oriented
 * and does not live-follow a moving chain tip.
 */
export async function* queryTracesWithPagination<
  const request extends QueryTracesRequest,
>(
  client: QueryClient,
  _request: request,
): AsyncGenerator<QueryTracesResponse<request>> {
  const request: QueryTracesRequest = { ..._request };
  while (true) {
    const raw = await client.request({
      method: "eth_queryTraces",
      params: [serializeRequest(request)],
    });
    const hasNextPage = advancePagination(request, raw);
    yield formatQueryTracesResponse(raw) as QueryTracesResponse<request>;
    if (!hasNextPage) break;
  }
}

/**
 * Query transfer pages over a fixed resolved range.
 *
 * If `toBlock` is omitted or set to a block tag, the first page's resolved
 * `toBlock` is pinned for subsequent pages. This helper is snapshot-oriented
 * and does not live-follow a moving chain tip.
 */
export async function* queryTransfersWithPagination<
  const request extends QueryTransfersRequest,
>(
  client: QueryClient,
  _request: request,
): AsyncGenerator<QueryTransfersResponse<request>> {
  const request: QueryTransfersRequest = { ..._request };
  while (true) {
    const raw = await client.request({
      method: "eth_queryTransfers",
      params: [serializeRequest(request)],
    });
    const hasNextPage = advancePagination(request, raw);
    yield formatQueryTransfersResponse(raw) as QueryTransfersResponse<request>;
    if (!hasNextPage) break;
  }
}

export function queryActions(client: QueryClient) {
  return {
    queryBlocks: <const request extends QueryBlocksRequest>(request: request) =>
      queryBlocks(client, request),
    queryTransactions: <const request extends QueryTransactionsRequest>(
      request: request,
    ) => queryTransactions(client, request),
    queryLogs: <const request extends QueryLogsRequest>(request: request) =>
      queryLogs(client, request),
    queryTraces: <const request extends QueryTracesRequest>(request: request) =>
      queryTraces(client, request),
    queryTransfers: <const request extends QueryTransfersRequest>(
      request: request,
    ) => queryTransfers(client, request),
    queryContractLogs: <const request extends QueryContractLogsRequest>(
      request: request,
    ) => queryContractLogs(client, request),
    queryContractTraces: <const request extends QueryContractTracesRequest>(
      request: request,
    ) => queryContractTraces(client, request),
    queryBlocksWithPagination: <const request extends QueryBlocksRequest>(
      request: request,
    ) => queryBlocksWithPagination(client, request),
    queryTransactionsWithPagination: <
      const request extends QueryTransactionsRequest,
    >(
      request: request,
    ) => queryTransactionsWithPagination(client, request),
    queryLogsWithPagination: <const request extends QueryLogsRequest>(
      request: request,
    ) => queryLogsWithPagination(client, request),
    queryTracesWithPagination: <const request extends QueryTracesRequest>(
      request: request,
    ) => queryTracesWithPagination(client, request),
    queryTransfersWithPagination: <const request extends QueryTransfersRequest>(
      request: request,
    ) => queryTransfersWithPagination(client, request),
    queryContractLogsWithPagination: <
      const request extends QueryContractLogsRequest,
    >(
      request: request,
    ) => queryContractLogsWithPagination(client, request),
    queryContractTracesWithPagination: <
      const request extends QueryContractTracesRequest,
    >(
      request: request,
    ) => queryContractTracesWithPagination(client, request),
  };
}
