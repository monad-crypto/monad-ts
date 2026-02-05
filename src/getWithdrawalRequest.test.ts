import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getWithdrawalRequest } from "./getWithdrawalRequest";

test("getWithdrawalRequest", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const withdrawal = await getWithdrawalRequest(client, {
    args: [1n, "0x0000000000000000000000000000000000000000", 0],
  });

  expect(withdrawal).toMatchInlineSnapshot();
});
