import { expectTypeOf, test } from "bun:test";
import type { Client, Prettify, Transport } from "viem";
import {
  type QueryRpcSchema,
  queryActions,
  watchQueryBlocks,
  watchQueryLogs,
  watchQueryTraces,
  watchQueryTransactions,
  watchQueryTransfers,
} from "./index.js";
import type {
  BlockResponse,
  CallTraceResponse,
  LogResponse,
  TransactionResponse,
  TransferResponse,
} from "./types.js";

declare const client: Client<Transport, undefined, undefined, QueryRpcSchema>;

test.todo("standalone watch actions preserve field projection and return unwatch", () => {
  const unwatchBlocks = watchQueryBlocks(client, {
    fromBlock: 1n,
    fields: { blocks: ["number", "hash"] },
    limit: 10,
    targetBlock: "latest",
    pollingInterval: 1_000,
    maxReorgDepth: 64,
    onData(response) {
      expectTypeOf(response.data.blocks).toEqualTypeOf<
        Prettify<Pick<BlockResponse, "number" | "hash">>[]
      >();
      expectTypeOf(response.fromBlock.number).toEqualTypeOf<bigint>();
    },
  });
  expectTypeOf(unwatchBlocks).toEqualTypeOf<() => void>();

  const unwatchTransactions = watchQueryTransactions(client, {
    filter: { selector: "0x12345678" },
    fields: {
      transactions: ["hash", "value"],
      blocks: ["number"],
    },
    targetBlock: "safe",
    onData(response) {
      expectTypeOf(response.data.transactions).toEqualTypeOf<
        Prettify<Pick<TransactionResponse, "hash" | "value">>[]
      >();
      expectTypeOf(response.data.blocks).toEqualTypeOf<
        Prettify<Pick<BlockResponse, "number">>[]
      >();
    },
  });
  expectTypeOf(unwatchTransactions).toEqualTypeOf<() => void>();

  const unwatchLogs = watchQueryLogs(client, {
    filter: { address: "0x1111111111111111111111111111111111111111" },
    fields: {
      logs: ["address", "topics"],
      transactions: ["hash"],
    },
    targetBlock: "finalized",
    onData(response) {
      expectTypeOf(response.data.logs).toEqualTypeOf<
        Prettify<Pick<LogResponse, "address" | "topics">>[]
      >();
      expectTypeOf(response.data.transactions).toEqualTypeOf<
        Prettify<Pick<TransactionResponse, "hash">>[]
      >();
    },
    onReorg(reorg) {
      expectTypeOf(reorg.commonAncestor.number).toEqualTypeOf<bigint>();
      expectTypeOf(reorg.oldBlocks).toEqualTypeOf<
        readonly {
          number: bigint;
          hash: `0x${string}`;
          parentHash: `0x${string}`;
        }[]
      >();
      expectTypeOf(reorg.newBlocks).toEqualTypeOf<
        readonly {
          number: bigint;
          hash: `0x${string}`;
          parentHash: `0x${string}`;
        }[]
      >();
      expectTypeOf(reorg.removed.logs).toEqualTypeOf<
        Prettify<Pick<LogResponse, "address" | "topics">>[]
      >();
      expectTypeOf(reorg.removed.transactions).toEqualTypeOf<
        Prettify<Pick<TransactionResponse, "hash">>[]
      >();
    },
    onError(error) {
      expectTypeOf(error).toEqualTypeOf<Error>();
    },
  });
  expectTypeOf(unwatchLogs).toEqualTypeOf<() => void>();

  const unwatchTraces = watchQueryTraces(client, {
    filter: { isTopLevel: true },
    fields: { traces: ["blockNumber", "status"] },
    onData(response) {
      expectTypeOf(response.data.traces).toEqualTypeOf<
        Prettify<Pick<CallTraceResponse, "blockNumber" | "status">>[]
      >();
    },
  });
  expectTypeOf(unwatchTraces).toEqualTypeOf<() => void>();

  const unwatchTransfers = watchQueryTransfers(client, {
    filter: { from: "0x1111111111111111111111111111111111111111" },
    fields: { transfers: ["from", "value"] },
    onData(response) {
      expectTypeOf(response.data.transfers).toEqualTypeOf<
        Prettify<Pick<TransferResponse, "from" | "value">>[]
      >();
    },
  });
  expectTypeOf(unwatchTransfers).toEqualTypeOf<() => void>();
});

test.todo("queryActions exposes projected decorated watch actions", () => {
  const actions = queryActions(client);
  const unwatch = actions.watchQueryLogs({
    fromBlock: 1n,
    fields: { logs: ["blockNumber", "logIndex"] },
    onData(response) {
      expectTypeOf(response.data.logs).toEqualTypeOf<
        Prettify<Pick<LogResponse, "blockNumber" | "logIndex">>[]
      >();
    },
    onReorg(reorg) {
      expectTypeOf(reorg.removed.logs).toEqualTypeOf<
        Prettify<Pick<LogResponse, "blockNumber" | "logIndex">>[]
      >();
    },
  });
  expectTypeOf(unwatch).toEqualTypeOf<() => void>();

  expectTypeOf(actions.watchQueryBlocks({ onData() {} })).toEqualTypeOf<
    () => void
  >();
  expectTypeOf(actions.watchQueryTransactions({ onData() {} })).toEqualTypeOf<
    () => void
  >();
  expectTypeOf(actions.watchQueryTraces({ onData() {} })).toEqualTypeOf<
    () => void
  >();
  expectTypeOf(actions.watchQueryTransfers({ onData() {} })).toEqualTypeOf<
    () => void
  >();
});

test.todo("watch parameters reject fixed ranges, block tags as starts, and emitOnBegin", () => {
  type Parameters = globalThis.Parameters<typeof watchQueryBlocks>[1];
  const acceptsParameters = (_parameters: Parameters) => undefined;

  // @ts-expect-error watch starts accept bigint only
  acceptsParameters({ fromBlock: "latest", onData() {} });
  // @ts-expect-error a watcher has a moving target instead of toBlock
  acceptsParameters({ toBlock: 10n, onData() {} });
  // @ts-expect-error watchers always scan in ascending order
  acceptsParameters({ order: "desc", onData() {} });
  // @ts-expect-error initialization is immediate and has no emitOnBegin option
  acceptsParameters({ emitOnBegin: false, onData() {} });
  // @ts-expect-error pending is not a supported moving target
  acceptsParameters({ targetBlock: "pending", onData() {} });
});
