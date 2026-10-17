/**
 * Utility to serialize BigInt values to safe numbers or strings for JSON compatibility.
 * Blockchain response objects (block numbers, timestamps, gas amounts) frequently
 * contain native JavaScript BigInt values. JSON.stringify fails on BigInt by default.
 */
export function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return Number(obj) <= Number.MAX_SAFE_INTEGER ? Number(obj) : obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }
    const copy = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = serializeBigInt(value);
    }
    return copy;
  }
  return obj;
}
