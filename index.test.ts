import { expect, test } from "bun:test";
import { createPublicClient, http } from "viem";
import { RPC_URL } from "./test/setup";

test("should read block number from forked mainnet", async () => {
  const client = createPublicClient({
    transport: http(RPC_URL),
  });

  const blockNumber = await client.getBlockNumber();

  expect(blockNumber).toBeGreaterThan(0n);
  console.log(`Current block number: ${blockNumber}`);
});
