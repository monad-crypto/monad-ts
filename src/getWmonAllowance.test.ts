import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getWmonAllowance } from "./getWmonAllowance.js";

test("getWmonAllowance", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const allowance = await getWmonAllowance(client, {
    args: [
      "0x058EC190471E8A89d40A522C803D456715A93316",
      "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    ],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(allowance).toMatchInlineSnapshot(
    `115792089237316195423570985008687907853269984665640564039457584007913129639935n`,
  );
});
