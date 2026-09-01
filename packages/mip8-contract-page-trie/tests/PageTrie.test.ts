import { describe, expect, test } from "bun:test";
import { createMPT } from "@ethereumjs/mpt";
import { bytesToHex } from "@noble/hashes/utils.js";
import * as publicApi from "../src/index.js";
import { createPageTrie } from "../src/index.js";
import type { PageTrie } from "../src/PageTrie.js";
import {
  computePageCommitment,
  computePageKey,
  PAGE_SIZE,
  SLOT_SIZE,
} from "../src/page.js";
import { uint256 } from "./utils.js";

// The page commitments underlying these roots are cross-checked against the
// pinned official Python reference:
// https://github.com/category-labs/monad/blob/68d444b6937592d43db1013161a6c2b7b3f55be5/scripts/page_commit_reference.py
// MPT composition follows the pinned MIP-8 specification:
// https://github.com/monad-crypto/MIPs/blob/6e78a6ac39547882f9905fba86d2c794eb1768ef/MIPs/MIP-8.md
const ROOT_FIXTURES = {
  empty: "56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
  singleSlot:
    "29612e2a4d60ff8ea37cd72e9ed9dba7ae3329b31b3ff9127b531951c100937b",
  multiplePages:
    "775e329db94de90aa7838a2100d87ce4554743a3c53e17af6c08ec8ae30d2e2e",
  multiplePagesWithoutPage1:
    "6fe15d13e490eccd84df0e2d452fe2c2eb4920e6ea164c85a0235be5e4d09292",
  page0Only: "5a288fbd769c48b925182c924fffa24f252c0ec4f8c2d5d2dcf41f11b08ad20f",
} as const;
const MULTI_PAGE_ENTRIES = [
  [0n, 11n],
  [1n, 12n],
  [127n, 13n],
  [128n, 14n],
  [511n, 15n],
] as const;

async function rootHex(trie: PageTrie): Promise<string> {
  return bytesToHex(await trie.root());
}

describe("PageTrie roots", () => {
  test("exports only the documented runtime API", () => {
    expect(Object.keys(publicApi).sort()).toEqual([
      "PAGE_SIZE",
      "PAGE_SLOTS",
      "SLOT_SIZE",
      "computePageCommitment",
      "computePageKey",
      "computeSlotOffset",
      "createPageTrie",
    ]);
  });

  test("starts at the canonical empty MPT root", async () => {
    expect(await rootHex(createPageTrie())).toBe(ROOT_FIXTURES.empty);
  });

  test("matches the fixed single-slot root fixture", async () => {
    const trie = createPageTrie();
    trie.set(uint256(0n), uint256(1n));

    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.singleSlot);
  });

  test("matches the fixed multi-page root fixture", async () => {
    const sequential = createPageTrie();
    const reverseOrdered = createPageTrie();

    for (const [slot, value] of MULTI_PAGE_ENTRIES) {
      sequential.set(uint256(slot), uint256(value));
    }
    for (const [slot, value] of [...MULTI_PAGE_ENTRIES].reverse()) {
      reverseOrdered.set(uint256(slot), uint256(value));
    }

    expect(await rootHex(sequential)).toBe(ROOT_FIXTURES.multiplePages);
    expect(await rootHex(reverseOrdered)).toBe(ROOT_FIXTURES.multiplePages);
  });

  test("matches fixed roots while deleting whole pages", async () => {
    const trie = createPageTrie();
    for (const [slot, value] of MULTI_PAGE_ENTRIES) {
      trie.set(uint256(slot), uint256(value));
    }

    trie.delete(uint256(128n));
    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.multiplePagesWithoutPage1);

    trie.delete(uint256(511n));
    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.page0Only);
  });

  test("returns defensive copies of cached roots", async () => {
    const trie = createPageTrie();
    const expected = await trie.root();
    const returned = await trie.root();

    returned.fill(0xff);

    expect(await trie.root()).toEqual(expected);
  });

  test("invalidates the cached root after a mutation", async () => {
    const trie = createPageTrie();
    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.empty);

    trie.set(uint256(0n), uint256(1n));

    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.singleSlot);
  });

  test("captures its state before asynchronous MPT construction", async () => {
    const trie = createPageTrie();
    trie.set(uint256(0n), uint256(1n));

    const firstRoot = trie.root();
    trie.set(uint256(128n), uint256(2n));

    expect(bytesToHex(await firstRoot)).toBe(ROOT_FIXTURES.singleSlot);
    expect(await rootHex(trie)).not.toBe(ROOT_FIXTURES.singleSlot);
  });
});

