# Architecture — Security Review Guide

This document describes the architecture of `@monad-crypto/mpp` for security reviewers, auditors, and AI agents. For developer workflow see `CLAUDE.md`; for usage see `README.md`.

## 1. Security Scope Summary

- **Settlement layer**: The library creates and verifies on-chain ERC-20 payments. It signs transactions (client) and broadcasts transactions (client or server). Both sides handle private keys indirectly through Viem wallet clients.
- **Two credential modes**: Push (client broadcasts a transfer, server verifies the receipt) and Pull (client signs an ERC-3009 authorization, server broadcasts `transferWithAuthorization`).
- **Hardcoded defaults**: Chain IDs, token addresses, and ERC-3009 metadata are constants in `src/defaults.ts`. They can be overridden by callers.
- **Runtime dependencies**: `viem >=2.46.2` (peer), `mppx >=0.4.8` (peer), `zod` (direct — schema validation).
- **No secrets**: No API keys or environment variables. RPC URLs and accounts are provided by the caller.

## 2. Trust Boundaries

There are three trust boundaries, marked B1–B3 in the diagram below.

```
              Push mode                          Pull mode

            Client                              Client
              │                                   │
              │ broadcast transfer                │ sign ERC-3009 authorization
              ▼                                   │
            Monad                                 │ credential (HTTP)
              │                                   │
              │ tx hash                      B1───┘
              ▼                                   │
            Client ──B1──▶ Server                 ▼
                            │                   Server
                            │ getTransactionReceipt │
                       B2───┘                       │ transferWithAuthorization
                            │                  B2───┘
                            ▼                       │
                          Monad ◀──B3──▶ ERC-20   Monad ◀──B3──▶ ERC-20
```

**B1 — Client → Server**: The credential is transmitted via HTTP `Authorization` header per the mppx protocol. The server trusts nothing in the credential without on-chain verification.

**B2 — Server → RPC**: The server verifies credentials by reading on-chain state (push) or broadcasting a transaction (pull). A malicious or faulty RPC can return incorrect data — this is the caller's responsibility to mitigate via provider selection.

**B3 — RPC → ERC-20 Contract**: In pull mode, the server calls `transferWithAuthorization` on the token contract. The EIP-712 signature binds the `to` address, ensuring funds reach the intended recipient regardless of who submits the transaction. In push mode, the contract emits `Transfer` events that the server reads for verification.

## 3. Data Flow

### Push Mode (Client Broadcasts)

```
1. Server issues 402 challenge with amount, currency, recipient, expires.

2. Client creates credential:
   a. Resolves wallet account and viem client for the chain.
   b. Calls sendTransactionSync() to broadcast ERC-20 transfer(recipient, amount).
   c. Serializes credential: { type: "hash", hash: "0x..." }.

3. Server verifies credential:
   a. Extracts sender address from the credential's DID source.
   b. Fetches transaction receipt via eth_getTransactionReceipt.
   c. Parses ERC-20 Transfer event logs.
   d. Verifies: contract == currency, from == sender, to == recipient, value == amount.
   e. Returns receipt with transaction hash.
```

### Pull Mode (ERC-3009 Authorization)

```
1. Server issues 402 challenge with amount, currency, recipient, expires.

2. Client creates credential:
   a. Resolves wallet account and viem client.
   b. Verifies token supports ERC-3009 (lookup in erc3009Tokens registry).
   c. Generates random 32-byte nonce for replay protection.
   d. Signs EIP-712 typed data for TransferWithAuthorization:
      - Domain: { name, version, chainId, verifyingContract: currency }
      - Message: { from, to, value, validAfter: 0, validBefore: expires, nonce }
   e. Serializes credential: { type: "authorization", from, to, value, validAfter,
      validBefore, nonce, signature }.

3. Server verifies credential:
   a. Validates: to == recipient, value == amount, validBefore not passed.
   b. Splits signature into v, r, s.
   c. Calls transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)
      on the token contract.
   d. Waits for on-chain confirmation (configurable).
   e. Returns receipt with transaction hash.
```

## 4. Hardcoded Constants

All constants are defined in `src/defaults.ts`.

| Constant | Value | Description |
|---|---|---|
| `chainId.mainnet` | `143` | Monad mainnet chain ID |
| `chainId.testnet` | `10143` | Monad testnet chain ID |
| `tokens.usdc` | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` | USDC on Monad mainnet |
| `decimals` | `6` | USDC decimals |
| `tokenDecimals` | `{ USDC: 6, USDT0: 6 }` | Known token decimals. Any other `currency` requires an explicit `decimals` |
| `rpc[143]` | `https://rpc.monad.xyz` | Mainnet RPC |
| `rpc[10143]` | `https://testnet-rpc.monad.xyz` | Testnet RPC |

