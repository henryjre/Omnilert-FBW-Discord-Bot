const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compressBufferToLimit,
  DISCORD_MAX_FILE_SIZE_BYTES,
} = require("../src/utils/imageCompression");

test("compressBufferToLimit returns original buffer when already within limit", async () => {
  const input = Buffer.alloc(100);
  const result = await compressBufferToLimit(input, {
    maxBytes: 200,
    transform: async () => {
      throw new Error("transform should not run");
    },
  });

  assert.equal(result.didCompress, false);
  assert.equal(result.outputBuffer.length, 100);
  assert.equal(result.mediaType, "image/jpeg");
  assert.equal(result.extension, "jpg");
});

test("compressBufferToLimit iterates quality and returns compressed output", async () => {
  const input = Buffer.alloc(5_000_000);
  let calls = 0;

  const result = await compressBufferToLimit(input, {
    maxBytes: 3_000_000,
    transform: async ({ quality }) => {
      calls += 1;
      if (quality >= 70) {
        return Buffer.alloc(3_500_000);
      }

      return Buffer.alloc(2_500_000);
    },
  });

  assert.equal(calls >= 2, true);
  assert.equal(result.didCompress, true);
  assert.equal(result.outputBuffer.length <= 3_000_000, true);
});

test("compressBufferToLimit returns null when all attempts exceed limit", async () => {
  const input = Buffer.alloc(5_000_000);

  const result = await compressBufferToLimit(input, {
    maxBytes: 3_000_000,
    transform: async () => Buffer.alloc(4_500_000),
  });

  assert.equal(result, null);
});

test("DISCORD_MAX_FILE_SIZE_BYTES should be 10MB", () => {
  assert.equal(DISCORD_MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024);
});
