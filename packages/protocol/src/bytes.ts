import {
  abytes,
  bytesToHex,
  concatBytes,
  copyBytes,
  hexToBytes,
  utf8ToBytes,
} from "@noble/hashes/utils.js";

/** Returns whether a byte range contains only zeroes. */
function isZero(
  bytes: Uint8Array,
  start = 0,
  length = bytes.length - start,
): boolean {
  const end = start + length;
  for (let i = start; i < end; i++) {
    if (bytes[i] !== 0) return false;
  }
  return true;
}

/** Returns whether a byte range equals another byte array. */
function equalBytesAt(
  bytes: Uint8Array,
  start: number,
  other: Uint8Array,
): boolean {
  for (let i = 0; i < other.length; i++) {
    if (bytes[start + i] !== other[i]) return false;
  }
  return true;
}

/** Decodes bytes into little-endian 32-bit words. */
function bytesToLittleEndianWords(bytes: Uint8Array): Uint32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const words = new Uint32Array(bytes.length / 4);
  for (let i = 0; i < words.length; i++) {
    words[i] = view.getUint32(i * 4, true);
  }
  return words;
}

/** Encodes 32-bit words as little-endian bytes. */
function littleEndianWordsToBytes(words: Uint32Array): Uint8Array {
  const bytes = new Uint8Array(words.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < words.length; i++) {
    view.setUint32(i * 4, words[i], true);
  }
  return bytes;
}

export {
  abytes,
  bytesToHex,
  bytesToLittleEndianWords,
  concatBytes,
  copyBytes,
  equalBytesAt,
  hexToBytes,
  isZero,
  littleEndianWordsToBytes,
  utf8ToBytes,
};
