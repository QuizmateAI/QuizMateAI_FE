const BLOOM_FILTER_SIZE = 4096;
const BLOOM_HASH_COUNT = 4;

function createBitArray(size) {
  return new Uint8Array(Math.ceil(size / 8));
}

function setBit(bitArray, index) {
  const byteIndex = Math.floor(index / 8);
  const bitOffset = index % 8;
  bitArray[byteIndex] |= (1 << bitOffset);
}

function hasBit(bitArray, index) {
  const byteIndex = Math.floor(index / 8);
  const bitOffset = index % 8;
  return (bitArray[byteIndex] & (1 << bitOffset)) !== 0;
}

function hashString(value, seed) {
  let hash = 2166136261 ^ seed;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0);
}

function createBloomFilter(size = BLOOM_FILTER_SIZE, hashCount = BLOOM_HASH_COUNT) {
  const bits = createBitArray(size);

  return {
    add(value) {
      if (!value) return;

      for (let hashIndex = 0; hashIndex < hashCount; hashIndex += 1) {
        setBit(bits, hashString(value, hashIndex + 1) % size);
      }
    },
    mayContain(value) {
      if (!value) return false;

      for (let hashIndex = 0; hashIndex < hashCount; hashIndex += 1) {
        if (!hasBit(bits, hashString(value, hashIndex + 1) % size)) {
          return false;
        }
      }

      return true;
    },
    clear() {
      bits.fill(0);
    },
  };
}

const authAvailabilityBloom = {
  username: createBloomFilter(),
  email: createBloomFilter(),
};

function getBloom(field) {
  if (!authAvailabilityBloom[field]) {
    throw new Error(`Unsupported auth availability bloom field: ${field}`);
  }

  return authAvailabilityBloom[field];
}

export function markAuthAvailabilityUnavailable(field, value) {
  getBloom(field).add(value);
}

export function mayBeAuthAvailabilityUnavailable(field, value) {
  return getBloom(field).mayContain(value);
}

export function resetAuthAvailabilityBloom() {
  Object.values(authAvailabilityBloom).forEach((bloom) => bloom.clear());
}
