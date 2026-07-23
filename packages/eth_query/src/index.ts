import {
  formatBlock,
  formatLog,
  formatTransaction,
  type Hex,
  hexToBigInt,
  hexToNumber,
} from "viem";

import type {
  BlockResponse,
  CallTraceResponse,
  LightBlock,
  LogResponse,
  MethodName,
  QueryBlocksRequest,
  QueryBlocksResponse,
  QueryLogsRequest,
  QueryLogsResponse,
  QueryTracesRequest,
  QueryTracesResponse,
  QueryTransactionsRequest,
  QueryTransactionsResponse,
  QueryTransfersRequest,
  QueryTransfersResponse,
  TableName,
  TransactionResponse,
  TransferResponse,
} from "./types.js";

export type {
  WatchQueryBlocksParameters,
  WatchQueryBlocksRequest,
  WatchQueryLogsParameters,
  WatchQueryLogsRequest,
  WatchQueryTracesParameters,
  WatchQueryTracesRequest,
  WatchQueryTransactionsParameters,
  WatchQueryTransactionsRequest,
  WatchQueryTransfersParameters,
  WatchQueryTransfersRequest,
} from "./actions.js";
export {
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
  watchQueryBlocks,
  watchQueryLogs,
  watchQueryTraces,
  watchQueryTransactions,
  watchQueryTransfers,
} from "./actions.js";
export type {
  BlockResponse,
  CallTraceResponse,
  ContractLogDecoded,
  ContractLogResponse,
  ContractTraceDecoded,
  ContractTraceResponse,
  LightBlock,
  LogResponse,
  LogsFilter,
  MethodName,
  Order,
  QueryBlocksFields,
  QueryBlocksRequest,
  QueryBlocksResponse,
  QueryContractLogsRequest,
  QueryContractLogsResponse,
  QueryContractTracesRequest,
  QueryContractTracesResponse,
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
  TableName,
  TracesFilter,
  TransactionResponse,
  TransactionsFilter,
  TransferResponse,
  TransfersFilter,
} from "./types.js";
export type { QueryReorg, WatchQueryOptions } from "./watch.js";
export { ReorgBeyondMaxDepthError } from "./watch.js";

function formatLightBlock(block: LightBlock<Hex>): LightBlock {
  return {
    number: hexToBigInt(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
  };
}

function normalizeStatus(status: string, kind: "receipt" | "trace") {
  if (status === "success" || status === "reverted") return status;
  if (kind === "trace") return status === "0x0" ? "success" : "reverted";
  return status === "0x1" ? "success" : "reverted";
}

function filterProperties<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, obj[key]])) as Pick<T, K>;
}

function formatBlocks(blocks: BlockResponse<Hex>[]): BlockResponse[] {
  return blocks.map(
    (b) =>
      filterProperties(
        formatBlock(b),
        Object.keys(b) as (keyof BlockResponse)[],
      ) as BlockResponse,
  );
}

function formatTransactions(
  transactions: (TransactionResponse | TransactionResponse<Hex, Hex>)[],
): TransactionResponse[] {
  return transactions.map((t) => {
    // TransactionResponse combines transaction and receipt fields. Viem's
    // formatTransaction handles the transaction fields, so normalize receipt
    // fields here before delegating to it.
    const transaction: Parameters<typeof formatTransaction>[0] =
      Object.fromEntries(
        Object.entries(t).map(([key, value]) => {
          if (value == null) return [key, value];
          if (
            [
              "blobGasPrice",
              "blobGasUsed",
              "cumulativeGasUsed",
              "effectiveGasPrice",
              "gasUsed",
            ].includes(key) &&
            typeof value === "string"
          ) {
            return [key, hexToBigInt(value as Hex)];
          }
          if (key === "status" && typeof value === "string") {
            return [key, normalizeStatus(value, "receipt")];
          }
          return [key, value];
        }),
      );

    return filterProperties(
      formatTransaction(transaction) as TransactionResponse,
      Object.keys(t) as (keyof TransactionResponse)[],
    ) as TransactionResponse;
  });
}

function formatLogs(logs: LogResponse<Hex, Hex>[]): LogResponse[] {
  return logs.map(
    (l) =>
      filterProperties(
        formatLog(l),
        Object.keys(l) as (keyof LogResponse)[],
      ) as LogResponse,
  );
}

