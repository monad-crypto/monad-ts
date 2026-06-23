import type { Account, Chain, Client, Hex, Transport } from "viem";
import { hexToBigInt, numberToHex } from "viem";
import {
  formatQueryBlocksResponse,
  formatQueryLogsResponse,
  formatQueryTracesResponse,
  formatQueryTransactionsResponse,
  formatQueryTransfersResponse,
  isLastPage,
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
    yield formatQueryBlocksResponse(raw) as QueryBlocksResponse<request>;
    if (isLastPage(raw)) break;
    const cursor = hexToBigInt(raw.cursorBlock.number);
    request.fromBlock = request.order === "desc" ? cursor - 1n : cursor + 1n;
  }
}

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
    yield formatQueryTransactionsResponse(
      raw,
    ) as QueryTransactionsResponse<request>;
    if (isLastPage(raw)) break;
    const cursor = hexToBigInt(raw.cursorBlock.number);
    request.fromBlock = request.order === "desc" ? cursor - 1n : cursor + 1n;
  }
}

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
    yield formatQueryLogsResponse(raw) as QueryLogsResponse<request>;
    if (isLastPage(raw)) break;
    const cursor = hexToBigInt(raw.cursorBlock.number);
    request.fromBlock = request.order === "desc" ? cursor - 1n : cursor + 1n;
  }
}

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
    yield formatQueryTracesResponse(raw) as QueryTracesResponse<request>;
    if (isLastPage(raw)) break;
    const cursor = hexToBigInt(raw.cursorBlock.number);
    request.fromBlock = request.order === "desc" ? cursor - 1n : cursor + 1n;
  }
}

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
    yield formatQueryTransfersResponse(raw) as QueryTransfersResponse<request>;
    if (isLastPage(raw)) break;
    const cursor = hexToBigInt(raw.cursorBlock.number);
    request.fromBlock = request.order === "desc" ? cursor - 1n : cursor + 1n;
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
