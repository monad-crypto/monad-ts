import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../../../test/setup.js";
import { getBalanceOf } from "./getBalanceOf.js";

test("getBalanceOf", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const balance = await getBalanceOf(client, {
    args: ["0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(balance).toMatchInlineSnapshot(`1675972005607237320311n`);
});