**ERC-3009 Token Registry** (`erc3009Tokens`): Maps lowercase token addresses to `{ name, version }` for EIP-712 domain construction. Currently contains USDC (`name: "USDC"`, `version: "2"`) and USDT0 (`name: "USDT0"`, `version: "1"`).

**ERC-3009 ABI** (`erc3009Abi`): Contains `transferWithAuthorization`, `receiveWithAuthorization`, `name()`, and `version()` function definitions.

## 5. Module Inventory

| # | Module | File | Purpose |
|---|--------|------|---------|
| 1 | Base Method | `src/Methods.ts` | Defines the mppx charge method schema (request, credential, transform) |
| 2 | Defaults | `src/defaults.ts` | Chain IDs, tokens, RPC URLs, ABIs, `resolveCurrency()`, `resolveDecimals()` |
| 3 | Client Charge | `src/client/Charge.ts` | `createCredential()` — signs or broadcasts payments |
| 4 | Client Methods | `src/client/Methods.ts` | Wraps client Charge into mppx method |
| 5 | Server Charge | `src/server/Charge.ts` | `verify()` — validates credentials on-chain |
| 6 | Server Methods | `src/server/Methods.ts` | Wraps server Charge into mppx method |

## 6. Security Properties

### Replay Protection

- **Push mode**: EVM transaction nonce + chain ID prevent replay.
- **Pull mode**: Random `bytes32` nonce per authorization, enforced by the ERC-3009 contract. Once consumed, the nonce is marked used on-chain.

### Amount and Recipient Verification

- **Server always verifies on-chain**: Push mode checks Transfer event logs. Pull mode passes amount/recipient to the contract call.
- **Pull mode recipient binding**: The EIP-712 signature locks the `to` address. Funds cannot be redirected to a different recipient because the signature would be invalid.
- **Decimals are never guessed**: `amount` is converted to base units with the token's decimals, and ERC-20 transfers carry no decimals field for the chain to check. `charge()` therefore resolves decimals only for known tokens and throws for any other `currency`, so a wrong value cannot silently settle the wrong amount.

### Expiration

- Challenge `expires` auth-param enforces a time window. Server rejects expired challenges before any on-chain interaction.
- Pull mode `validBefore` is set to the challenge expiration (or 1 hour from creation). The contract enforces this independently.

### Sender Verification

- **Push mode**: Server extracts expected sender from the credential's DID (`did:pkh:eip155:chainId:address`) and matches against the Transfer event's `from` field.
- **Pull mode**: The token contract verifies the EIP-712 signature via `ecrecover`.

## 7. What This Library Does NOT Do

- **No balance checks before payment** — insufficient balance is discovered at transaction time, not before.
- **No off-chain signature verification** — pull mode relies entirely on the on-chain contract to validate signatures.
- **No gas estimation** — uses Viem defaults.
- **No retry logic** — a failed transaction is a failed payment.
- **No caching** — every verification hits the RPC.
- **No input sanitization** — defers to Zod schemas at the protocol layer and TypeScript types at compile time.

## 8. Denial of Service Risks

1. **Gas griefing (pull mode)**: The server pays gas for `transferWithAuthorization`. A malicious client can submit authorizations that revert on-chain (e.g., insufficient balance, already-used nonce). Mitigation is the caller's responsibility — rate limiting, balance pre-checks, client authentication.

2. **RPC dependency**: Both modes require RPC calls for verification. RPC rate limits or downtime block settlement. Mitigation: caller-provided fallback providers via `getClient()`.

## 9. Dependency Analysis

| Dependency | Type | Version | Purpose |
|---|---|---|---|
| `viem` | peer | `>=2.46.2` | Transaction signing, ABI encoding, RPC transport |
| `mppx` | peer | `>=0.4.8` | Payment method protocol framework |
| `zod` | direct | `4.3.6` | Schema validation for challenge/credential payloads |

## 10. Known Limitations

- **ERC-3009 token allowlist**: Pull mode only works with tokens registered in `erc3009Tokens`. Adding a new token requires a code change to `defaults.ts`.
- **Single-chain**: Each credential targets one chain. Cross-chain payments are not supported.
- **No partial payments**: The full challenge amount must be paid in a single transaction.
- **RPC trust assumption**: The library trusts whatever RPC endpoint the caller configures. A malicious RPC can return fabricated receipts (push mode) or suppress transactions (pull mode).
- **Server key requirement (pull mode)**: The server must hold a private key funded with native tokens to pay gas for `transferWithAuthorization`. The server account does not need to match the recipient address.
