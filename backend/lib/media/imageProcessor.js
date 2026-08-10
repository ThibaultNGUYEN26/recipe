import sharp from "sharp";
import { Buffer } from "node:buffer";
import { mediaConfig } from "./config.js";
import { MediaValidationError } from "./errors.js";
import { verifyAvatarSignature } from "./signature.js";

export async function processAvatarImage(buffer, claimedMime) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new MediaValidationError("The image is empty", "MALFORMED_IMAGE");
  if (buffer.length > mediaConfig.avatarMaxBytes) throw new MediaValidationError("Profile pictures must be under 5 MB", "FILE_TOO_LARGE");

  const verifiedMime = verifyAvatarSignature(buffer, claimedMime);
  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error", limitInputPixels: mediaConfig.avatarMaxPixels, animated: true }).metadata();
  } catch {
    throw new MediaValidationError("The image is malformed or exceeds safe decoding limits", "MALFORMED_IMAGE");
  }

  if (!metadata.width || !metadata.height) throw new MediaValidationError("The image has invalid dimensions", "INVALID_DIMENSIONS");
  if ((metadata.pages ?? 1) > 1) throw new MediaValidationError("Animated profile pictures are not allowed", "ANIMATED_IMAGE");
  if (metadata.width < mediaConfig.avatarMinDimension || metadata.height < mediaConfig.avatarMinDimension) {
    throw new MediaValidationError(`Profile pictures must be at least ${mediaConfig.avatarMinDimension}x${mediaConfig.avatarMinDimension}`, "INVALID_DIMENSIONS");
  }
  if (metadata.width > mediaConfig.avatarMaxDimension || metadata.height > mediaConfig.avatarMaxDimension || metadata.width * metadata.height > mediaConfig.avatarMaxPixels) {
    throw new MediaValidationError("Profile-picture dimensions are too large", "INVALID_DIMENSIONS");
  }

  try {
    const variants = {};
    for (const size of mediaConfig.avatarSizes) {
      // Sharp removes EXIF/IPTC/XMP by default. Re-encoding also neutralises trailing/polyglot data.
      variants[size] = await sharp(buffer, { failOn: "error", limitInputPixels: mediaConfig.avatarMaxPixels })
        .rotate()
        .resize(size, size, { fit: "cover", position: "attention" })
        .webp({ quality: size <= 128 ? 78 : 84, effort: 4 })
        .toBuffer();
    }
    return { verifiedMime, width: metadata.width, height: metadata.height, variants };
  } catch {
    throw new MediaValidationError("The image could not be decoded safely", "MALFORMED_IMAGE");
  }
}
