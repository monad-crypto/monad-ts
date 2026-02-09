import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getConsensusValidatorSet } from "./getConsensusValidatorSet";

test("getConsensusValidatorSet", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const validatorSet = await getConsensusValidatorSet(client, {
    args: [0],
  });

  expect(validatorSet).toMatchInlineSnapshot();
});
