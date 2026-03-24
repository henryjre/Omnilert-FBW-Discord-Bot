const sharp = require("sharp");

const DISCORD_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_QUALITY_STEPS = [82, 72, 62, 52];
const DEFAULT_MAX_DIMENSION_STEPS = [null, 2560, 2048, 1600, 1280];

/**
 * Compresses an image buffer until it fits the target size.
 * Uses bounded quality and dimension attempts to avoid CPU-heavy loops.
 *
 * @param {Buffer} inputBuffer The original image payload.
 * @param {object} options Compression options.
 * @param {number} [options.maxBytes] Max output size in bytes.
 * @param {(input: {quality:number,maxDimension:number|null}) => Promise<Buffer>} [options.transform]
 * Transform function (injected for tests). Defaults to sharp-based transform.
 * @returns {Promise<{outputBuffer: Buffer, didCompress: boolean, mediaType: string, extension: string} | null>}
 */
async function compressBufferToLimit(inputBuffer, options = {}) {
  if (!Buffer.isBuffer(inputBuffer)) {
    throw new TypeError("inputBuffer must be a Buffer.");
  }

  const maxBytes =
    Number.isInteger(options.maxBytes) && options.maxBytes > 0
      ? options.maxBytes
      : DISCORD_MAX_FILE_SIZE_BYTES;
  const transform =
    typeof options.transform === "function"
      ? options.transform
      : async ({ quality, maxDimension }) =>
          transformWithSharp(inputBuffer, quality, maxDimension);

  if (inputBuffer.length <= maxBytes) {
    return {
      outputBuffer: inputBuffer,
      didCompress: false,
      mediaType: "image/jpeg",
      extension: "jpg",
    };
  }

  for (const maxDimension of DEFAULT_MAX_DIMENSION_STEPS) {
    for (const quality of DEFAULT_QUALITY_STEPS) {
      const transformedBuffer = await transform({ quality, maxDimension });
      if (Buffer.isBuffer(transformedBuffer) && transformedBuffer.length <= maxBytes) {
        return {
          outputBuffer: transformedBuffer,
          didCompress: true,
          mediaType: "image/jpeg",
          extension: "jpg",
        };
      }
    }
  }

  return null;
}

/**
 * Applies a single sharp transform pass.
 *
 * @param {Buffer} inputBuffer Source image.
 * @param {number} quality JPEG quality.
 * @param {number | null} maxDimension Optional max width/height.
 * @returns {Promise<Buffer>}
 */
async function transformWithSharp(inputBuffer, quality, maxDimension) {
  let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();

  if (Number.isInteger(maxDimension) && maxDimension > 0) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
}

module.exports = {
  DISCORD_MAX_FILE_SIZE_BYTES,
  compressBufferToLimit,
};
