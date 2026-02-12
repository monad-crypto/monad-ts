# Architecture — Security Review Guide

This document describes the architecture of `@monad-crypto/viem` for security reviewers, auditors, and AI agents. For developer workflow see `CLAUDE.md`; for usage see `README.md`.

## 1. Security Scope Summary

- **Read-only**: Every action calls `readContract` (`eth_call`). Zero write operations. No transactions are signed or submitted.
- **Hardcoded targets**: Contract addresses and ABIs are constants (`src/constants.ts`). The library never constructs an address at runtime.
- **No key management**: No private keys, mnemonics, or signing capabilities. The library accepts a Viem `Client` that the caller configures.
- **Single runtime dependency**: `viem >=2` (peer dependency). No transitive runtime dependencies beyond Viem's own tree.
- **No secrets**: No API keys, tokens, environment variables, or filesystem access.

## 2. Trust Boundaries

```
┌──────────┐       ┌──────────────┐       ┌──────┐       ┌──────────┐
│  Caller  │──────▶│  This Library │──────▶│ Viem │──────▶│ RPC Node │
└──────────┘       └──────────────┘       └──────┘       └──────────┘
  provides:          does:                  does:           does:
  - Client           - spread params        - ABI encode    - execute
  - args             - overlay hardcoded     - HTTP/WS       eth_call
                       abi, address,          transport
                       functionName
                     - call readContract
```

**Boundary 1 — Caller → Library**: The caller provides a configured Viem `Client` and action parameters (e.g. validator ID, delegator address). The library performs no validation beyond TypeScript's compile-time type checking. Invalid arguments will cause a contract revert at the RPC layer.

**Boundary 2 — Library → Viem**: The library calls `readContract` from `viem/actions`. It never calls `writeContract`, `sendTransaction`, `signMessage`, or any other state-changing Viem action. Viem handles ABI encoding, transport selection, and response decoding.

