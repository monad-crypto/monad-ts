import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getWmonAllowance } from "./getWmonAllowance.js";

test("getWmonAllowance", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const allowance = await getWmonAllowance(client, {
    args: [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
    ],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(allowance).toMatchInlineSnapshot(`0n`);
});
