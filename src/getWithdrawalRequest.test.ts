import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup";
import { getWithdrawalRequest } from "./getWithdrawalRequest";

test("getWithdrawalRequest", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const withdrawal = await getWithdrawalRequest(client, {
    args: [46n, "0x0000000000000000000000000000000000000000", 0],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(withdrawal).toMatchInlineSnapshot(`
    [
      0n,
      0n,
      0n,
    ]
  `);
});
