import { SLOT_SIZE } from "../src/page.js";

/** Encodes a non-negative bigint as a 32-byte big-endian word. */
function uint256(value: bigint): Uint8Array {
  const bytes = new Uint8Array(SLOT_SIZE);
  for (let i = bytes.length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

export { uint256 };
