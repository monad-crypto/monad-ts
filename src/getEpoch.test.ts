import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup";
import { getEpoch } from "./getEpoch";

test("getEpoch", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const epoch = await getEpoch(client, {
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(epoch).toMatchInlineSnapshot(`
    [
      1040n,
      true,
    ]
  `);
});
