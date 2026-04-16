import { expect, test } from "bun:test";
import { Credential, Store } from "mppx";
import { createClient, http } from "viem";
import { RPC_URL } from "../../test/setup.js";
import {
  accounts,
  createTestClient,
  fundUSDC,
  fundUSDT0,
  makeAuthorizationPayload,
  makeChallenge,
  NON_ERC3009_TOKEN,
  setBalance,
  testChainId,
  token,
  usdt0Token,
} from "../../test/utils.js";
import { charge as clientCharge } from "../client/Charge.js";
import * as defaults from "../defaults.js";
import { charge } from "./Charge.js";

test("server charge creates method with correct name and intent", () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });
  expect(method.name).toBe("monad");
  expect(method.intent).toBe("charge");
});

test("server charge throws when ERC-3009 token used without account", () => {
  expect(() =>
    charge({
      recipient: accounts.recipient.address,
      currency: token,
    }),
  ).toThrow("requires an `account` parameter");
});

test("server charge allows non-ERC-3009 token without account", () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    currency: NON_ERC3009_TOKEN,
    getClient: () => client,
  });
  expect(method).toBeDefined();
});

test("server charge rejects expired challenge", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const challenge = makeChallenge({ expires: "2020-01-01T00:00:00Z" });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "hash",
          hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("Payment expired");
});

test("server charge rejects authorization without server account", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    currency: NON_ERC3009_TOKEN,
    getClient: () => client,
  });

  const challenge = makeChallenge();

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: makeAuthorizationPayload({ to: accounts.recipient.address }),
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("no server `account` is configured");
});

test("server charge rejects authorization with mismatched recipient", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const challenge = makeChallenge({ recipient: accounts.server.address });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: makeAuthorizationPayload({
          to: accounts.payer.address, // wrong — should be server
        }),
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("recipient does not match");
});

test("server charge rejects authorization with mismatched amount", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const challenge = makeChallenge({ recipient: accounts.server.address });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: makeAuthorizationPayload({ value: "999999" }),
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("amount does not match");
});

test("server charge rejects expired authorization", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const challenge = makeChallenge({ recipient: accounts.server.address });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: makeAuthorizationPayload({ validBefore: "1000" }),
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("authorization expired");
});

test("server charge request hook resolves chainId from client", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const requestHook = method.request as (
    params: never,
  ) => Promise<{ chainId: number }>;
  const result = await requestHook({
    request: {
      amount: "1000000",
      currency: token,
      recipient: accounts.recipient.address,
    },
  } as never);

  expect(result.chainId).toBe(testChainId);
});

test("server charge request hook uses testnet chainId when configured", async () => {
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    currency: token,
    testnet: true,
    getClient: ({ chainId }) => {
      const id = chainId ?? defaults.chainId.testnet;
      return createClient({ chain: { id } as never, transport: http(RPC_URL) });
    },
  });

  const requestHook = method.request as (
    params: never,
  ) => Promise<{ chainId: number }>;
  const result = await requestHook({
    request: {
      amount: "1000000",
      currency: token,
      recipient: accounts.recipient.address,
    },
  } as never);

  expect(result.chainId).toBe(defaults.chainId.testnet);
});

test("server charge request hook uses explicit chainId from request", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const requestHook = method.request as (
    params: never,
  ) => Promise<{ chainId: number }>;
  const result = await requestHook({
    request: {
      amount: "1000000",
      currency: token,
      recipient: accounts.recipient.address,
      chainId: testChainId,
    },
  } as never);

  expect(result.chainId).toBe(testChainId);
});

test("server charge request hook throws when client chainId mismatches", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const requestHook = method.request as (params: never) => Promise<unknown>;
  await expect(
    requestHook({
      request: {
        amount: "1000000",
        currency: token,
        recipient: accounts.recipient.address,
        chainId: 99999,
      },
    } as never),
  ).rejects.toThrow("Client not configured with chainId 99999");
});

test("defaults resolveCurrency returns USDC for mainnet", () => {
  expect(defaults.resolveCurrency({})).toBe(token);
});

test("defaults resolveCurrency throws for testnet (no default configured)", () => {
  expect(() => defaults.resolveCurrency({ testnet: true })).toThrow(
    "No default currency configured",
  );
});

test("defaults ERC-3009 ABI has receiveWithAuthorization", () => {
  const fn = defaults.erc3009Abi.find(
    (item) => item.name === "receiveWithAuthorization",
  );
  expect(fn).toBeDefined();
  expect(fn?.inputs.length).toBe(9);
});

