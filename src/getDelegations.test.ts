import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getDelegations } from "./getDelegations.js";

test("getDelegations", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const delegations = await getDelegations(client, {
    args: ["0x57A7c50E6C27B6252ff484785A6d75E294c8A0a5", 0n],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(delegations).toMatchInlineSnapshot(`
    [
      true,
      0n,
      [
        21n,
      ],
    ]
  `);
});
