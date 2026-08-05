import type {
  Abi,
  Account,
  Chain,
  Client,
  ContractEventArgs,
  ContractEventName,
  ContractFunctionName,
  Hex,
  Transport,
} from "viem";
import {
  decodeEventLog,
  decodeFunctionData,
  decodeFunctionResult,
  encodeEventTopics,
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
import {
  isLastPage,
  pinRequestRange,
  updateRequestPagination,
} from "./pagination.js";
import type {
  CallTraceResponse,
  CommonRequestFields,
  ContractLogResponse,
  ContractTraceDecoded,
  ContractTraceResponse,
  LogResponse,
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
  T extends Pick<
    CommonRequestFields<bigint | Hex>,
    "fromBlock" | "toBlock" | "limit"
  >,
>(
  request: T,
): Omit<CommonRequestFields<bigint | Hex>, "fromBlock" | "toBlock" | "limit"> &
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
  } as Omit<
    CommonRequestFields<bigint | Hex>,
    "fromBlock" | "toBlock" | "limit"
  > &
    Pick<CommonRequestFields<Hex, Hex>, "fromBlock" | "toBlock" | "limit">;
}

type QueryClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain | undefined,
  account extends Account | undefined = Account | undefined,
> = Client<transport, chain, account, QueryRpcSchema>;

type AbiEvent = Extract<Abi[number], { type: "event" }>;
type AbiFunction = Extract<Abi[number], { type: "function" }>;
type EventTopic = Hex | Hex[] | null;

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

function injectRequiredAbiDecodeFields<
  field extends string,
  table extends string,
>(
  fields: Partial<Record<table, readonly field[] | true>> | undefined,
  table: table,
  required: readonly field[],
) {
  const next: Partial<Record<table, readonly field[] | true>> = { ...fields };
  const current = next[table];
  if (current === undefined || current === true) next[table] = true;
  else if (Array.isArray(current)) {
    next[table] = [...new Set([...current, ...required])];
  }
  return next;
}

function restoreRequestedFields<row extends object, key extends keyof row>(
  row: row,
  fields: readonly key[] | true | undefined,
): row | Pick<row, key> {
  if (fields === undefined || fields === true) return row;
  return Object.fromEntries(fields.map((field) => [field, row[field]])) as Pick<
    row,
    key
  >;
}

function isAbiEvent(item: unknown): item is AbiEvent {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "event"
  );
}

function isAbiFunction(item: unknown): item is AbiFunction {
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "function"
  );
}

function getAbiEvents(abi: Abi | readonly unknown[]): AbiEvent[] {
  return Array.from(abi).filter(isAbiEvent);
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

function prepareContractLogsRequest<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined,
  strict extends boolean | undefined,
>(request: QueryContractLogsRequest<abi, eventName, strict>): QueryLogsRequest {
  const {
    abi,
    eventName,
    args,
    strict: decodeStrict,
    address,
    fields,
    ...rest
  } = request;
  void decodeStrict;
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
  const encodedTopics =
    eventName === undefined
      ? selectedEvents.map((event) => encodeEventTopics({ abi: [event] }))
      : selectedEvents.map((event) =>
          encodeEventTopics({
            abi: [event],
            args: args as ContractEventArgs<readonly [AbiEvent]>,
          }),
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
    fields: injectRequiredAbiDecodeFields<keyof LogResponse, "logs">(
      fields,
      "logs",
      ["topics", "data"],
    ),
  };
}

function decodeContractLog<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi> | undefined,
  strict extends boolean | undefined,
>(row: LogResponse, request: QueryContractLogsRequest<abi, eventName, strict>) {
  const events = getAbiEvents(request.abi).filter(
    (event) =>
      request.eventName === undefined || event.name === request.eventName,
  );
  const namedEvents = events.filter((event) => !event.anonymous);
  const parsed = parseEventLogs({
    abi: namedEvents,
    logs: [row],
    strict: request.strict ?? false,
  });
  const decoded = parsed[0];
  if (decoded) return { eventName: decoded.eventName, args: decoded.args };

  for (const event of events) {
    if (!event.anonymous) continue;
    const indexedInputs = event.inputs.filter((input) => input.indexed).length;
    if (row.topics.length !== indexedInputs) continue;
    const topics: [Hex, ...Hex[]] = [toEventSelector(event), ...row.topics];
    const eventAbi = [event] as const;
    const anonymous = decodeEventLog<
      typeof eventAbi,
      undefined,
      Hex[],
      Hex,
      boolean
    >({
      abi: eventAbi,
      data: row.data,
      topics,
      strict: request.strict ?? false,
    });
    return { eventName: anonymous.eventName, args: anonymous.args };
  }
  return undefined;
}

function prepareContractTracesRequest<
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi> | undefined,
>(request: QueryContractTracesRequest<abi, functionName>): QueryTracesRequest {
  const { abi, functionName, address, from, isTopLevel, fields, ...rest } =
    request;
  const functions = Array.from(abi).filter(
    (item): item is AbiFunction =>
      isAbiFunction(item) &&
      (functionName === undefined || item.name === functionName),
  );
  if (functions.length === 0) {
    throw new Error(
      functionName === undefined
        ? "ABI does not contain any functions"
        : `ABI does not contain function ${functionName}`,
    );
  }
  const selectors = functions.map((item) => toFunctionSelector(item));
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
    fields: injectRequiredAbiDecodeFields<keyof CallTraceResponse, "traces">(
      fields,
      "traces",
      ["input", "output", "status"],
    ),
    ...(Object.keys(filter).length > 0 && { filter }),
  };
}

