import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getWmonDecimals } from "./getWmonDecimals.js";

test("getWmonDecimals", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const decimals = await getWmonDecimals(client, {
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(decimals).toMatchInlineSnapshot(`18`);
});
