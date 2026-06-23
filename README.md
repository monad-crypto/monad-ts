# monad-ts

Monorepo for Monad TypeScript libraries.

## Packages

| Package | Description |
| --- | --- |
| [`@monad-crypto/viem`](packages/viem) | Viem actions for the Monad staking precompile and WMON token |
| [`@monad-crypto/mpp`](packages/mpp) | Monad payment method for the Machine Payments Protocol |
| [`@monad-crypto/eth_query`](packages/eth_query) | TypeScript client for Monad `eth_query` JSON-RPC methods |

## Development

```bash
bun install                # Install all dependencies
bun run build              # Build all packages
bun run lint               # Lint and format check (biome)
bun run typecheck          # Type-check all packages
bun run test               # Run tests in all packages
```
