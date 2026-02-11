import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getStakingEpoch } from "./getStakingEpoch.js";

test("getStakingEpoch", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const epoch = await getStakingEpoch(client, {
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(epoch).toMatchInlineSnapshot(`
    [
      1040n,
      true,
    ]
  `);
});
