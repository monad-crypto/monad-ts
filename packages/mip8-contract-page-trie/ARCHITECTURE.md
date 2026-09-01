# Architecture — Security Review Guide

This document describes the security and consensus boundaries of `@monad-crypto/mip8-contract-page-trie`. Usage is documented in [README.md](./README.md).

## 1. Scope

The package implements the in-memory MIP-8 storage trie for one contract:

- 32-byte storage slots are grouped into dense 4096-byte pages.
- Each non-empty page is committed with MIP-8 ISMC.
- Page commitments are folded into a fresh secure Ethereum Merkle Patricia Trie (MPT) when a root is requested.
- The package exposes reads, writes, deletion, roots, and page primitives.

There is no persistence or API for restoring from an existing root. A new trie is always empty. Proofs, public checkpoints, world-state composition, iteration, pruning, gas accounting, and production or high-performance use are outside this package's security scope.

## 2. Consensus-Critical Invariants

| Invariant | Definition |
| --- | --- |
| Slot size | 32 bytes |
| Slots per page | 128 |
| Dense page size | 4096 bytes |
| Page key | 256-bit big-endian `slot >> 7` |
| Slot offset | `slot & 0x7f` |
| Empty slots | All-zero 32-byte words |
| Empty pages | Never inserted into the MPT |
| MPT key | Unhashed 32-byte page key passed to an MPT configured with secure key hashing |
| MPT value | `0xa0 || computePageCommitment(page)`; the MPT then applies its normal outer RLP encoding |
| Empty root | `0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421` |

Changing any item in this table changes roots or storage semantics and requires new conformance fixtures and an architecture review.

## 3. ISMC Page Commitment