test("defaults ERC-3009 ABI has transferWithAuthorization", () => {
  const fn = defaults.erc3009Abi.find(
    (item) => item.name === "transferWithAuthorization",
  );
  expect(fn).toBeDefined();
  expect(fn?.inputs.length).toBe(9);
});

test("server charge rejects duplicate hash with custom store", async () => {
  const client = createTestClient();
  const store = Store.memory();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.payer.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
    store,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "push",
    getClient: () => client,
  });

  const challenge1 = makeChallenge({ amount: "1" });
  const credentialStr = await clientMethod.createCredential({
    challenge: challenge1,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  // First use should succeed
  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge1.request, chainId: testChainId },
  });
  expect(receipt.status).toBe("success");

  // Second use of the same hash should be rejected
  const challenge2 = makeChallenge({ amount: "1" });
  const credential2 = { ...credential, challenge: challenge2 };
  await expect(
    serverMethod.verify({
      credential: credential2,
      request: { ...challenge2.request, chainId: testChainId },
    }),
  ).rejects.toThrow("Transaction hash has already been used.");
});

test("server charge rejects duplicate hash with default memory store", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.payer.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "push",
    getClient: () => client,
  });

  const challenge = makeChallenge({ amount: "1" });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });
  expect(receipt.status).toBe("success");

  // Default memory store rejects duplicate hash
  const challenge2 = makeChallenge({ amount: "1" });
  const credential2 = { ...credential, challenge: challenge2 };
  await expect(
    serverMethod.verify({
      credential: credential2,
      request: { ...challenge2.request, chainId: testChainId },
    }),
  ).rejects.toThrow("Transaction hash has already been used.");
});

test("server charge verifies a push (hash) credential end-to-end", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.payer.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "push",
    getClient: () => client,
  });

  const challenge = makeChallenge({ amount: "1" });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});

test("server charge verifies a USDT0 push (hash) credential end-to-end", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDT0(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.payer.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    currency: usdt0Token,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "push",
    getClient: () => client,
  });

  const challenge = makeChallenge({
    amount: "1",
    currency: usdt0Token,
  });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});

test("server charge verifies a USDT0 pull (authorization) credential end-to-end", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDT0(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.server.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    currency: usdt0Token,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "pull",
    getClient: () => client,
  });

  const challenge = makeChallenge({
    amount: "1",
    currency: usdt0Token,
    recipient: accounts.server.address,
  });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});

test("server charge verifies a pull (authorization) credential end-to-end", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.recipient.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "pull",
    getClient: () => client,
  });

  const challenge = makeChallenge({
    amount: "1",
    recipient: accounts.recipient.address,
  });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});

test("server charge verifies TWO sequential pull (authorization) credentials from the same wallet", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.recipient.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "pull",
    getClient: () => client,
  });

  // First payment
  const challenge1 = makeChallenge({
    amount: "1",
    recipient: accounts.recipient.address,
  });
  const credentialStr1 = await clientMethod.createCredential({
    challenge: challenge1,
  } as never);
  const credential1 = Credential.deserialize(credentialStr1);

  const receipt1 = await serverMethod.verify({
    credential: credential1,
    request: { ...challenge1.request, chainId: testChainId },
  });

  expect(receipt1.status).toBe("success");
  expect(receipt1.reference).toMatch(/^0x[0-9a-f]{64}$/);

  // Second payment from the same wallet — this should also succeed
  const challenge2 = makeChallenge({
    amount: "1",
    recipient: accounts.recipient.address,
  });
  const credentialStr2 = await clientMethod.createCredential({
    challenge: challenge2,
  } as never);
  const credential2 = Credential.deserialize(credentialStr2);

  const receipt2 = await serverMethod.verify({
    credential: credential2,
    request: { ...challenge2.request, chainId: testChainId },
  });

  expect(receipt2.status).toBe("success");
  expect(receipt2.reference).toMatch(/^0x[0-9a-f]{64}$/);
});

test("server charge succeeds when server account does not match recipient", async () => {
  const client = createTestClient();

  await Promise.all([
    fundUSDC(client, accounts.payer.address, 10_000_000n),
    setBalance(client, accounts.server.address, 10n ** 18n),
  ]);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.server, // different from recipient
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "pull",
    getClient: () => client,
  });

  const challenge = makeChallenge({
    amount: "1",
    recipient: accounts.recipient.address,
  });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});
