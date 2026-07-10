import type { Account, Chain, Client, Hex, Transport } from "viem";
import { hexToBigInt, numberToHex } from "viem";
import {
  formatQueryBlocksResponse,
  formatQueryLogsResponse,
  formatQueryTracesResponse,
  formatQueryTransactionsResponse,
  formatQueryTransfersResponse,
} from "./index.js";
import type {
  CommonRequestFields,
  QueryBlocksRequest,
  QueryBlocksResponse,
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
    if (cursorBlock === 0n) {
      throw new Error("Cannot paginate descending past block 0");
    }
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
  };
}
