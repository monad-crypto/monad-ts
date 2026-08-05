import { expect, test } from "bun:test";
import type { Hex } from "viem";
import {
  isLastPage,
  type PaginationRequest,
  type PaginationResponse,
  pinRequestRange,
  updateRequestPagination,
} from "./index.js";

function response(
  fromBlock: bigint,
  toBlock: bigint,
  cursorBlock: bigint,
): PaginationResponse {
  return {
    fromBlock: { number: fromBlock },
    toBlock: { number: toBlock },
    cursorBlock: { number: cursorBlock },
  };
}

test("updates ascending bigint pagination in place", () => {
  const request: PaginationRequest = { fromBlock: 10n, toBlock: 20n };

  updateRequestPagination(request, response(10n, 20n, 15n));

  expect(request).toEqual({ fromBlock: 16n, toBlock: 20n });
});

test("stops without updating the request on the last page", () => {
  const request: PaginationRequest = { fromBlock: 10n, toBlock: 20n };

  updateRequestPagination(request, response(10n, 20n, 20n));

  expect(request).toEqual({ fromBlock: 10n, toBlock: 20n });
  expect(isLastPage(response(10n, 20n, 20n))).toBe(true);
});

test("updates descending serialized pagination", () => {
  const request: PaginationRequest<Hex> = {
    fromBlock: "0x14",
    toBlock: "0xa",
    order: "desc",
  };
  const serializedResponse = {
    fromBlock: { number: "0x14" },
    toBlock: { number: "0xa" },
    cursorBlock: { number: "0xf" },
  } satisfies PaginationResponse<Hex>;

  updateRequestPagination(request, serializedResponse);

  expect(request).toEqual({
    fromBlock: "0xe",
    toBlock: "0xa",
    order: "desc",
  });
});

test("pins resolved request bounds in place", () => {
  const request: PaginationRequest = {
    fromBlock: "latest",
    toBlock: "latest",
  };

  pinRequestRange(request, response(10n, 20n, 10n));

  expect(request).toEqual({ fromBlock: 10n, toBlock: 20n });
});

test("isLastPage compares the cursor and resolved range", () => {
  expect(isLastPage(response(10n, 20n, 19n))).toBe(false);
  expect(isLastPage(response(10n, 20n, 20n))).toBe(true);
});
