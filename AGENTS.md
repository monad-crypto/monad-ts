# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun test                              # Run all tests
bun test src/actions/staking/getValidator.test.ts  # Run a single test file
bun run build                         # Build (tsc -p tsconfig.build.json → dist/)
bun run lint                          # Lint and format check (biome)
bun run typecheck                     # Type-check without emitting (tsc --noEmit)
```

## Conventions

- Use bun as the package manager and runtime (not npm/yarn/node).
- JSDoc on each action in the `MonadActions` decorator type (`src/decorator.ts`) must exactly match the JSDoc on the corresponding action's implementation function.
- Formatting: 2-space indent, double quotes (enforced by Biome).
- All imports use `.js` extensions (ESM with `verbatimModuleSyntax`).
- When adding, removing, or changing actions, contracts, constants, or trust boundaries, update `ARCHITECTURE.md` to reflect the change (e.g. the action inventory table, hardcoded constants table, or security scope).

## Architecture

This is `@monad-crypto/viem` — a Viem extension library providing read actions for the Monad staking precompile and WMON token.

### Dual API surface

The library exposes two ways to call every action:

1. **Namespace imports** — standalone functions: `Staking.getValidator(client, params)`, `Wmon.getBalanceOf(client, params)`
2. **Client decorator** — `monadActions()` extends a Viem client so actions are called as `client.staking.getValidator(params)`, `client.wmon.getBalanceOf(params)`

Both paths call the same implementation function.

### Key files

- `src/constants.ts` — ABIs (`stakingAbi`, `wmonAbi`) and contract addresses/metadata. All actions import from here.
- `src/decorator.ts` — `MonadActions` type (the decorator shape with JSDoc) and `monadActions()` factory that wires actions to the client.
- `src/actions/staking/index.ts`, `src/actions/wmon/index.ts` — namespace barrel files that re-export actions and also alias constants (e.g. `STAKING_ADDRESS as ADDRESS`).
- `src/index.ts` — top-level entry: re-exports `Staking` and `Wmon` namespaces plus decorator.
- `ARCHITECTURE.md` — security-focused architecture documentation for auditors and AI agents.

### Action pattern

Every action file (e.g. `src/actions/staking/getValidator.ts`) follows the same structure:
1. Define `Parameters`, `ReturnType`, and `ErrorType` types derived from Viem's `ReadContractParameters`/`ReadContractReturnType`, omitting `abi`, `address`, and `functionName`.
2. Export an `async function` that calls `readContract` with the fixed ABI, address, and function name.

### Adding a new action

1. Create `src/actions/<module>/<actionName>.ts` following the existing pattern.
2. Create `src/actions/<module>/<actionName>.test.ts` with an inline snapshot test against the live RPC (use `FORK_BLOCK_NUMBER` from `test/setup.ts` for determinism).
3. Re-export from `src/actions/<module>/index.ts`.
4. Wire into `src/decorator.ts`: add the import, add the JSDoc-annotated method to `MonadActions` type, and add the implementation to `monadActions()`.

### Tests

Tests run against Monad mainnet RPC (`https://rpc.monad.xyz`) using `bun:test`. Most use `toMatchInlineSnapshot` at a pinned `FORK_BLOCK_NUMBER` for deterministic assertions.
