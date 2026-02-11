import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getStakingProposerValId } from "./getStakingProposerValId.js";

test("getStakingProposerValId", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const proposerValId = await getStakingProposerValId(client, {
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(proposerValId).toMatchInlineSnapshot(`172n`);
});