describe("PageTrie storage", () => {
  test("sets, gets, and deletes a slot", async () => {
    const trie = createPageTrie();
    const slot = uint256(42n);
    const value = uint256(99n);

    expect(trie.get(slot)).toBeNull();
    trie.set(slot, value);
    expect(trie.get(slot)).toEqual(value);
    trie.delete(slot);
    expect(trie.get(slot)).toBeNull();
    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.empty);
  });

  test("treats a zero-word write as deletion", async () => {
    const trie = createPageTrie();
    const slot = uint256(7n);

    trie.set(slot, uint256(1n));
    trie.set(slot, new Uint8Array(SLOT_SIZE));

    expect(trie.get(slot)).toBeNull();
    expect(await rootHex(trie)).toBe(ROOT_FIXTURES.empty);
  });

  test("preserves untouched words in the same page", () => {
    const trie = createPageTrie();
    trie.set(uint256(3n), uint256(30n));
    trie.set(uint256(4n), uint256(40n));

    trie.delete(uint256(3n));

    expect(trie.get(uint256(3n))).toBeNull();
    expect(trie.get(uint256(4n))).toEqual(uint256(40n));
  });

  test("stores words on different pages", () => {
    const trie = createPageTrie();

    trie.set(uint256(127n), uint256(1n));
    trie.set(uint256(128n), uint256(2n));

    expect(trie.get(uint256(127n))).toEqual(uint256(1n));
    expect(trie.get(uint256(128n))).toEqual(uint256(2n));
  });

  test("copies mutation inputs during synchronous writes", () => {
    const trie = createPageTrie();
    const slot = uint256(5n);
    const originalSlot = slot.slice();
    const value = uint256(55n);
    const originalValue = value.slice();

    trie.set(slot, value);
    slot.fill(0xff);
    value.fill(0xff);

    expect(trie.get(originalSlot)).toEqual(originalValue);
  });

  test("returns defensive value copies", () => {
    const trie = createPageTrie();
    const slot = uint256(6n);
    const value = uint256(66n);
    trie.set(slot, value);

    const returned = trie.get(slot);
    returned?.fill(0xff);

    expect(trie.get(slot)).toEqual(value);
  });
});

describe("MIP-8 MPT encoding", () => {
  test("stores RLP-wrapped commitments under unhashed page keys", async () => {
    const trie = createPageTrie();
    const slot = uint256(0n);
    const value = uint256(1n);
    trie.set(slot, value);

    const page = new Uint8Array(PAGE_SIZE);
    page.set(value);
    const mptValue = new Uint8Array(SLOT_SIZE + 1);
    mptValue[0] = 0xa0;
    mptValue.set(computePageCommitment(page), 1);
    const expected = await createMPT({
      cacheSize: 0,
      useKeyHashing: true,
      useRootPersistence: false,
    });
    await expected.put(computePageKey(slot), mptValue);

    expect(await trie.root()).toEqual(expected.root());
  });
});

describe("PageTrie validation", () => {
  test("rejects invalid slots and values", () => {
    const trie = createPageTrie();

    expect(() => trie.get([] as unknown as Uint8Array)).toThrow(TypeError);
    expect(() => trie.get(new Uint8Array(31))).toThrow(RangeError);
    expect(() => trie.delete(new Uint8Array(33))).toThrow(RangeError);
    expect(() => trie.set(uint256(0n), [] as unknown as Uint8Array)).toThrow(
      TypeError,
    );
    expect(() => trie.set(uint256(0n), new Uint8Array(31))).toThrow(RangeError);
  });
});
