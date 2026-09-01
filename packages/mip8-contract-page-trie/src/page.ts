import { blake3 } from "@noble/hashes/blake3.js";

import { abytes, concatBytes, isZero } from "./bytes.js";
import { hashPagePair, hashPageParent } from "./ismcHash.js";

/** Size of a storage slot in bytes. */
const SLOT_SIZE = 32;
/** Number of storage slots in a MIP-8 page. */
const PAGE_SLOTS = 128;
/** Size of a dense MIP-8 page in bytes. */
const PAGE_SIZE = SLOT_SIZE * PAGE_SLOTS;

const PAIR_SIZE = SLOT_SIZE * 2;
const PAGE_PAIRS = PAGE_SLOTS / 2;

function computePageKeyUnchecked(slot: Uint8Array): Uint8Array {
  const pageKey = new Uint8Array(SLOT_SIZE);
  let carry = 0;
  for (let i = 0; i < slot.length; i++) {
    const byte = slot[i];
    pageKey[i] = carry | (byte >>> 7);
    carry = (byte & 0x7f) << 1;
  }
  return pageKey;
}

function computePageLocation(slot: Uint8Array): {
  pageKey: Uint8Array;
  offset: number;
} {
  abytes(slot, SLOT_SIZE, "slot");
  return {
    pageKey: computePageKeyUnchecked(slot),
    offset: slot[SLOT_SIZE - 1] & 0x7f,
  };
}

/** Computes the 32-byte page key (`slot >> 7`) for a big-endian storage slot. */
function computePageKey(slot: Uint8Array): Uint8Array {
  return computePageLocation(slot).pageKey;
}

/** Computes the slot's zero-based offset (`slot & 0x7f`) within its page. */
function computeSlotOffset(slot: Uint8Array): number {
  return computePageLocation(slot).offset;
}

type ActiveNode = {
  index: number;
  value: Uint8Array;
};

/** Computes the MIP-8 page commitment for a dense 4096-byte page. */
function computePageCommitment(page: Uint8Array): Uint8Array {
  abytes(page, PAGE_SIZE, "page");

  const bitmapBytes = new Uint8Array(PAGE_SLOTS / 8);
  let activeNodes: ActiveNode[] = [];
  for (let pair = 0; pair < PAGE_PAIRS; pair++) {
    const firstSlot = pair * 2;
    const firstActive = !isZero(page, firstSlot * SLOT_SIZE, SLOT_SIZE);
    const secondActive = !isZero(page, (firstSlot + 1) * SLOT_SIZE, SLOT_SIZE);
    if (firstActive) {
      bitmapBytes[firstSlot >> 3] |= 1 << (firstSlot & 7);
    }
    if (secondActive) {
      const secondSlot = firstSlot + 1;
      bitmapBytes[secondSlot >> 3] |= 1 << (secondSlot & 7);
    }
    if (firstActive || secondActive) {
      activeNodes.push({
        index: pair,
        value: hashPagePair(
          page.subarray(pair * PAIR_SIZE, (pair + 1) * PAIR_SIZE),
        ),
      });
    }
  }
  if (activeNodes.length === 0) return blake3(bitmapBytes);

  for (let level = 0; activeNodes.length > 1; level++) {
    const nextLevel: ActiveNode[] = [];
    for (let i = 0; i < activeNodes.length; ) {
      const current = activeNodes[i];
      const next = activeNodes[i + 1];
      if (next && current.index >> (level + 1) === next.index >> (level + 1)) {
        nextLevel.push({
          index: current.index,
          value: hashPageParent(current.value, next.value),
        });
        i += 2;
      } else {
        nextLevel.push(current);
        i += 1;
      }
    }
    activeNodes = nextLevel;
  }

  return blake3(concatBytes(bitmapBytes, activeNodes[0].value));
}

export {
  computePageKey,
  computePageLocation,
  computePageCommitment,
  computeSlotOffset,
  PAGE_SIZE,
  PAGE_SLOTS,
  SLOT_SIZE,
};
