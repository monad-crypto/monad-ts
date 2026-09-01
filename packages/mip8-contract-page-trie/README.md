# @monad-crypto/mip8-contract-page-trie

A minimal, in-memory implementation of one contract's [MIP-8](https://github.com/monad-crypto/MIPs/blob/6e78a6ac39547882f9905fba86d2c794eb1768ef/MIPs/MIP-8.md) storage page trie.

> **Warning:** This package is experimental and has not been audited. It implements consensus-critical hashing and should be independently verified before production use.

## Install

```bash
bun add @monad-crypto/mip8-contract-page-trie
```

Node.js 20.19 or newer is required.

## Usage

```ts
import { createPageTrie } from "@monad-crypto/mip8-contract-page-trie"

const trie = createPageTrie()
const slot = new Uint8Array(32)
const value = new Uint8Array(32)
value[31] = 1

trie.set(slot, value)

const stored = trie.get(slot)
const root = await trie.root()

trie.delete(slot)
```

All slot identifiers and values are exactly 32 bytes. Slot identifiers use the EVM's big-endian ordering. `get()` returns `null` for an absent or zero-valued slot, and setting a zero value is equivalent to deleting it. Inputs and returned byte arrays are copied so callers cannot accidentally change stored state.

Mutations are synchronous in-memory page updates. Rewriting a slot with its current value, or deleting an already-zero slot, is a no-op and leaves a cached root valid.

`root()` records the commitment of every non-empty page before its first asynchronous step, then inserts those commitments into a new Merkle Patricia Trie (MPT). A mutation made while a root is being assembled does not affect that root. The completed root is cached until the next mutation.

## Page primitives

```ts
import {
  PAGE_SIZE,
  PAGE_SLOTS,
  SLOT_SIZE,
  computePageCommitment,
  computePageKey,
  computeSlotOffset,
} from "@monad-crypto/mip8-contract-page-trie"
```

- `computePageKey(slot)` computes the 256-bit big-endian `slot >> 7`.
- `computeSlotOffset(slot)` computes `slot & 0x7f`.
- `computePageCommitment(page)` computes the MIP-8 page commitment for one 4096-byte page containing all 128 slot positions, including zero-valued slots.
- `SLOT_SIZE`, `PAGE_SLOTS`, and `PAGE_SIZE` are `32`, `128`, and `4096`.

Invalid byte-array types throw `TypeError`; invalid lengths throw `RangeError`.

## How page hashing works

MIP-8 calls its page hash the **Induced Subtree Merkle Commit (ISMC)**. A 16-byte bitmap first records which of the page's 128 slots are non-zero. Adjacent slots are then hashed as 64-byte pairs. Only occupied pairs enter the tree; two siblings are hashed into a parent, while a node without a sibling moves up unchanged. A final full BLAKE3 hash covers both the bitmap and the resulting tree root, binding every value to its exact slot position. For an empty page, it hashes the all-zero bitmap alone.

Leaf pairs and parent nodes use different BLAKE3 starting states. This **domain separation** prevents the same 64 bytes from being interpreted as both slot data and two child hashes. These steps use the specialized BLAKE3 compression function required by MIP-8, not a normal BLAKE3 hash call. See the pinned [MIP-8 specification](https://github.com/monad-crypto/MIPs/blob/6e78a6ac39547882f9905fba86d2c794eb1768ef/MIPs/MIP-8.md) for the exact construction.

The page commitments become values in an Ethereum-style MPT. Here, **secure MPT** means that each page key is hashed with Keccak before it determines a path through the trie. The `0xa0` byte before each commitment is the Recursive Length Prefix (RLP) marker for a 32-byte string; it is encoding, not another hash or domain separator.

## Scope and security

This is a correctness-oriented in-memory implementation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for its exact scope, consensus-critical invariants, performance limits, and security boundaries.

## License

MIT
