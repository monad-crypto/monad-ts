# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a bun workspaces monorepo. Packages live under `packages/`.

| Package | Path |
| --- | --- |
| `@monad-crypto/viem` | `packages/viem/` |

## Commands

```bash
# Root (all packages)
bun run build                         # Build all packages
bun run lint                          # Lint and format check (biome)
bun run test                          # Run tests in all packages
bun run typecheck                     # Type-check all packages

# Package-level (from repo root)
bun test --cwd packages/viem          # Run tests for @monad-crypto/viem
bun run --cwd packages/viem build     # Build @monad-crypto/viem
bun run --cwd packages/viem typecheck # Type-check @monad-crypto/viem
```

## Conventions

- Use bun as the package manager and runtime (not npm/yarn/node).
- JSDoc on each action in the `MonadActions` decorator type (`packages/viem/src/decorator.ts`) must exactly match the JSDoc on the corresponding action's implementation function.
- Formatting: 2-space indent, double quotes (enforced by Biome).
- All imports use `.js` extensions (ESM with `verbatimModuleSyntax`).
- When adding, removing, or changing actions, contracts, constants, or trust boundaries, update `packages/viem/ARCHITECTURE.md` to reflect the change (e.g. the action inventory table, hardcoded constants table, or security scope).

## Architecture

`@monad-crypto/viem` is a Viem extension library providing read actions for the Monad staking precompile and WMON token.

### Dual API surface

The library exposes two ways to call every action:

1. **Namespace imports** — standalone functions: `Staking.getValidator(client, params)`, `Wmon.getBalanceOf(client, params)`
2. **Client decorator** — `monadActions()` extends a Viem client so actions are called as `client.staking.getValidator(params)`, `client.wmon.getBalanceOf(params)`

Both paths call the same implementation function.

### Key files

- `packages/viem/src/constants.ts` — ABIs (`stakingAbi`, `wmonAbi`) and contract addresses/metadata. All actions import from here.
- `packages/viem/src/decorator.ts` — `MonadActions` type (the decorator shape with JSDoc) and `monadActions()` factory that wires actions to the client.
- `packages/viem/src/actions/staking/index.ts`, `packages/viem/src/actions/wmon/index.ts` — namespace barrel files that re-export actions and also alias constants (e.g. `STAKING_ADDRESS as ADDRESS`).
- `packages/viem/src/index.ts` — top-level entry: re-exports `Staking` and `Wmon` namespaces plus decorator.
- `packages/viem/ARCHITECTURE.md` — security-focused architecture documentation for auditors and AI agents.

### Action pattern

Every action file (e.g. `packages/viem/src/actions/staking/getValidator.ts`) follows the same structure:
1. Define `Parameters`, `ReturnType`, and `ErrorType` types derived from Viem's `ReadContractParameters`/`ReadContractReturnType`, omitting `abi`, `address`, and `functionName`.
2. Export an `async function` that calls `readContract` with the fixed ABI, address, and function name.

### Adding a new action

1. Create `packages/viem/src/actions/<module>/<actionName>.ts` following the existing pattern.
2. Create `packages/viem/src/actions/<module>/<actionName>.test.ts` with an inline snapshot test against the live RPC (use `FORK_BLOCK_NUMBER` from `packages/viem/test/setup.ts` for determinism).
3. Re-export from `packages/viem/src/actions/<module>/index.ts`.
4. Wire into `packages/viem/src/decorator.ts`: add the import, add the JSDoc-annotated method to `MonadActions` type, and add the implementation to `monadActions()`.

### Tests

Tests run against Monad mainnet RPC (`https://rpc.monad.xyz`) using `bun:test`. Most use `toMatchInlineSnapshot` at a pinned `FORK_BLOCK_NUMBER` for deterministic assertions.
