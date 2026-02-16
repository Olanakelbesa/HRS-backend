/**
 * Multipart/form-data handling for file uploads.
 * Use this middleware on routes that accept multipart (e.g. create with images).
 * JSON routes continue to use express.json() only.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists (for diskStorage)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `${unique}${ext}`);
  },
});

/** Use memory storage when you'll upload to Cloudinary/S3 and don't need disk files */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/** Use disk storage when saving files locally */
export const diskUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * Generic multipart parser for a set of field names (text + files).
 * Example: uploadFields(['title', 'price', 'images']) for mixed form.
 */
export function uploadFields(fields: { name: string; maxCount?: number }[]) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }).fields(fields.map((f) => ({ name: f.name, maxCount: f.maxCount ?? 1 })));
}
