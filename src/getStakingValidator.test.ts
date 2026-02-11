import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { FORK_BLOCK_NUMBER, RPC_URL } from "../test/setup.js";
import { getStakingValidator } from "./getStakingValidator.js";

test("getStakingValidator", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const validator = await getStakingValidator(client, {
    args: [46n],
    blockNumber: FORK_BLOCK_NUMBER,
  });

  expect(validator).toMatchInlineSnapshot(`
    [
      "0x685E077fC097079F964Ea8B6258bfbFb976e248f",
      0n,
      81533537319859456013443188n,
      29443702829281795545833527234707196n,
      50000000000000000n,
      59842486971212835358079n,
      81533537319859456013443188n,
      50000000000000000n,
      81533525982249519058895028n,
      50000000000000000n,
      "0x027c4cf38a0e694180155195b763e5e2d8fd737533940414b97b14426f347c707b",
      "0xa555f52bbfca8ec870bc65fb046a10475e76a2335eaa362cff0ab4c970f901df6353a97c393747945e206c6728b6bfff",
    ]
  `);
});
