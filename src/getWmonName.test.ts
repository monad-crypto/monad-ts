import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getWmonName } from "./getWmonName.js";

test("getWmonName", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const name = await getWmonName(client, {
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(name).toMatchInlineSnapshot(`"Wrapped MON"`);
});
