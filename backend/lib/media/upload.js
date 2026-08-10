import multer from "multer";
import { mediaConfig } from "./config.js";

export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mediaConfig.avatarMaxBytes, files: 1, fields: 4 },
}).single("avatar");

export function handleAvatarUpload(req, res, next) {
  avatarUpload(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Profile pictures must be under 5 MB" : err.message;
    return res.status(400).json({ error: message, code: err.code || "UPLOAD_REJECTED" });
  });
}
