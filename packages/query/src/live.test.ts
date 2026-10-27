/**
 * Type-level tests for live query inference.
 *
 * Type assertions are checked by `tsc --noEmit`.
 */

import { expectTypeOf, test } from "bun:test";
import type { Prettify } from "viem";
import { queryActions } from "./actions.js";
import {
  type LiveBlock,
  type QueryLiveBlockEvent,
  type QueryLiveData,
  type QueryLiveEvent,
  type QueryLiveFinalizeEvent,
  type QueryLiveReorgEvent,
  streamQuery,
  watchQuery,
} from "./live.js";
import type {
  BlockResponse,
  BlocksFilter,
  LogResponse,
  LogsFilter,
  TransactionResponse,
} from "./types.js";

declare const client: Parameters<typeof watchQuery>[0];

test("data includes filtered tables and relations", () => {
  type Request = {
    filter: {
      logs: readonly [
        { address: "0x0000000000000000000000000000000000000000" },
      ];
    };
    fields: {
      logs: readonly ["address", "data"];
      transactions: readonly ["hash"];
    };
  };

  expectTypeOf<QueryLiveData<Request>>().toEqualTypeOf<{
    logs: Prettify<Pick<LogResponse, "address" | "data">>[];
    transactions: Prettify<Pick<TransactionResponse, "hash">>[];
  }>();
});

test("tables without fields return full rows", () => {
  type Request = { filter: { blocks: readonly [BlocksFilter] } };

  expectTypeOf<QueryLiveData<Request>>().toEqualTypeOf<{
    blocks: BlockResponse[];
  }>();
});

test("finalized tag only yields block events", () => {
  type Request = { filter: { logs: readonly [LogsFilter] } };

  expectTypeOf<QueryLiveEvent<Request>>().toEqualTypeOf<
    QueryLiveBlockEvent<Request>
  >();
  expectTypeOf<QueryLiveEvent<Request & { tag: "finalized" }>>().toEqualTypeOf<
    QueryLiveBlockEvent<Request & { tag: "finalized" }>
  >();
});

test("unfinalized tags yield reorg events", () => {
  type Request = { tag: "latest"; filter: { logs: readonly [LogsFilter] } };

  expectTypeOf<QueryLiveEvent<Request>>().toEqualTypeOf<
    QueryLiveBlockEvent<Request> | QueryLiveReorgEvent<Request>
  >();
});

test("includeFinalization yields finalize events for unfinalized tags", () => {
  type Request = {
    tag: "safe";
    filter: { logs: readonly [LogsFilter] };
    includeFinalization: true;
  };
  type FinalizedRequest = Omit<Request, "tag"> & { tag: "finalized" };

  expectTypeOf<QueryLiveEvent<Request>>().toEqualTypeOf<
    | QueryLiveBlockEvent<Request>
    | QueryLiveReorgEvent<Request>
    | QueryLiveFinalizeEvent
  >();
  expectTypeOf<QueryLiveEvent<FinalizedRequest>>().toEqualTypeOf<
    QueryLiveBlockEvent<FinalizedRequest>
  >();
});

test("watchQuery infers data and requires onReorg for unfinalized tags", () => {
  // Type-only: never called.
  async function _types() {
    watchQuery(client, {
      filter: { logs: [{}] },
      fields: { logs: ["address"] },
      onBlock: (event) => {
        expectTypeOf(event.toBlock).toEqualTypeOf<LiveBlock>();
        expectTypeOf(event.data.logs).toEqualTypeOf<
          Pick<LogResponse, "address">[]
        >();
      },
    });

    watchQuery(client, {
      tag: "finalized",
      filter: { logs: [{}] },
      onBlock: () => {},
      // @ts-expect-error finalized streams never reorg
      onReorg: () => {},
    });

    // @ts-expect-error onReorg is required for latest
    watchQuery(client, {
      tag: "latest",
      filter: { logs: [{}] },
      onBlock: () => {},
    });

    watchQuery(client, {
      tag: "latest",
      filter: { logs: [{}] },
      onBlock: () => {},
      onReorg: () => {},
      // @ts-expect-error onFinalize requires includeFinalization
      onFinalize: () => {},
    });

    // @ts-expect-error onFinalize is required with includeFinalization
    watchQuery(client, {
      tag: "latest",
      filter: { logs: [{}] },
      includeFinalization: true,
      onBlock: () => {},
      onReorg: () => {},
    });

    watchQuery(client, {
      tag: "latest",
      filter: { logs: [{}] },
      fields: { logs: ["address"] },
      includeFinalization: true,
      onBlock: () => {},
      onReorg: (event) => {
        expectTypeOf(event.block).toEqualTypeOf<LiveBlock>();
        expectTypeOf(event.removed.logs).toEqualTypeOf<
          Pick<LogResponse, "address">[]
        >();
      },
      onFinalize: (event) => {
        expectTypeOf(event.block).toEqualTypeOf<LiveBlock>();
      },
    });
  }
  expectTypeOf(_types).toBeFunction();
});

test("streamQuery yields events narrowed by tag", async () => {
  // Type-only: never called.
  async function _types() {
    for await (const event of streamQuery(client, {
      filter: { logs: [{}] },
    })) {
      expectTypeOf(event.type).toEqualTypeOf<"block">();
    }

    for await (const event of streamQuery(client, {
      tag: "latest",
      filter: { logs: [{}] },
    })) {
      expectTypeOf(event.type).toEqualTypeOf<"block" | "reorg">();
    }

    for await (const event of streamQuery(client, {
      tag: "latest",
      filter: { logs: [{}] },
      fields: { logs: ["address"] },
      includeFinalization: true,
    })) {
      if (event.type === "block") {
        expectTypeOf(event.data.logs).toEqualTypeOf<
          Pick<LogResponse, "address">[]
        >();
      } else if (event.type === "reorg") {
        expectTypeOf(event.removed.logs).toEqualTypeOf<
          Pick<LogResponse, "address">[]
        >();
      } else {
        expectTypeOf(event).toEqualTypeOf<QueryLiveFinalizeEvent>();
      }
    }
  }
  expectTypeOf(_types).toBeFunction();
});

test("queryActions exposes live actions with inference", () => {
  // Type-only: never called.
  async function _types() {
    const actions = queryActions(client);

    actions.watchQuery({
      tag: "latest",
      filter: { logs: [{}] },
      fields: { logs: ["address"] },
      onBlock: (event) => {
        expectTypeOf(event.data.logs).toEqualTypeOf<
          Pick<LogResponse, "address">[]
        >();
      },
      onReorg: () => {},
    });

    for await (const event of actions.streamQuery({
      filter: { logs: [{}] },
    })) {
      expectTypeOf(event.type).toEqualTypeOf<"block">();
    }
  }
  expectTypeOf(_types).toBeFunction();
});
