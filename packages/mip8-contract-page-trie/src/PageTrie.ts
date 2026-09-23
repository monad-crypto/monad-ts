import { createMPT } from "@ethereumjs/mpt";

import {
  abytes,
  bytesToHex,
  concatBytes,
  copyBytes,
  equalBytesAt,
  hexToBytes,
  isZero,
} from "./bytes.js";
import {
  computePageCommitment,
  computePageLocation,
  PAGE_SIZE,
  SLOT_SIZE,
} from "./page.js";

const RLP_STRING_32_PREFIX = Uint8Array.of(0xa0);
const ZERO_SLOT = new Uint8Array(SLOT_SIZE);

interface PageTrie {
  /** Returns a defensive copy of a slot value, or `null` for a zero or absent slot. */
  get(slot: Uint8Array): Uint8Array | null;
  /** Writes a slot value. A zero value deletes the slot. */
  set(slot: Uint8Array, value: Uint8Array): void;
  /** Deletes a slot. */
  delete(slot: Uint8Array): void;
  /** Returns a defensive copy of the root for the state visible when called. */
  root(): Promise<Uint8Array>;
}

type PageLeaf = {
  key: Uint8Array;
  value: Uint8Array;
};

function toMptValue(commitment: Uint8Array): Uint8Array {
  return concatBytes(RLP_STRING_32_PREFIX, commitment);
}

class MemoryPageTrie implements PageTrie {
  readonly #pages: Map<string, Uint8Array>;
  #revision: number;
  #cachedRoot: Uint8Array | undefined;

  // Explicit: Bun counts an implicit constructor as an uncovered function,
  // which breaks the 100% coverage threshold.
  constructor() {
    this.#pages = new Map();
    this.#revision = 0;
  }

  get(slot: Uint8Array): Uint8Array | null {
    const { pageKey, offset } = computePageLocation(slot);
    const page = this.#pages.get(bytesToHex(pageKey));
    if (!page) return null;

    const start = offset * SLOT_SIZE;
    if (isZero(page, start, SLOT_SIZE)) return null;
    return copyBytes(page.subarray(start, start + SLOT_SIZE));
  }

  set(slot: Uint8Array, value: Uint8Array): void {
    abytes(value, SLOT_SIZE, "value");

    const { pageKey, offset } = computePageLocation(slot);
    const mapKey = bytesToHex(pageKey);
    const start = offset * SLOT_SIZE;
    let page = this.#pages.get(mapKey);

    if (isZero(value)) {
      if (!page || isZero(page, start, SLOT_SIZE)) return;
      page.fill(0, start, start + SLOT_SIZE);
      if (isZero(page)) this.#pages.delete(mapKey);
    } else {
      if (page && equalBytesAt(page, start, value)) return;
      if (!page) {
        page = new Uint8Array(PAGE_SIZE);
        this.#pages.set(mapKey, page);
      }
      page.set(value, start);
    }

    this.#revision++;
    this.#cachedRoot = undefined;
  }

  delete(slot: Uint8Array): void {
    this.set(slot, ZERO_SLOT);
  }

  async root(): Promise<Uint8Array> {
    const revision = this.#revision;
    if (this.#cachedRoot) {
      return copyBytes(this.#cachedRoot);
    }

    // Compute every page commitment before the first await. Mutations made
    // while the MPT is assembled cannot change the state represented here.
    const leaves: PageLeaf[] = [];
    for (const [mapKey, page] of this.#pages) {
      leaves.push({
        key: hexToBytes(mapKey),
        value: toMptValue(computePageCommitment(page)),
      });
    }

    const trie = await createMPT({
      cacheSize: 0,
      useKeyHashing: true,
      useRootPersistence: false,
    });
    for (const leaf of leaves) await trie.put(leaf.key, leaf.value);

    const root = copyBytes(trie.root());
    if (this.#revision === revision) {
      this.#cachedRoot = root;
    }
    return copyBytes(root);
  }
}

/** Creates a new empty in-memory page trie for one contract's storage. */
function createPageTrie(): PageTrie {
  return new MemoryPageTrie();
}

export { createPageTrie };
export type { PageTrie };
