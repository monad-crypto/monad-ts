import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getDelegators } from "./getDelegators";

test("getDelegators", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const delegators = await getDelegators(client, {
    args: [1n, "0x0000000000000000000000000000000000000000"],
  });

  expect(delegators).toMatchInlineSnapshot();
});
