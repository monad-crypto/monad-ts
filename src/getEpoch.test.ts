import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getEpoch } from "./getEpoch";

test("getEpoch", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const epoch = await getEpoch(client);

  expect(epoch).toMatchInlineSnapshot();
});
