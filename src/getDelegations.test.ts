import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getDelegations } from "./getDelegations";

test("getDelegations", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const delegations = await getDelegations(client, {
    args: ["0x0000000000000000000000000000000000000000", 0n],
  });

  expect(delegations).toMatchInlineSnapshot();
});
