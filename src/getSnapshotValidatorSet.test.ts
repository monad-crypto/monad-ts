import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getSnapshotValidatorSet } from "./getSnapshotValidatorSet";

test("getSnapshotValidatorSet", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const validatorSet = await getSnapshotValidatorSet(client, {
    args: [0],
  });

  expect(validatorSet).toMatchInlineSnapshot();
});
