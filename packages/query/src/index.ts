import {
  formatBlock,
  formatLog,
  formatTransaction,
  formatTransactionReceipt,
  type Hex,
  hexToBigInt,
  hexToNumber,
  type Status,
} from "viem";

import type {
  BlockResponse,
  CallTraceResponse,
  LightBlock,
  LogResponse,
  MethodName,
  QueryBlocksResponse,
  QueryLogsResponse,
  QueryTracesResponse,
  QueryTransactionsResponse,
  QueryTransfersResponse,
  RpcBlockResponse,
  RpcCallTraceResponse,
  RpcLogResponse,
  RpcQueryBlocksResponse,
  RpcQueryLogsResponse,
  RpcQueryTracesResponse,
  RpcQueryTransactionsResponse,
  RpcQueryTransfersResponse,
  RpcTransactionResponse,
  RpcTransferResponse,
  TableName,
  TransactionResponse,
  TransferResponse,
} from "./types.js";

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
  RpcBlockResponse,
  RpcCallTraceResponse,
  RpcLogResponse,
  RpcQueryBlocksResponse,
  RpcQueryLogsResponse,
  RpcQueryTracesResponse,
  RpcQueryTransactionsResponse,
  RpcQueryTransfersResponse,
  RpcTransactionResponse,
  RpcTransferResponse,
  TableName,
  TracesFilter,
  TransactionResponse,
  TransactionsFilter,
  TransferResponse,
  TransfersFilter,
} from "./types.js";

function formatLightBlock(block: LightBlock<Hex>): LightBlock {
  return {
    number: hexToBigInt(block.number),
    hash: block.hash,
    parentHash: block.parentHash,
  };
}

function normalizeStatus(status: Status) {
  if (status === "0x1") return "success";
  if (status === "0x0") return "reverted";
  throw new Error(`Invalid RPC status: ${status}`);
}

function filterProperties<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  return Object.fromEntries(keys.map((key) => [key, obj[key]])) as Pick<T, K>;
}

function formatBlocks(blocks: RpcBlockResponse[]): BlockResponse[] {
  return blocks.map(
    (b) =>
      filterProperties(
        formatBlock(b),
        Object.keys(b) as (keyof BlockResponse)[],
      ) as BlockResponse,
  );
}

function formatTransactions(
  transactions: RpcTransactionResponse[],
): TransactionResponse[] {
  return transactions.map((t) => {
    const receiptFields = [
      "blobGasPrice",
      "blobGasUsed",
      "blockTimestamp",
      "contractAddress",
      "cumulativeGasUsed",
      "effectiveGasPrice",
      "gasUsed",
      "logsBloom",
      "root",
      "status",
      "transactionHash",
    ] as const;
    const receipt = formatTransactionReceipt(t);
    const formatted = {
      ...formatTransaction(t),
      ...Object.fromEntries(
        receiptFields.flatMap((key) => (key in t ? [[key, receipt[key]]] : [])),
      ),
      ...(t.blockTimestamp !== undefined && {
        blockTimestamp: hexToBigInt(t.blockTimestamp),
      }),
    } as TransactionResponse;
    const keys = [
      ...Object.keys(t),
      ...(t.type !== undefined ? ["typeHex"] : []),
    ] as (keyof TransactionResponse)[];
    return filterProperties(formatted, keys) as TransactionResponse;
  });
}

function formatLogs(logs: RpcLogResponse[]): LogResponse[] {
  return logs.map(
    (l) =>
      filterProperties(
        formatLog(l),
        Object.keys(l) as (keyof LogResponse)[],
      ) as LogResponse,
  );
}

export function formatQueryBlocksResponse(
  raw: RpcQueryBlocksResponse,
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
  raw: RpcQueryTransactionsResponse,
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
  raw: RpcQueryLogsResponse,
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
  raw: RpcQueryTracesResponse,
): QueryTracesResponse {
  const result: QueryTracesResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      traces: raw.data.traces.map((rawTrace) => {
        const t = rawTrace as Partial<RpcCallTraceResponse>;
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
            status: normalizeStatus(t.status),
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
  raw: RpcQueryTransfersResponse,
): QueryTransfersResponse {
  const result: QueryTransfersResponse = {
    fromBlock: formatLightBlock(raw.fromBlock),
    toBlock: formatLightBlock(raw.toBlock),
    cursorBlock: formatLightBlock(raw.cursorBlock),
    data: {
      transfers: raw.data.transfers.map((rawTransfer) => {
        const t = rawTransfer as Partial<RpcTransferResponse>;
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
            status: normalizeStatus(t.status),
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
  "uncles",
  "withdrawals",
  "withdrawalsRoot",
] as const satisfies (keyof RpcBlockResponse)[];

/** TransactionResponse fields */
export const transactionFields = [
  "accessList",
  "authorizationList",
  "blobVersionedHashes",
  "blobGasPrice",
  "blobGasUsed",
  "blockHash",
  "blockNumber",
  "blockTimestamp",
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
] as const satisfies (keyof RpcTransactionResponse)[];

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
] as const satisfies (keyof RpcCallTraceResponse)[];

/** LogResponse fields */
export const logFields = [
  "address",
  "blockHash",
  "blockNumber",
  "blockTimestamp",
  "data",
  "logIndex",
  "removed",
  "topics",
  "transactionHash",
  "transactionIndex",
] as const satisfies (keyof RpcLogResponse)[];

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
] as const satisfies (keyof RpcTransferResponse)[];

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
  blocks: (keyof RpcBlockResponse)[];
  transactions: (keyof RpcTransactionResponse)[];
  traces: (keyof RpcCallTraceResponse)[];
  logs: (keyof RpcLogResponse)[];
  transfers: (keyof RpcTransferResponse)[];
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
    blocks: resolve("blocks") as (keyof RpcBlockResponse)[],
    transactions: resolve("transactions") as (keyof RpcTransactionResponse)[],
    traces: resolve("traces") as (keyof RpcCallTraceResponse)[],
    logs: resolve("logs") as (keyof RpcLogResponse)[],
    transfers: resolve("transfers") as (keyof RpcTransferResponse)[],
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
