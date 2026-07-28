import { expectTypeOf, test } from "bun:test";
import type { Client, Prettify, Transport } from "viem";
import {
  type QueryRpcSchema,
  queryActions,
  type WatchQueryLogsParameters,
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
    fields: { blocks: ["number", "hash"] },
    limit: 10,
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
    onData(response) {
      expectTypeOf(response.data.logs).toEqualTypeOf<
        Prettify<Pick<LogResponse, "address" | "topics">>[]
      >();
      expectTypeOf(response.data.transactions).toEqualTypeOf<
        Prettify<Pick<TransactionResponse, "hash">>[]
      >();
    },
    onReorg(reorg) {
      expectTypeOf(reorg.removed.logs).toEqualTypeOf<
        Prettify<Pick<LogResponse, "address" | "topics">>[]
      >();
      expectTypeOf(reorg.removed.transactions).toEqualTypeOf<
        Prettify<Pick<TransactionResponse, "hash">>[]
      >();
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

test.todo("watch parameters reject ranges, order, and emitOnBegin", () => {
  type Parameters = globalThis.Parameters<typeof watchQueryBlocks>[1];
  const acceptsParameters = (_parameters: Parameters) => undefined;

  // @ts-expect-error watch actions are always live-only
  acceptsParameters({ fromBlock: "latest", onData() {} });
  // @ts-expect-error watch actions do not backfill numeric ranges
  acceptsParameters({ fromBlock: 1n, onData() {} });
  // @ts-expect-error a watcher has a moving target instead of toBlock
  acceptsParameters({ toBlock: 10n, onData() {} });
  // @ts-expect-error watchers always scan in ascending order
  acceptsParameters({ order: "desc", onData() {} });
  // @ts-expect-error initialization is immediate and has no emitOnBegin option
  acceptsParameters({ emitOnBegin: false, onData() {} });
  // @ts-expect-error live watchers always follow latest
  acceptsParameters({ targetBlock: "pending", onData() {} });
  // @ts-expect-error watch errors are thrown as uncaught exceptions
  acceptsParameters({ onData() {}, onError() {} });

  type WithBlocks = WatchQueryLogsParameters<{ blocks: true }>;
  const acceptsWithBlocks = (_parameters: WithBlocks) => undefined;
  // @ts-expect-error explicit field generics require matching runtime fields
  acceptsWithBlocks({ onData() {} });
});
