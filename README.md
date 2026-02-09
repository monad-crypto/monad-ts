# monad-ts

TypeScript library for Monad-specific protocol features. Provides [Viem](https://viem.sh) actions for interacting with the staking precompile on Monad.

## Installation

```bash
bun add monad-ts
```

```bash
npm install monad-ts
```

## Quick Start

```ts
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { monadActions } from "monad-ts";

const client = createPublicClient({
  transport: http("https://rpc.monad.xyz"),
  chain: monad,
}).extend(monadActions());

const validator = await client.getValidator({ args: [10] });
console.log(validator);

const epoch = await client.getEpoch();
console.log(epoch);
```

## API Reference

### Staking Precompile Actions

All actions query the staking precompile at `0x0000000000000000000000000000000000001000`.

| Action | Description |
| --- | --- |
| `getValidator` | Get details for a validator by ID |
| `getDelegator` | Get delegator information |
| `getDelegations` | Get all delegations for an address |
| `getDelegators` | Get all delegators for a validator |
| `getConsensusValidatorSet` | Get the current consensus validator set |
| `getExecutionValidatorSet` | Get the current execution validator set |
| `getSnapshotValidatorSet` | Get the snapshot validator set |
| `getEpoch` | Get the current epoch info |
| `getProposerValId` | Get the current block proposer's validator ID |
| `getWithdrawalRequest` | Get withdrawal request details |

## Staking Precompile ABI

The staking precompile ABI is exported directly:

```ts
import { stakingAbi } from "monad-ts";
```

## Staking Precompile Address

The staking precompile address is exported directly:

```ts
import { STAKING_ADDRESS } from "monad-ts";
```

## Links

- [Monad Staking Precompile Docs](https://docs.monad.xyz/developer-essentials/staking/staking-precompile)
