import { type Hex, toHex } from "viem";
import type { CommonRequestFields } from "./types.js";

/** The request fields used to paginate a query. */
export type PaginationRequest<quantity extends bigint | Hex = bigint> = Pick<
  CommonRequestFields<quantity, never>,
  "fromBlock" | "toBlock" | "order"
>;

/** The block references returned by a query RPC method. */
export type PaginationResponse<quantity extends bigint | Hex = bigint> = {
  fromBlock: { number: quantity };
  toBlock: { number: quantity };
  cursorBlock: { number: quantity };
};

/**
 * Pin the range of a query request using resovled values.
 */
export function pinRequestRange<
  const request extends PaginationRequest<quantity>,
  quantity extends bigint | Hex = bigint,
>(request: request, response: PaginationResponse<quantity>) {
  request.fromBlock = response.fromBlock.number;
  request.toBlock = response.toBlock.number;
}

/**
 * Update the `fromBlock` and `toBlock` from a resolved request and cursor.
 */
export function updateRequestPagination<quantity extends bigint | Hex = bigint>(
  request: PaginationRequest<quantity>,
  response: PaginationResponse<quantity>,
) {
  if (isLastPage(response)) return;

  const cursorBlock = BigInt(response.cursorBlock.number);

  const nextBlock =
    request.order === "desc" ? cursorBlock - 1n : cursorBlock + 1n;

  if (typeof response.cursorBlock.number === "bigint") {
    // @ts-expect-error
    request.fromBlock = nextBlock;
  } else {
    // @ts-expect-error
    request.fromBlock = toHex(nextBlock);
  }
}

/**
 * Return whether a query response has scanned through its resolved end block.
 */
export function isLastPage<quantity extends bigint | Hex = bigint>(response: PaginationResponse<quantity>): boolean {
  return response.cursorBlock.number === response.toBlock.number;
}
