import { expect, test } from "bun:test";
import { Credential } from "mppx";
import {
  accounts,
  createTestClient,
  fundUSDC,
  makeChallenge,
  setBalance,
  testChainId,
} from "../../test/utils.js";
import { charge as clientCharge } from "../client/Charge.js";
import { charge } from "./Charge.js";

test("server charge accepts one tx hash exactly once under concurrency", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.payer.address, 10n ** 18n),
  ]);

  const server = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });
  const wallet = clientCharge({
    account: accounts.payer,
    mode: "push", // client broadcasts the transfer, hands over the tx hash
    getClient: () => client,
  });

  // One real on-chain payment.
  const challenge = makeChallenge({ amount: "1" });
  const credential = Credential.deserialize(
    await wallet.createCredential({ challenge } as never),
  );
  const request = { ...challenge.request, chainId: testChainId };

  // The payer (or anyone who observed the credential) submits it N times at
  // once. The MPP spec requires at most one settlement and one delivery per
  // credential, so exactly one must be accepted.
  const N = 5;
  const results = await Promise.allSettled(
    Array.from({ length: N }, () => server.verify({ credential, request })),
  );

  const accepted = results.filter(
    (r) => r.status === "fulfilled" && r.value.status === "success",
  ).length;

  expect(accepted).toBe(1);

  // The same credential replayed sequentially is still rejected, so the guard
  // did not simply swallow the duplicates.
  await expect(server.verify({ credential, request })).rejects.toThrow(
    "Transaction hash has already been used.",
  );
});
