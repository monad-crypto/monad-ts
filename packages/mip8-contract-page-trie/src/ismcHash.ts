// MIP-8 requires bare BLAKE3 compression calls with fixed states and flags;
// these are not equivalent to calling the normal BLAKE3 hash function.
// Specification: https://github.com/monad-crypto/MIPs/blob/6e78a6ac39547882f9905fba86d2c794eb1768ef/MIPs/MIP-8.md
//
// Noble exports the compression core shared by BLAKE2 and BLAKE3 from
// `blake2.js`. This module uses only those shared rounds, not BLAKE2 hashing.
import { compress as blakeCompressionRounds } from "@noble/hashes/blake2.js";

import {
  abytes,
  bytesToLittleEndianWords,
  concatBytes,
  littleEndianWordsToBytes,
  utf8ToBytes,
} from "./bytes.js";

const HASH_SIZE = 32;
const BLAKE3_BLOCK_SIZE = 64;

// BLAKE3 compression flags identify how a block is being used. MIP-8 assigns
// different flags and starting states to page pairs and parent nodes so the
// same 64 bytes cannot be interpreted in both roles.
const CHUNK_START = 1;
const CHUNK_END = 2;
const DERIVE_KEY_MATERIAL = 64;

// Fixed starting state from the BLAKE3 specification:
// https://github.com/BLAKE3-team/BLAKE3-specs/blob/ea51a3ac997288bf690ee82ac9cfc8b3e0e60f2a/blake3.pdf
const BLAKE3_IV = Uint32Array.of(
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
);

// Fixed order in which BLAKE3 reshuffles the 16 message words between rounds.
const MESSAGE_PERMUTATION = Uint8Array.of(
  2,
  6,
  3,
  10,
  7,
  0,
  4,
  13,
  1,
  11,
  12,
  5,
  9,
  14,
  15,
  8,
);

const BLAKE3_SCHEDULE = (() => {
  const schedule = new Uint8Array(7 * 16);
  let round = Uint8Array.from({ length: 16 }, (_, index) => index);
  for (let i = 0; i < 7; i++) {
    schedule.set(round, i * 16);
    round = MESSAGE_PERMUTATION.map((index) => round[index]);
  }
  return schedule;
})();

function compressBlake3Block(
  chainingValue: Uint32Array,
  block: Uint8Array,
  flags: number,
): Uint32Array {
  abytes(
    new Uint8Array(
      chainingValue.buffer,
      chainingValue.byteOffset,
      chainingValue.byteLength,
    ),
    HASH_SIZE,
    "BLAKE3 chaining value",
  );
  abytes(block, BLAKE3_BLOCK_SIZE, "BLAKE3 compression block");

  const result = blakeCompressionRounds(
    BLAKE3_SCHEDULE,
    0,
    bytesToLittleEndianWords(block),
    7,
    chainingValue[0],
    chainingValue[1],
    chainingValue[2],
    chainingValue[3],
    chainingValue[4],
    chainingValue[5],
    chainingValue[6],
    chainingValue[7],
    BLAKE3_IV[0],
    BLAKE3_IV[1],
    BLAKE3_IV[2],
    BLAKE3_IV[3],
    0,
    0,
    BLAKE3_BLOCK_SIZE,
    flags,
  );
  return Uint32Array.of(
    result.v0 ^ result.v8,
    result.v1 ^ result.v9,
    result.v2 ^ result.v10,
    result.v3 ^ result.v11,
    result.v4 ^ result.v12,
    result.v5 ^ result.v13,
    result.v6 ^ result.v14,
    result.v7 ^ result.v15,
  );
}

const PAIR_LEAF_DOMAIN = utf8ToBytes("ultra_merkle_pair_leaf_domain___");
abytes(PAIR_LEAF_DOMAIN, HASH_SIZE, "MIP-8 pair-leaf domain");
const LEAF_DOMAIN_BLOCK = concatBytes(
  PAIR_LEAF_DOMAIN,
  new Uint8Array(HASH_SIZE),
);
const LEAF_IV = compressBlake3Block(
  BLAKE3_IV,
  LEAF_DOMAIN_BLOCK,
  DERIVE_KEY_MATERIAL,
);

/** Hashes one active 64-byte pair of storage slots as a MIP-8 leaf. */
function hashPagePair(pair: Uint8Array): Uint8Array {
  return littleEndianWordsToBytes(
    compressBlake3Block(LEAF_IV, pair, DERIVE_KEY_MATERIAL),
  );
}

/** Hashes two 32-byte MIP-8 child nodes into their parent. */
function hashPageParent(left: Uint8Array, right: Uint8Array): Uint8Array {
  return littleEndianWordsToBytes(
    compressBlake3Block(
      BLAKE3_IV,
      concatBytes(left, right),
      CHUNK_START | CHUNK_END,
    ),
  );
}

export { hashPagePair, hashPageParent };
