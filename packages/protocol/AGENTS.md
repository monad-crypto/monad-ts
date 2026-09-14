# AGENTS.md

This file provides guidance to coding agents working on `@monad-crypto/protocol`.

## Commands

Run from the repo root:

```bash
bun test --cwd packages/protocol               # Run tests
bun run --cwd packages/protocol build          # Build
bun run --cwd packages/protocol typecheck      # Type-check
bun run --cwd packages/protocol test:coverage  # Run tests with coverage
```

## Consensus-sensitive changes

- Before changing `src/page.ts`, `src/ismcHash.ts`, the MPT encoding in `src/PageTrie.ts`, dependencies, or root snapshotting, read the relevant sections and review checklist in [ARCHITECTURE.md](./ARCHITECTURE.md). That document is the canonical source for invariants and security boundaries; do not duplicate them here.
- Update `ARCHITECTURE.md` and the conformance fixtures whenever an invariant, dependency, or trust boundary changes.

## Package map

- `src/bytes.ts` contains internal byte helpers.
- `src/page.ts` implements page addressing and commitment-tree construction.
- `src/ismcHash.ts` adapts Noble's compression rounds to the exact MIP-8 leaf and parent hashes.
- `src/PageTrie.ts` implements storage operations and root construction.
- `src/index.ts` is the complete public export surface.
- `tests/` contains conformance and behavioral tests.