function decodeContractTrace<
  const abi extends Abi | readonly unknown[],
  functionName extends ContractFunctionName<abi> | undefined,
>(
  row: CallTraceResponse,
  request: QueryContractTracesRequest<abi, functionName>,
): ContractTraceDecoded<abi, functionName> {
  const decoded = decodeFunctionData({
    abi: request.abi,
    data: row.input,
  });
  if (row.status === "success" && row.output !== undefined) {
    const abiFunction = request.abi.find(
      (item): item is AbiFunction =>
        isAbiFunction(item) &&
        toFunctionSelector(item) === row.input.slice(0, 10),
    );
    if (!abiFunction) return decoded as ContractTraceDecoded<abi, functionName>;
    const decodedResult = decodeFunctionResult({
      abi: [abiFunction],
      data: row.output,
    });
    if (decodedResult !== undefined) {
      return { ...decoded, result: decodedResult } as ContractTraceDecoded<
        abi,
        functionName
      >;
    }
  }
  return decoded as ContractTraceDecoded<abi, functionName>;
}

function decodeContractLogs<const request extends QueryContractLogsRequest>(
  response: QueryLogsResponse,
  request: request,
): ContractLogResponse<request> {
  const decodedResponse: unknown = {
    ...response,
    data: {
      ...response.data,
      logs: response.data.logs.flatMap((row) => {
        const decoded = decodeContractLog(row, request);
        if (!decoded) return [];
        return [
          {
            ...restoreRequestedFields(row, request.fields?.logs),
            ...decoded,
          },
        ];
      }),
    },
  };
  return decodedResponse as ContractLogResponse<request>;
}

function decodeContractTraces<const request extends QueryContractTracesRequest>(
  response: QueryTracesResponse,
  request: request,
): ContractTraceResponse<request> {
  const decodedResponse: unknown = {
    ...response,
    data: {
      ...response.data,
      traces: response.data.traces.map((row) => ({
        ...restoreRequestedFields(row, request.fields?.traces),
        ...decodeContractTrace(row, request),
      })),
    },
  };
  return decodedResponse as ContractTraceResponse<request>;
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
    const response = formatQueryBlocksResponse(
      raw,
    ) as QueryBlocksResponse<request>;
    pinRequestRange(request, response);
    updateRequestPagination(request, response);
    yield response;
    if (isLastPage(response)) break;
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
    const response = formatQueryTransactionsResponse(
      raw,
    ) as QueryTransactionsResponse<request>;
    pinRequestRange(request, response);
    updateRequestPagination(request, response);
    yield response;
    if (isLastPage(response)) break;
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
    const response = formatQueryLogsResponse(raw) as QueryLogsResponse<request>;
    pinRequestRange(request, response);
    updateRequestPagination(request, response);
    yield response;
    if (isLastPage(response)) break;
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
    const response = formatQueryTracesResponse(
      raw,
    ) as QueryTracesResponse<request>;
    pinRequestRange(request, response);
    updateRequestPagination(request, response);
    yield response;
    if (isLastPage(response)) break;
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
    const response = formatQueryTransfersResponse(
      raw,
    ) as QueryTransfersResponse<request>;
    pinRequestRange(request, response);
    updateRequestPagination(request, response);
    yield response;
    if (isLastPage(response)) break;
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