export function formatQueryBlocksResponse(
  raw: QueryBlocksResponse<QueryBlocksRequest, Hex>,
): QueryBlocksResponse {
  const result: QueryBlocksResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      blocks: formatBlocks(raw.data.blocks),
    },
  };
  return result;
}

export function formatQueryTransactionsResponse(
  raw: QueryTransactionsResponse<QueryTransactionsRequest, Hex, Hex>,
): QueryTransactionsResponse {
  const result: QueryTransactionsResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      transactions: formatTransactions(raw.data.transactions),
    },
  };
  if (raw.data.blocks) result.data.blocks = formatBlocks(raw.data.blocks);
  return result;
}

export function formatQueryLogsResponse(
  raw: QueryLogsResponse<QueryLogsRequest, Hex, Hex>,
): QueryLogsResponse {
  const result: QueryLogsResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      logs: formatLogs(raw.data.logs),
    },
  };
  if (raw.data.transactions) {
    result.data.transactions = formatTransactions(raw.data.transactions);
  }
  if (raw.data.blocks) result.data.blocks = formatBlocks(raw.data.blocks);
  return result;
}

export function formatQueryTracesResponse(
  raw: QueryTracesResponse<QueryTracesRequest, Hex, Hex>,
): QueryTracesResponse {
  const result: QueryTracesResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      traces: raw.data.traces.map((rawTrace) => {
        const t = rawTrace as Partial<CallTraceResponse<Hex, Hex>>;
        const trace: unknown = {
          ...t,
          ...(t.blockNumber !== undefined && {
            blockNumber: hexToBigInt(t.blockNumber),
          }),
          ...(t.transactionIndex !== undefined && {
            transactionIndex: hexToNumber(t.transactionIndex),
          }),
          ...(t.subcalls !== undefined && {
            subcalls: hexToNumber(t.subcalls),
          }),
          ...(t.gas !== undefined && { gas: hexToBigInt(t.gas) }),
          ...(t.gasUsed !== undefined && { gasUsed: hexToBigInt(t.gasUsed) }),
          ...(t.value !== undefined && { value: hexToBigInt(t.value) }),
          ...(t.status !== undefined && {
            status: normalizeStatus(t.status, "trace"),
          }),
        };
        return trace as CallTraceResponse;
      }),
    },
  };
  if (raw.data.transactions) {
    result.data.transactions = formatTransactions(raw.data.transactions);
  }
  if (raw.data.blocks) result.data.blocks = formatBlocks(raw.data.blocks);
  return result;
}

export function formatQueryTransfersResponse(
  raw: QueryTransfersResponse<QueryTransfersRequest, Hex, Hex>,
): QueryTransfersResponse {
  const result: QueryTransfersResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      transfers: raw.data.transfers.map((rawTransfer) => {
        const t = rawTransfer as Partial<TransferResponse<Hex, Hex>>;
        const transfer: unknown = {
          ...t,
          ...(t.blockNumber !== undefined && {
            blockNumber: hexToBigInt(t.blockNumber),
          }),
          ...(t.transactionIndex !== undefined && {
            transactionIndex: hexToNumber(t.transactionIndex),
          }),
          ...(t.value !== undefined && { value: hexToBigInt(t.value) }),
          ...(t.status !== undefined && {
            status: normalizeStatus(t.status, "trace"),
          }),
        };
        return transfer as TransferResponse;
      }),
    },
  };
  if (raw.data.transactions) {
    result.data.transactions = formatTransactions(raw.data.transactions);
  }
  if (raw.data.blocks) result.data.blocks = formatBlocks(raw.data.blocks);
  return result;
}

/** BlockResponse fields */
export const blockFields = [
  "baseFeePerGas",
  "blobGasUsed",
  "difficulty",
  "excessBlobGas",
  "extraData",
  "gasLimit",
  "gasUsed",
  "hash",
  "logsBloom",
  "miner",
  "mixHash",
  "nonce",
  "number",
  "parentBeaconBlockRoot",
  "parentHash",
  "receiptsRoot",
  "sealFields",
  "sha3Uncles",
  "size",
  "stateRoot",
  "timestamp",
  "totalDifficulty",
  "transactionsRoot",
  "withdrawals",
  "withdrawalsRoot",
] as const satisfies (keyof BlockResponse)[];

