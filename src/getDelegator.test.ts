import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getDelegator } from "./getDelegator";

test("getDelegator", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const delegator = await getDelegator(client, {
    args: [1n, "0x0000000000000000000000000000000000000000"],
  });

  expect(delegator).toMatchInlineSnapshot();
});
