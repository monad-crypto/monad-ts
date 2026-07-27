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
  CallTraceResponse,
  CommonRequestFields,
  ContractLogResponse,
  ContractTraceDecoded,
  ContractTraceResponse,
  LogResponse,
  QueryBlocksFields,
  QueryBlocksRequest,
  QueryBlocksResponse,
  QueryContractLogsRequest,
  QueryContractTracesRequest,
  QueryLogsFields,
  QueryLogsRequest,
  QueryLogsResponse,
  QueryRpcSchema,
  QueryTracesFields,
  QueryTracesRequest,
  QueryTracesResponse,
  QueryTransactionsFields,
  QueryTransactionsRequest,
  QueryTransactionsResponse,
  QueryTransfersFields,
  QueryTransfersRequest,
  QueryTransfersResponse,
} from "./types.js";
import { startWatchQuery, type WatchQueryOptions } from "./watch.js";

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
type AbiFunction = Extract<Abi[number], { type: "function" }>;
type EventTopic = Hex | Hex[] | null;

export type WatchQueryBlocksRequest = Omit<
  QueryBlocksRequest,
  "fromBlock" | "toBlock" | "order"
>;

export type WatchQueryTransactionsRequest = Omit<
  QueryTransactionsRequest,
  "fromBlock" | "toBlock" | "order"
>;

export type WatchQueryLogsRequest = Omit<
  QueryLogsRequest,
  "fromBlock" | "toBlock" | "order"
>;

export type WatchQueryTracesRequest = Omit<
  QueryTracesRequest,
  "fromBlock" | "toBlock" | "order"
>;

export type WatchQueryTransfersRequest = Omit<
  QueryTransfersRequest,
  "fromBlock" | "toBlock" | "order"
>;

type RequestWithFields<request, fields> = Omit<request, "fields"> &
  ([fields] extends [undefined]
    ? { fields?: undefined }
    : undefined extends fields
      ? { fields?: fields }
      : { fields: fields });

export type WatchQueryBlocksParameters<
  fields extends QueryBlocksFields | undefined = undefined,
> = RequestWithFields<WatchQueryBlocksRequest, fields> &
  WatchQueryOptions<
    QueryBlocksResponse<RequestWithFields<WatchQueryBlocksRequest, fields>>
  >;

export type WatchQueryTransactionsParameters<
  fields extends QueryTransactionsFields | undefined = undefined,
> = RequestWithFields<WatchQueryTransactionsRequest, fields> &
  WatchQueryOptions<
    QueryTransactionsResponse<
      RequestWithFields<WatchQueryTransactionsRequest, fields>
    >
  >;

export type WatchQueryLogsParameters<
  fields extends QueryLogsFields | undefined = undefined,
> = RequestWithFields<WatchQueryLogsRequest, fields> &
  WatchQueryOptions<
    QueryLogsResponse<RequestWithFields<WatchQueryLogsRequest, fields>>
  >;

export type WatchQueryTracesParameters<
  fields extends QueryTracesFields | undefined = undefined,
> = RequestWithFields<WatchQueryTracesRequest, fields> &
  WatchQueryOptions<
    QueryTracesResponse<RequestWithFields<WatchQueryTracesRequest, fields>>
  >;

export type WatchQueryTransfersParameters<
  fields extends QueryTransfersFields | undefined = undefined,
> = RequestWithFields<WatchQueryTransfersRequest, fields> &
  WatchQueryOptions<
    QueryTransfersResponse<
      RequestWithFields<WatchQueryTransfersRequest, fields>
    >
  >;

