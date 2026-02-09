import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { stakingAbi, STAKING_ADDRESS } from "../src";
import { RPC_URL } from "../test/setup";

const client = createPublicClient({
  transport: http(RPC_URL),
  chain: monad,
});

const latestBlock = await client.getBlockNumber();
const delegateEvent = stakingAbi.find(
  (x) => x.type === "event" && x.name === "Delegate",
)!;

// Monad RPC limits eth_getLogs to a 100 block range.
// Search backwards in 100-block chunks until we find a Delegate event.
let toBlock = latestBlock;
while (toBlock > 0n) {
  const fromBlock = toBlock - 100n > 0n ? toBlock - 100n : 0n;

  const logs = await client.getLogs({
    address: STAKING_ADDRESS,
    event: delegateEvent,
    fromBlock,
    toBlock,
  });

  if (logs.length > 0) {
    console.log(
      `Found ${logs.length} Delegate event(s) in blocks ${fromBlock}-${toBlock}.`,
    );
    const { delegator, validatorId, amount, activationEpoch } = logs[0]!.args;
    console.log(`Delegator address: ${delegator}`);
    console.log(`Validator ID: ${validatorId}`);
    console.log(`Amount: ${amount}`);
    console.log(`Activation epoch: ${activationEpoch}`);
    process.exit(0);
  }

  toBlock = fromBlock - 1n;
}

console.log("No Delegate events found.");
