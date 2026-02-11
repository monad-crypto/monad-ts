import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getWmonSymbol } from "./getWmonSymbol.js";

test("getWmonSymbol", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const symbol = await getWmonSymbol(client, {
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(symbol).toMatchInlineSnapshot(`"WMON"`);
});
