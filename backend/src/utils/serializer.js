/**
 * BigInt JSON Serializer Utility
 * 
 * Blockchain response objects (block numbers, timestamps, gas amounts) frequently
 * contain native JavaScript BigInt values. JSON.stringify fails on BigInt by default.
 * This utility converts all BigInt values to strings.
 */

export const serializeBigInt = (data) => {
  if (data === undefined || data === null) return data;
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};
