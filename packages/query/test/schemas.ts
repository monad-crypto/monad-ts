import type { Hex } from "viem";
import { z } from "zod";
import {
  blockFields,
  callTraceFields,
  logFields,
  transactionFields,
  transferFields,
} from "../src/index.js";
import type {
  QueryBlocksRequest,
  QueryLogsRequest,
  QueryTracesRequest,
  QueryTransactionsRequest,
  QueryTransfersRequest,
} from "../src/types.js";

const quantity = z.string().regex(/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/);
const data = z.string().regex(/^0x[0-9a-fA-F]*$/);
const hash = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const status = z.union([z.literal("0x0"), z.literal("0x1")]);

const accessList = z.array(
  z
    .strictObject({
      address,
      storageKeys: z.array(hash),
    })
    .loose(),
);

const authorizationList = z
  .array(
    z
      .strictObject({
        address,
        chainId: quantity,
        nonce: quantity,
        r: data,
        s: data,
        yParity: data,
      })
      .loose(),
  )
  .optional();

const blockShape = {
  baseFeePerGas: quantity,
  blobGasUsed: quantity,
  difficulty: quantity,
  excessBlobGas: quantity,
  extraData: data,
  gasLimit: quantity,
  gasUsed: quantity,
  hash,
  logsBloom: data,
  miner: address,
  mixHash: hash,
  nonce: data,
  number: quantity,
  parentBeaconBlockRoot: hash,
  parentHash: hash,
  receiptsRoot: hash,
  sha3Uncles: hash,
  size: quantity,
  stateRoot: hash,
  timestamp: quantity,
  totalDifficulty: quantity,
  transactionsRoot: hash,
  withdrawalsRoot: hash,
} as const satisfies Record<(typeof blockFields)[number], z.ZodType>;

const transactionShape = {
  accessList,
  authorizationList,
  blobVersionedHashes: z.array(hash),
  blobGasPrice: quantity,
  blobGasUsed: quantity,
  blockHash: hash,
  blockNumber: quantity,
  blockTimestamp: quantity,
  chainId: quantity,
  contractAddress: address.nullable(),
  cumulativeGasUsed: quantity,
  effectiveGasPrice: quantity,
  from: address,
  gas: quantity,
  gasPrice: quantity,
  gasUsed: quantity,
  hash,
  input: data,
  logsBloom: data,
  maxFeePerBlobGas: quantity,
  maxFeePerGas: quantity,
  maxPriorityFeePerGas: quantity,
  nonce: quantity,
  r: data,
  root: hash,
  s: data,
  status,
  to: address.nullable(),
  transactionHash: hash,
  transactionIndex: quantity,
  type: z.union([
    z.literal("0x0"),
    z.literal("0x1"),
    z.literal("0x2"),
    z.literal("0x3"),
    z.literal("0x4"),
  ]),
  v: quantity,
  value: quantity,
  yParity: quantity,
} as const satisfies Record<(typeof transactionFields)[number], z.ZodType>;

const traceShape = {
  blockHash: hash,
  blockNumber: quantity,
  error: z.string().optional(),
  from: address,
  gas: quantity,
  gasUsed: quantity,
  input: data,
  output: data.optional(),
  revertReason: z.string().optional(),
  status,
  to: address.optional(),
  traceAddress: z.array(z.number().int().nonnegative()),
  transactionHash: hash,
  transactionIndex: quantity,
  type: z.enum([
    "CALL",
    "CALLCODE",
    "DELEGATECALL",
    "STATICCALL",
    "CREATE",
    "CREATE2",
    "SELFDESTRUCT",
  ]),
  value: quantity.optional(),
} as const satisfies Record<(typeof callTraceFields)[number], z.ZodType>;

const logShape = {
  address,
  blockHash: hash,
  blockNumber: quantity,
  blockTimestamp: quantity,
  data,
  logIndex: quantity,
  removed: z.boolean(),
  topics: z.array(hash),
  transactionHash: hash,
  transactionIndex: quantity,
} as const satisfies Record<(typeof logFields)[number], z.ZodType>;

const transferShape = {
  ...traceShape,
  to: address,
  value: quantity,
} as const satisfies Record<(typeof transferFields)[number], z.ZodType>;

const lightBlock = z.strictObject({
  number: quantity,
  hash,
  parentHash: hash,
});

function projectedShape<T extends Record<string, z.ZodType>>(
  shape: T,
  fields: true | readonly string[] | undefined,
  allFields: readonly string[],
) {
  const selected = fields === undefined || fields === true ? allFields : fields;
  return Object.fromEntries(
    selected.map((field) => {
      const schema = shape[field];
      if (!schema) throw new Error(`Unknown conformance field: ${field}`);
      return [field, schema];
    }),
  ) as Pick<T, keyof T>;
}

function rowSchema<T extends Record<string, z.ZodType>>(
  shape: T,
  fields: true | readonly string[] | undefined,
  allFields: readonly string[],
) {
  return z.strictObject(projectedShape(shape, fields, allFields));
}

function relationSchema<T extends Record<string, z.ZodType>>(
  shape: T,
  fields: true | readonly string[] | undefined,
  allFields: readonly string[],
) {
  return z.array(rowSchema(shape, fields, allFields));
}

function responseSchema<T extends Record<string, z.ZodType>>(
  primary: string,
  primaryShape: T,
  primaryFields: readonly string[],
  request: {
    fields?: Record<string, true | readonly string[]>;
  },
  relations: readonly [string, Record<string, z.ZodType>, readonly string[]][],
) {
  const dataShape: Record<string, z.ZodType> = {
    [primary]: rowSchema(
      primaryShape,
      request.fields?.[primary],
      primaryFields,
    ).array(),
  };
  for (const [name, shape, fields] of relations) {
    const selected = request.fields?.[name];
    if (selected !== undefined) {
      dataShape[name] = relationSchema(shape, selected, fields);
    }
  }

  return z.strictObject({
    fromBlock: lightBlock,
    toBlock: lightBlock,
    cursorBlock: lightBlock,
    data: z.strictObject(dataShape),
  });
}

export function queryBlocksResponseSchema(
  request: QueryBlocksRequest<Hex, Hex>,
) {
  return responseSchema("blocks", blockShape, blockFields, request, []);
}

export function queryTransactionsResponseSchema(
  request: QueryTransactionsRequest<Hex, Hex>,
) {
  return responseSchema(
    "transactions",
    transactionShape,
    transactionFields,
    request,
    [["blocks", blockShape, blockFields]],
  );
}

export function queryLogsResponseSchema(request: QueryLogsRequest<Hex, Hex>) {
  return responseSchema("logs", logShape, logFields, request, [
    ["transactions", transactionShape, transactionFields],
    ["blocks", blockShape, blockFields],
  ]);
}

export function queryTracesResponseSchema(
  request: QueryTracesRequest<Hex, Hex>,
) {
  return responseSchema("traces", traceShape, callTraceFields, request, [
    ["transactions", transactionShape, transactionFields],
    ["blocks", blockShape, blockFields],
  ]);
}

export function queryTransfersResponseSchema(
  request: QueryTransfersRequest<Hex, Hex>,
) {
  return responseSchema("transfers", transferShape, transferFields, request, [
    ["transactions", transactionShape, transactionFields],
    ["blocks", blockShape, blockFields],
  ]);
}
