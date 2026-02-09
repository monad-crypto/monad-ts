import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getProposerValId } from "./getProposerValId";

test("getProposerValId", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const proposerValId = await getProposerValId(client);

  expect(proposerValId).toMatchInlineSnapshot();
});
