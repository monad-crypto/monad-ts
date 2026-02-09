import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup";
import { getValidator } from "./getValidator";

test("getValidator", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  });

  const validator = await getValidator(client, { args: [1n] });

  expect(validator).toMatchInlineSnapshot();
});
