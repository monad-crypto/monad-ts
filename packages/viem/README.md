# monad-ts

TypeScript library for Monad-specific protocol features. Provides [Viem](https://viem.sh) actions for interacting with the staking precompile and WMON token on Monad.

## Installation

```bash
bun add @monad-crypto/viem
```

```bash
npm install @monad-crypto/viem
```

## Quick Start

```ts
import { createPublicClient, http } from "viem";
import { monad } from "viem/chains";
import { monadActions } from "@monad-crypto/viem";

const client = createPublicClient({
  transport: http("https://rpc.monad.xyz"),
  chain: monad,
}).extend(monadActions());

const validator = await client.staking.getValidator({ args: [10] });
console.log(validator);

const epoch = await client.staking.getEpoch();
console.log(epoch);

const balance = await client.wmon.getBalanceOf({ args: ["0x..."] });
console.log(balance);
```
## API Reference

### Staking

All actions query the staking precompile at `Staking.ADDRESS` (`0x0000000000000000000000000000000000001000`).

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

Constants: `Staking.ADDRESS`, `Staking.abi`

### WMON

All actions query the wrapped Monad token at `Wmon.ADDRESS` (`0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`).


| Action | Description |
| --- | --- |
| `getBalanceOf` | Get the WMON balance of an address |
| `getAllowance` | Get the WMON allowance for a spender |

Constants: `Wmon.ADDRESS`, `Wmon.DECIMALS`, `Wmon.NAME`, `Wmon.SYMBOL`, `Wmon.abi`

## Links

- [Monad Staking Precompile Docs](https://docs.monad.xyz/developer-essentials/staking/staking-precompile)
