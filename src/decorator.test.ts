import { test } from "bun:test";
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { RPC_URL } from "../test/setup.js";
import { monadActions } from "./decorator.js";

test("client extend", async () => {
  // @ts-ignore
  const client = createPublicClient({
    transport: http(RPC_URL),
    chain: monad,
  }).extend(monadActions());
});
