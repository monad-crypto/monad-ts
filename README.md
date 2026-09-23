# monad-ts

Monorepo for Monad TypeScript libraries.

## Packages

| Package | Description |
| --- | --- |
| [`@monad-crypto/viem`](packages/viem) | Viem actions for the Monad staking precompile and WMON token |
| [`@monad-crypto/mpp`](packages/mpp) | Monad payment method for the Machine Payments Protocol |
| [`@monad-crypto/mip8-contract-page-trie`](packages/mip8-contract-page-trie) | In-memory MIP-8 page trie for one contract's storage |

## Development

```bash
bun install                # Install all dependencies
bun run build              # Build all packages
bun run lint               # Lint and format check (biome)
bun run typecheck          # Type-check all packages
bun run test               # Run tests in all packages
```
