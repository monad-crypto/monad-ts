import { expect, test } from "bun:test";
import type { Hex } from "viem";
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  encodeFunctionResult,
  toEventSelector,
} from "viem";
import {
  isLastPage,
  queryActions,
  queryContractLogs,
  queryContractLogsWithPagination,
  queryContractTraces,
  queryContractTracesWithPagination,
} from "./index.js";

const address = "0x1111111111111111111111111111111111111111" as const;
const recipient = "0x2222222222222222222222222222222222222222" as const;
const hash = `0x${"1".repeat(64)}` as const;
const parentHash = `0x${"0".repeat(64)}` as const;

const abi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "forward",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
  {
    type: "function",
    name: "noResult",
    stateMutability: "view",
    inputs: [{ name: "value", type: "uint256" }],
    outputs: [],
  },
] as const;

const transferTopics = encodeEventTopics({
  abi,
  eventName: "Transfer",
  args: { from: address },
});
const transferData = encodeAbiParameters([{ type: "uint256" }], [7n]);
const forwardInput = encodeFunctionData({
  abi,
  functionName: "forward",
  args: [recipient, "0x1234"],
});
const forwardOutput = encodeFunctionResult({
  abi,
  functionName: "forward",
  result: true,
});
const noResultInput = encodeFunctionData({
  abi,
  functionName: "noResult",
  args: [9n],
});

function block(number: number) {
  return {
    number: `0x${number.toString(16)}`,
    hash,
    parentHash,
  };
}

function response(
  data: Record<string, unknown>,
  cursor = 1,
  toBlock = 1,
  fromBlock = 1,
) {
  return {
    fromBlock: block(fromBlock),
    toBlock: block(toBlock),
    cursorBlock: block(cursor),
    data,
  };
}

function logRow(topics: readonly Hex[] = transferTopics as Hex[]) {
  return {
    address,
    blockHash: hash,
    blockNumber: "0x1",
    data: transferData,
    logIndex: "0x0",
    topics,
    transactionHash: hash,
    transactionIndex: "0x0",
    removed: false,
  };
}

function traceRow(
  input: `0x${string}`,
  status = "0x0",
  output = forwardOutput,
) {
  return {
    blockHash: hash,
    blockNumber: "0x1",
    from: address,
    gas: "0x10",
    gasUsed: "0x8",
    input,
    output,
    status,
    subcalls: "0x0",
    to: recipient,
    traceAddress: [],
    transactionHash: hash,
    transactionIndex: "0x0",
    type: "call",
    value: "0x0",
  };
}

function mockClient(results: unknown[]) {
  const calls: { method: string; params: unknown }[] = [];
  let index = 0;
  const client = {
    request: async (request: { method: string; params: unknown }) => {
      calls.push(request);
      return results[index++];
    },
  } as never;
  return { calls, client };
}

test("queryContractLogs translates filters, decodes rows, and restores projections", async () => {
  const { calls, client } = mockClient([
    response({
      logs: [logRow()],
      blocks: [{ number: "0x1" }],
    }),
  ]);
  const request = {
    abi,
    address,
    eventName: "Transfer" as const,
    args: { from: address },
    fromBlock: 1n,
    toBlock: 1n,
    strict: true as const,
    fields: {
      logs: ["address"] as const,
      blocks: ["number"] as const,
    },
  };

  const result = await queryContractLogs(client, request);

  expect(calls).toEqual([
    {
      method: "eth_queryLogs",
      params: [
        {
          filter: { address, topics: transferTopics },
          fields: { logs: ["address", "topics", "data"], blocks: ["number"] },
          fromBlock: "0x1",
          toBlock: "0x1",
        },
      ],
    },
  ]);
  expect(result.data.logs).toEqual([
    {
      address,
      eventName: "Transfer",
      args: { from: address, value: 7n },
    },
  ]);
  expect(result.data.blocks).toEqual([{ number: 1n }]);
});