function advancePagination(
  request: CommonRequestFields,
  response: {
    toBlock: { number: Hex };
    cursorBlock: { number: Hex };
  },
): boolean {
  const toBlock = hexToBigInt(response.toBlock.number);
  const cursorBlock = hexToBigInt(response.cursorBlock.number);

  if (request.order === "desc") {
    request.toBlock = toBlock;
    if (cursorBlock === toBlock) return false;
    request.fromBlock = cursorBlock - 1n;
    return true;
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

/** Watch live block query pages and report pages rewound by reorgs. */
export function watchQueryBlocks<
  const fields extends QueryBlocksFields | undefined = undefined,
>(
  client: QueryClient,
  parameters: WatchQueryBlocksParameters<fields>,
): () => void {
  type Request = RequestWithFields<WatchQueryBlocksRequest, fields>;
  return startWatchQuery<Request, QueryBlocksResponse<Request>, "blocks">(
    (request) => queryBlocks(client, request),
    "blocks",
    parameters,
    client.pollingInterval,
  );
}

/** Watch live transaction query pages and report pages rewound by reorgs. */
export function watchQueryTransactions<
  const fields extends QueryTransactionsFields | undefined = undefined,
>(
  client: QueryClient,
  parameters: WatchQueryTransactionsParameters<fields>,
): () => void {
  type Request = RequestWithFields<WatchQueryTransactionsRequest, fields>;
  return startWatchQuery<
    Request,
    QueryTransactionsResponse<Request>,
    "transactions"
  >(
    (request) => queryTransactions(client, request),
    "transactions",
    parameters,
    client.pollingInterval,
  );
}

/** Watch live log query pages and report pages rewound by reorgs. */
export function watchQueryLogs<
  const fields extends QueryLogsFields | undefined = undefined,
>(
  client: QueryClient,
  parameters: WatchQueryLogsParameters<fields>,
): () => void {
  type Request = RequestWithFields<WatchQueryLogsRequest, fields>;
  return startWatchQuery<Request, QueryLogsResponse<Request>, "logs">(
    (request) => queryLogs(client, request),
    "logs",
    parameters,
    client.pollingInterval,
  );
}

/** Watch live trace query pages and report pages rewound by reorgs. */
export function watchQueryTraces<
  const fields extends QueryTracesFields | undefined = undefined,
>(
  client: QueryClient,
  parameters: WatchQueryTracesParameters<fields>,
): () => void {
  type Request = RequestWithFields<WatchQueryTracesRequest, fields>;
  return startWatchQuery<Request, QueryTracesResponse<Request>, "traces">(
    (request) => queryTraces(client, request),
    "traces",
    parameters,
    client.pollingInterval,
  );
}

/** Watch live transfer query pages and report pages rewound by reorgs. */
export function watchQueryTransfers<
  const fields extends QueryTransfersFields | undefined = undefined,
>(
  client: QueryClient,
  parameters: WatchQueryTransfersParameters<fields>,
): () => void {
  type Request = RequestWithFields<WatchQueryTransfersRequest, fields>;
  return startWatchQuery<Request, QueryTransfersResponse<Request>, "transfers">(
    (request) => queryTransfers(client, request),
    "transfers",
    parameters,
    client.pollingInterval,
  );
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
    watchQueryBlocks: <
      const fields extends QueryBlocksFields | undefined = undefined,
    >(
      parameters: WatchQueryBlocksParameters<fields>,
    ) => watchQueryBlocks(client, parameters),
    watchQueryTransactions: <
      const fields extends QueryTransactionsFields | undefined = undefined,
    >(
      parameters: WatchQueryTransactionsParameters<fields>,
    ) => watchQueryTransactions(client, parameters),
    watchQueryLogs: <
      const fields extends QueryLogsFields | undefined = undefined,
    >(
      parameters: WatchQueryLogsParameters<fields>,
    ) => watchQueryLogs(client, parameters),
    watchQueryTraces: <
      const fields extends QueryTracesFields | undefined = undefined,
    >(
      parameters: WatchQueryTracesParameters<fields>,
    ) => watchQueryTraces(client, parameters),
    watchQueryTransfers: <
      const fields extends QueryTransfersFields | undefined = undefined,
    >(
      parameters: WatchQueryTransfersParameters<fields>,
    ) => watchQueryTransfers(client, parameters),
  };
}