`src/page.ts` implements the induced-tree algorithm in the pinned [Final MIP-8 specification](https://github.com/monad-crypto/MIPs/blob/6e78a6ac39547882f9905fba86d2c794eb1768ef/MIPs/MIP-8.md):

1. Build a 128-bit bitmap where bit `i` marks a non-zero slot.
2. Hash every active 64-byte slot pair with the specialized bare BLAKE3 leaf compression.
3. Merge active nodes bottom-up with the specialized bare BLAKE3 parent compression. Singleton nodes carry upward unchanged.
4. Seal the little-endian 16-byte bitmap and optional 32-byte induced-tree root with full BLAKE3 from `@noble/hashes`.

The empty-page commitment is the full BLAKE3 hash of a zero 16-byte bitmap. It is a valid result from `computePageCommitment()`, but `PageTrie` deletes rather than inserts an empty page.

`src/ismcHash.ts` isolates the specialized compression adapter. It fixes the BLAKE3 counter to zero, validates the 32-byte chaining value and 64-byte block, fixes the block length at 64 bytes, and applies the flags exactly as specified. The adapter assembles that state and delegates only the seven standard ARX rounds to `@noble/hashes`' exported BLAKE compression core. Noble exposes this shared BLAKE2/BLAKE3 core from `blake2.js`; this package does not use the BLAKE2 hash function. The compression must not be replaced by a general-purpose BLAKE3 hash call.

## 4. MPT Composition

For every uncached `root()` call, `src/PageTrie.ts` snapshots the current page commitments and creates a new `@ethereumjs/mpt` with:

- `useKeyHashing: true`
- `cacheSize: 0`
- root persistence disabled

The new MPT is populated from the snapshot, its root is copied, and the MPT is discarded. Node pruning and historical MPT nodes therefore do not affect retained state.

The page key is passed to the MPT before hashing. In this context, “secure MPT” means that Keccak hashes the key before trie traversal; it is not an audit claim. The stored raw value begins with the RLP short-string prefix `0xa0`, followed by the 32-byte page commitment. EthereumJS then RLP-encodes that 33-byte value as part of the MPT leaf. The prefix is encoding rather than domain separation, and removing it changes every non-empty root.

## 5. State and Root Model

The private dense-page map is the only long-lived state. The public storage behavior is documented in [README.md](./README.md). The mutation revision advances only when stored bytes change; every advance invalidates the completed-root cache.

`root()` is asynchronous and handled as follows:

1. Capture the current mutation revision.
2. Compute the key and MIP-8 commitment for every non-empty page before the first `await`.
3. Fold those immutable leaves into a fresh secure MPT.
4. Copy and return the resulting root.
5. Cache the root only if the mutation revision is unchanged.

This makes every root represent the state visible when `root()` was called. A mutation made while its MPT is being assembled cannot affect the in-flight root and prevents that older result from entering the cache. Every state-changing mutation invalidates the completed-root cache.

An uncached root rebuild scales with the total number of non-empty pages. Repeated root reads without a mutation use the cache. This tradeoff intentionally favors a small, auditable correctness implementation over incremental-update performance.

## 6. Input and Memory Boundaries

- Public slot keys and values must be `Uint8Array` instances of exactly 32 bytes.
- `computePageCommitment()` accepts only a 4096-byte `Uint8Array`.
- Type violations throw `TypeError`; size violations throw `RangeError`.
- Byte-array instances and exact lengths are validated at each public operation boundary by `@noble/hashes`' byte assertion.
- Slot keys are reduced to page keys synchronously, and values are copied into private dense pages, so later mutation of caller-owned inputs cannot change stored state.
- Values returned by `get()` and `root()` are copies.
- Dense pages and the page map are private. Root construction operates on snapshotted keys and commitments rather than mutable pages.

The package uses no filesystem, environment variables, network access, Node.js buffers, secrets, or dynamic code execution.

## 7. Dependencies

| Dependency | Version | Purpose |
| --- | --- | --- |
| `@ethereumjs/mpt` | `10.1.2` | Secure in-memory Merkle Patricia Trie |
| `@noble/hashes` | `2.2.0` | BLAKE compression rounds, full BLAKE3 seals, and byte utilities |

Both versions are exact pins. Dependency upgrades require rerunning all commitment and root fixtures, root-snapshot tests, and audit.

## 8. Source and Conformance Boundary

The MIP-specific implementation is derived from the CC0 MIP and the official BLAKE3 specification. The standard ARX rounds and byte utilities come from the exact-pinned MIT-licensed `@noble/hashes`; no GPL implementation code is included. Tests mirror all four fixed-output vectors published by the official client's pinned [Python reference](https://github.com/category-labs/monad/blob/68d444b6937592d43db1013161a6c2b7b3f55be5/scripts/page_commit_reference.py) and [C++ cross-check](https://github.com/category-labs/monad/blob/68d444b6937592d43db1013161a6c2b7b3f55be5/category/execution/monad/db/test_storage_page.cpp). Additional sparse merge-schedule outputs and five deterministic pseudorandom page commitments were generated from the same pinned Python reference.

Root fixtures additionally cover the standard empty MPT root and fixed single-page and multi-page MPT roots, including whole-page deletion and branch collapse. Their page commitments are cross-checked against the pinned [Python reference](https://github.com/category-labs/monad/blob/68d444b6937592d43db1013161a6c2b7b3f55be5/scripts/page_commit_reference.py), and their MPT composition follows the pinned [MIP-8 specification](https://github.com/monad-crypto/MIPs/blob/6e78a6ac39547882f9905fba86d2c794eb1768ef/MIPs/MIP-8.md). These fixtures detect changes to page grouping, secure-key hashing, the explicit value prefix, or outer MPT RLP encoding. Behavioral tests cover defensive cached-root copies and mutations made while a root is being assembled.

## 9. Review Checklist

Before changing consensus-sensitive code:

- Confirm the pinned MIP revision and BLAKE3 constants, flags, word endianness, and message schedule.
- Preserve the exact-pinned Noble compression-core boundary and rerun every conformance fixture after dependency changes.
- Preserve big-endian slot grouping and little-endian bitmap sealing.
- Preserve induced-tree singleton carrying.
- Preserve secure MPT key hashing and `0xa0` value prefixing.
- Keep empty pages out of the MPT.
- Snapshot every page commitment before the first asynchronous step in `root()`.
- Cache a completed root only when its captured mutation revision is still current.
- Run package tests, typecheck, build, coverage, Biome, and dependency audit.