test("queryContractLogs supports all ABI events and strict malformed-log behavior", async () => {
  const allEvents = mockClient([response({ logs: [] })]);
  await queryContractLogs(allEvents.client, {
    abi,
    fromBlock: 1n,
    toBlock: 1n,
  });
  const topics = (
    allEvents.calls[0].params as [{ filter: { topics: unknown } }]
  )[0].filter.topics;
  expect(topics).toEqual([
    [transferTopics[0], encodeEventTopics({ abi, eventName: "Approval" })[0]],
  ]);

  const malformed = mockClient([
    response({ logs: [logRow([transferTopics[0], "0x1234"])] }),
  ]);
  const nonStrict = await queryContractLogs(malformed.client, {
    abi,
    eventName: "Transfer",
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(nonStrict.data.logs).toEqual([
    expect.objectContaining({ eventName: "Transfer", args: {} }),
  ]);

  const strict = mockClient([
    response({ logs: [logRow([transferTopics[0], "0x1234"])] }),
  ]);
  const strictResult = await queryContractLogs(strict.client, {
    abi,
    eventName: "Transfer",
    strict: true,
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(strictResult.data.logs).toEqual([]);
});

test("queryContractLogs supports overloaded and anonymous events", async () => {
  const overloadedAbi = [
    {
      type: "event",
      name: "Value",
      inputs: [{ name: "value", type: "uint256", indexed: true }],
      anonymous: false,
    },
    {
      type: "event",
      name: "Value",
      inputs: [{ name: "value", type: "address", indexed: true }],
      anonymous: false,
    },
  ] as const;
  const overloaded = mockClient([response({ logs: [] })]);
  await queryContractLogs(overloaded.client, {
    abi: overloadedAbi,
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(
    (overloaded.calls[0].params as [{ filter: { topics: unknown } }])[0].filter
      .topics,
  ).toEqual([
    [toEventSelector(overloadedAbi[0]), toEventSelector(overloadedAbi[1])],
  ]);

  const anonymousEvent = {
    type: "event",
    name: "AnonymousValue",
    inputs: [
      { name: "who", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: true,
  } as const;
  const mixedAbi = [abi[0], anonymousEvent] as const;
  const anonymousTopic = transferTopics[1] as Hex;
  const anonymous = mockClient([
    response({ logs: [logRow([anonymousTopic])] }),
  ]);
  const anonymousResult = await queryContractLogs(anonymous.client, {
    abi: mixedAbi,
    address,
    fromBlock: 1n,
    toBlock: 1n,
    fields: { logs: [] },
  });
  expect(anonymous.calls[0]).toEqual({
    method: "eth_queryLogs",
    params: [
      {
        filter: { address },
        fields: { logs: ["topics", "data"] },
        fromBlock: "0x1",
        toBlock: "0x1",
      },
    ],
  });
  expect(anonymousResult.data.logs).toEqual([
    {
      eventName: "AnonymousValue",
      args: { who: address, value: 7n },
    },
  ]);

  const selected = mockClient([response({ logs: [logRow([anonymousTopic])] })]);
  await queryContractLogs(selected.client, {
    abi: [anonymousEvent],
    eventName: "AnonymousValue",
    args: { who: address },
    fromBlock: 1n,
    toBlock: 1n,
  });
  expect(
    (selected.calls[0].params as [{ filter: { topics: unknown } }])[0].filter
      .topics,
  ).toEqual([anonymousTopic]);
});

test("queryContractLogsWithPagination decodes every page without mutating the request", async () => {
  const { calls, client } = mockClient([
    response({ logs: [logRow()] }, 1, 2),
    response({ logs: [logRow()] }, 2, 2, 2),
  ]);
  const request = {
    abi,
    eventName: "Transfer" as const,
    fromBlock: 1n,
    toBlock: 2n,
    fields: { logs: ["logIndex"] as const },
  };
  const pages = [];
  for await (const page of queryContractLogsWithPagination(client, request)) {
    pages.push(page);
  }
  expect(pages).toHaveLength(2);
  expect(pages[0].data.logs[0]).toMatchObject({
    logIndex: 0,
    eventName: "Transfer",
  });
  expect(request).toEqual({
    abi,
    eventName: "Transfer",
    fromBlock: 1n,
    toBlock: 2n,
    fields: { logs: ["logIndex"] },
  });
  expect((calls[1].params as [{ fromBlock: string }])[0].fromBlock).toBe("0x2");
});

test("queryContractTraces decodes successful, reverted, and malformed calls", async () => {
  const { calls, client } = mockClient([
    response({
      traces: [
        traceRow(forwardInput),
        traceRow(forwardInput, "0x1", "0x1234"),
        traceRow("0x1234"),
      ],
    }),
  ]);
  const result = await queryContractTraces(client, {
    abi,
    address: recipient,
    from: address,
    functionName: "forward",
    isTopLevel: true,
    fromBlock: 1n,
    toBlock: 1n,
    fields: { traces: ["to", "status"] },
  });

  expect(calls[0]).toEqual({
    method: "eth_queryTraces",
    params: [
      {
        filter: {
          to: recipient,
          from: address,
          isTopLevel: true,
          selector: `0x${forwardInput.slice(2, 10)}`,
        },
        fields: { traces: ["to", "status", "input", "output"] },
        fromBlock: "0x1",
        toBlock: "0x1",
      },
    ],
  });
  expect(result.data.traces).toEqual([
    {
      to: recipient,
      status: "success",
      functionName: "forward",
      args: [recipient, "0x1234"],
      result: true,
    },
    {
      to: recipient,
      status: "reverted",
      functionName: "forward",
      args: [recipient, "0x1234"],
    },
  ]);
});

test("queryContractTraces restores empty projections and decodes overloaded results", async () => {
  const overloadedAbi = [
    {
      type: "function",
      name: "read",
      stateMutability: "view",
      inputs: [{ name: "value", type: "uint256" }],
      outputs: [{ name: "value", type: "uint256" }],
    },
    {
      type: "function",
      name: "read",
      stateMutability: "view",
      inputs: [{ name: "value", type: "address" }],
      outputs: [{ name: "value", type: "address" }],
    },
  ] as const;
  const input = encodeFunctionData({
    abi: overloadedAbi,
    functionName: "read",
    args: [address],
  });
  const output = encodeFunctionResult({
    abi: [overloadedAbi[1]],
    functionName: "read",
    result: address,
  });
  const { calls, client } = mockClient([
    response({ traces: [traceRow(input, "0x0", output)] }),
  ]);
  const result = await queryContractTraces(client, {
    abi: overloadedAbi,
    functionName: "read",
    fromBlock: 1n,
    toBlock: 1n,
    fields: { traces: [] },
  });
  expect(
    (calls[0].params as [{ fields: { traces: unknown } }])[0].fields.traces,
  ).toEqual(["input", "output", "status"]);
  expect(result.data.traces as unknown).toEqual([
    {
      functionName: "read",
      args: [address],
      result: address,
    },
  ]);
});

test("queryContractTraces rejects an ABI with no matching functions", async () => {
  const { calls, client } = mockClient([]);
  await expect(
    queryContractTraces(client, {
      abi: [abi[0]],
      fromBlock: 1n,
      toBlock: 1n,
    }),
  ).rejects.toThrow("ABI does not contain any functions");
  expect(calls).toEqual([]);
});

test("queryContractTracesWithPagination decodes pages and supports all function selectors", async () => {
  const { calls, client } = mockClient([
    response({ traces: [traceRow(noResultInput)] }, 1, 2),
    response({ traces: [traceRow(noResultInput)] }, 2, 2, 2),
  ]);
  const pages = [];
  for await (const page of queryContractTracesWithPagination(client, {
    abi,
    fromBlock: 1n,
    toBlock: 2n,
  })) {
    pages.push(page);
  }
  expect(pages).toHaveLength(2);
  expect(pages[0].data.traces[0]).toMatchObject({
    functionName: "noResult",
    args: [9n],
  });
  expect(
    (calls[0].params as [{ filter: { selector: unknown } }])[0].filter,
  ).toEqual({
    selector: [
      `0x${forwardInput.slice(2, 10)}`,
      `0x${noResultInput.slice(2, 10)}`,
    ],
  });
});

test("contract pagination preserves descending cursor validation", async () => {
  const { client } = mockClient([
    {
      fromBlock: block(2),
      toBlock: block(1),
      cursorBlock: block(0),
      data: { logs: [] },
    },
  ]);
  const pages = queryContractLogsWithPagination(client, {
    abi,
    fromBlock: 2n,
    toBlock: 1n,
    order: "desc",
  });
  await expect(pages.next()).rejects.toThrow(
    "Pagination cursorBlock is outside the requested range",
  );
});

test("isLastPage compares the cursor and resolved range", () => {
  expect(
    isLastPage({ cursorBlock: { number: "0x1" }, toBlock: { number: "0x1" } }),
  ).toBe(true);
  expect(
    isLastPage({ cursorBlock: { number: "0x1" }, toBlock: { number: "0x2" } }),
  ).toBe(false);
});

test("queryActions binds ABI-aware actions", async () => {
  const { client } = mockClient([
    response({ logs: [] }),
    response({ traces: [] }),
    response({ logs: [] }),
    response({ traces: [] }),
  ]);
  const actions = queryActions(client);
  await actions.queryContractLogs({ abi, fromBlock: 1n, toBlock: 1n });
  await actions.queryContractTraces({ abi, fromBlock: 1n, toBlock: 1n });
  for await (const _page of actions.queryContractLogsWithPagination({
    abi,
    fromBlock: 1n,
    toBlock: 1n,
  }))
    break;
  for await (const _page of actions.queryContractTracesWithPagination({
    abi,
    fromBlock: 1n,
    toBlock: 1n,
  }))
    break;
});
