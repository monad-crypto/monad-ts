import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup";
import { getDelegator } from "./getDelegator";

test("getDelegator", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const delegator = await getDelegator(client, {
    args: [21n, "0x57A7c50E6C27B6252ff484785A6d75E294c8A0a5"],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(delegator).toMatchInlineSnapshot(`
    [
      343648730916945617574983n,
      27176212028178372832642064668773073n,
      71820874209844354289n,
      1123465991474012666727n,
      0n,
      1041n,
      0n,
    ]
  `);
});
