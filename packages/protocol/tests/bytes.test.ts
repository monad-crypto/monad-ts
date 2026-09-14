import { describe, expect, test } from "bun:test";
import {
  bytesToLittleEndianWords,
  equalBytesAt,
  isZero,
  littleEndianWordsToBytes,
} from "../src/bytes.js";

describe("byte helpers", () => {
  test("round-trips little-endian words from an unaligned view", () => {
    const backing = Uint8Array.of(0xff, 1, 2, 3, 4, 5, 6, 7, 8, 0xff);
    const bytes = backing.subarray(1, 9);

    const words = bytesToLittleEndianWords(bytes);

    expect(words).toEqual(Uint32Array.of(0x04030201, 0x08070605));
    expect(littleEndianWordsToBytes(words)).toEqual(bytes);
  });

  test("checks zero and equal byte ranges", () => {
    const bytes = Uint8Array.of(9, 0, 0, 1, 2, 3, 9);

    expect(isZero(bytes, 1, 2)).toBe(true);
    expect(isZero(bytes, 1, 3)).toBe(false);
    expect(equalBytesAt(bytes, 3, Uint8Array.of(1, 2, 3))).toBe(true);
    expect(equalBytesAt(bytes, 2, Uint8Array.of(1, 2, 3))).toBe(false);
  });
});
