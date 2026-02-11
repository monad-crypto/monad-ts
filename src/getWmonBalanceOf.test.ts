import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getWmonBalanceOf } from "./getWmonBalanceOf.js";

test("getWmonBalanceOf", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const balance = await getWmonBalanceOf(client, {
    args: ["0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(balance).toMatchInlineSnapshot(`1675972005607237320311n`);
});