/** TransactionResponse fields */
export const transactionFields = [
  "accessList",
  "authorizationList",
  "blobVersionedHashes",
  "blobGasPrice",
  "blobGasUsed",
  "blockHash",
  "blockNumber",
  "chainId",
  "contractAddress",
  "cumulativeGasUsed",
  "effectiveGasPrice",
  "from",
  "gas",
  "gasPrice",
  "gasUsed",
  "hash",
  "input",
  "logsBloom",
  "maxFeePerBlobGas",
  "maxFeePerGas",
  "maxPriorityFeePerGas",
  "nonce",
  "r",
  "root",
  "s",
  "status",
  "to",
  "transactionHash",
  "transactionIndex",
  "type",
  "v",
  "value",
  "yParity",
] as const satisfies (keyof TransactionResponse)[];

/** CallTraceResponse fields (used for the "traces" table) */
export const callTraceFields = [
  "blockHash",
  "blockNumber",
  "error",
  "from",
  "gas",
  "gasUsed",
  "input",
  "output",
  "revertReason",
  "status",
  "subcalls",
  "to",
  "traceAddress",
  "transactionHash",
  "transactionIndex",
  "type",
  "value",
] as const satisfies (keyof CallTraceResponse)[];

/** LogResponse fields */
export const logFields = [
  "address",
  "blockHash",
  "blockNumber",
  "data",
  "logIndex",
  "topics",
  "transactionHash",
  "transactionIndex",
] as const satisfies (keyof LogResponse)[];

/** TransferResponse fields */
export const transferFields = [
  "blockHash",
  "blockNumber",
  "from",
  "status",
  "to",
  "traceAddress",
  "transactionHash",
  "transactionIndex",
  "value",
] as const satisfies (keyof TransferResponse)[];

const FIELDS = {
  blocks: blockFields,
  transactions: transactionFields,
  logs: logFields,
  traces: callTraceFields,
  transfers: transferFields,
} as const;

const METHOD_TO_TABLE = {
  eth_queryBlocks: "blocks",
  eth_queryTransactions: "transactions",
  eth_queryLogs: "logs",
  eth_queryTraces: "traces",
  eth_queryTransfers: "transfers",
} as const satisfies { [method in MethodName]: TableName };

/**
 * Returns the field names that will appear in the response for each table,
 * based on the method and any included relations.
 *
 * - If `fields` is omitted, all fields of the primary table are returned.
 * - If `fields[table]` is `true`, all fields of that table are returned.
 * - If `fields[table]` is an array, only those fields are returned.
 * - Related tables present as keys in `fields` contribute their fields too.
 */
export function getFieldsForRequest(
  method: MethodName,
  fields?: Record<string, readonly string[] | true | undefined>,
): {
  blocks: (keyof BlockResponse)[];
  transactions: (keyof TransactionResponse)[];
  traces: (keyof CallTraceResponse)[];
  logs: (keyof LogResponse)[];
  transfers: (keyof TransferResponse)[];
} {
  const primaryTable = METHOD_TO_TABLE[method];

  const resolve = (key: TableName): string[] => {
    const val = fields?.[key];
    if (val === true || (val === undefined && key === primaryTable)) {
      return Array.from(FIELDS[key]);
    }
    if (Array.isArray(val)) {
      return val;
    }
    return [];
  };

  return {
    blocks: resolve("blocks") as (keyof BlockResponse)[],
    transactions: resolve("transactions") as (keyof TransactionResponse)[],
    traces: resolve("traces") as (keyof CallTraceResponse)[],
    logs: resolve("logs") as (keyof LogResponse)[],
    transfers: resolve("transfers") as (keyof TransferResponse)[],
  };
}

/**
 * Returns `true` if there are no more pages to fetch.
 *
 * Pagination is complete when `cursorBlock.number == toBlock.number`,
 * meaning the server has scanned through the entire requested range.
 */
export function isLastPage(response: {
  cursorBlock: { number: Hex };
  toBlock: { number: Hex };
}): boolean {
  return response.cursorBlock.number === response.toBlock.number;
}