**Boundary 3 — Viem → RPC Node**: The RPC endpoint is configured by the caller (via the `Client`'s `transport`). The library has no control over which node is used or whether the connection is trusted. All RPC trust assumptions are the caller's responsibility.

## 3. Data Flow

Using `getValidator` as the canonical example (`src/actions/staking/getValidator.ts`):

```
1. Caller invokes:
   Staking.getValidator(client, { args: [1n] })
     — or —
   client.staking.getValidator({ args: [1n] })

2. The action function executes:
   readContract(client, {
     ...parameters,          // caller-supplied (e.g. { args: [1n] })
     abi: stakingAbi,        // hardcoded — overwrites any caller key
     address: STAKING_ADDRESS, // hardcoded — overwrites any caller key
     functionName: "getValidator", // hardcoded — overwrites any caller key
   })

3. Viem ABI-encodes the call and sends eth_call via the client's transport.

4. The RPC node returns the ABI-encoded result; Viem decodes and returns it.
```

**Critical detail — spread ordering**: In every action, the object spread `{ ...parameters, abi, address, functionName }` places hardcoded values _after_ the spread. Per JavaScript semantics, later keys overwrite earlier ones. This means even if a caller somehow passes `abi`, `address`, or `functionName` in the parameters object, the hardcoded values always win. The TypeScript types (`Omit<..., "abi" | "address" | "functionName">`) prevent this at compile time, but the spread ordering provides runtime defense-in-depth.

## 4. Hardcoded Constants

All constants are defined in `src/constants.ts`.

| Constant | Value | Verification |
|---|---|---|
| `STAKING_ADDRESS` | `0x0000000000000000000000000000000000001000` | [Monadscan](https://monadscan.com/address/0x0000000000000000000000000000000000001000) |
| `WMON_ADDRESS` | `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A` | [Monadscan](https://monadscan.com/address/0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A) |
| `WMON_DECIMALS` | `18` | |
| `WMON_NAME` | `"Wrapped MON"` | |
| `WMON_SYMBOL` | `"WMON"` | |
| `stakingAbi` | Full precompile ABI | [Staking docs](https://docs.monad.xyz/developer-essentials/staking/staking-precompile) |
| `wmonAbi` | Standard WETH9-style ABI | |

All ABIs are declared with `as const`, enabling Viem's full literal-type inference.

## 5. Action Inventory

| # | Module | Action | ABI Function |
|---|--------|--------|-------------|
| 1 | Staking | `getValidator` | `getValidator` |
| 2 | Staking | `getDelegator` | `getDelegator` |
| 3 | Staking | `getWithdrawalRequest` | `getWithdrawalRequest` |
| 4 | Staking | `getConsensusValidatorSet` | `getConsensusValidatorSet` |
| 5 | Staking | `getSnapshotValidatorSet` | `getSnapshotValidatorSet` |
| 6 | Staking | `getExecutionValidatorSet` | `getExecutionValidatorSet` |
| 7 | Staking | `getDelegations` | `getDelegations` |
| 8 | Staking | `getDelegators` | `getDelegators` |
| 9 | Staking | `getEpoch` | `getEpoch` |
| 10 | Staking | `getProposerValId` | `getProposerValId` |
| 11 | WMON | `getBalanceOf` | `balanceOf` |
| 12 | WMON | `getAllowance` | `allowance` |

## 6. What This Library Does NOT Do

- **No transaction signing** — never calls `writeContract`, `sendTransaction`, or any signer method.
- **No key management** — never handles private keys, mnemonics, HD paths, or keystores.
- **No raw calldata construction** — delegates all ABI encoding to Viem.
- **No direct HTTP requests** — all network access goes through Viem's transport layer.
- **No `eval`, `Function()`, or dynamic code execution**.
- **No filesystem or environment variable access**.
- **No caching** — every call hits the RPC.
- **No input validation** — defers to TypeScript compile-time types and on-chain contract reverts.

## 7. Dependency Analysis

### Runtime

| Dependency | Type | Version |
|---|---|---|
| `viem` | peer | `>=2` |

No other runtime dependencies. Viem itself depends on `abitype`, `ox`, and `ws` (for WebSocket transport) — review Viem's own dependency tree separately if in scope.

### Dev only (not shipped)

`@biomejs/biome`, `@changesets/cli`, `@types/bun`, `typescript`, `viem`.

### Published package contents

The `files` field in `package.json` limits the published package to:
- `dist/` — compiled JavaScript and `.d.ts` type declarations
- `src/**/*.ts` excluding `**/*.test.ts` — source for source-map debugging

No dev tooling, configuration files, or test fixtures ship in the package.

## 8. Type Safety as Security

Each action's parameter type is defined as:

```ts
Omit<
  ReadContractParameters<typeof stakingAbi, "getValidator", args>,
  "abi" | "address" | "functionName"
>
```

This `Omit` removes `abi`, `address`, and `functionName` from the caller-facing type, so callers cannot set these keys at compile time. At runtime, the spread ordering (Section 3) provides the second layer of defense.

Additional type safety measures:
- `strict: true` in `tsconfig.json` (enables `strictNullChecks`, `strictFunctionTypes`, `noImplicitAny`, etc.)
- `noUncheckedIndexedAccess: true` — prevents silent `undefined` from index signatures.
- ABIs declared `as const` — enables Viem to infer exact argument and return types per function name, catching mismatched arguments at compile time.

## 9. ABI Completeness Note

The exported `stakingAbi` includes write functions (`delegate`, `undelegate`, `withdraw`, `claimRewards`, `compound`, `addValidator`, `changeCommission`, `externalReward`) and system functions (`syscallOnEpochChange`, `syscallReward`, `syscallSnapshot`). The exported `wmonAbi` includes write functions (`approve`, `transfer`, `transferFrom`, `deposit`, `withdraw`).

These are included intentionally for consumer convenience — they enable:
- Decoding transaction logs and events
- Building transactions with other tools
- Full type inference for the contract interface

## 10. Known Limitations

- **No input validation**: Invalid arguments (e.g. non-existent validator IDs, zero addresses) are not rejected by the library. They are passed through to the contract, which may revert or return default values.
- **RPC trust assumption**: The library trusts whatever RPC endpoint the caller configures. A malicious or faulty RPC can return incorrect data. This is inherent to the architecture — the library is a thin wrapper, not a verifier.
