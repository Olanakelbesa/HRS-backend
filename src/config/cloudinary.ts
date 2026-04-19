/**
 * Cloudinary / S3 multimedia config.
 * Add env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Or for S3: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
 */

// Placeholder – install and configure when needed:
// npm install cloudinary
// import { v2 as cloudinary } from 'cloudinary';

export const cloudinaryConfig = {
  // cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  // apiKey: process.env.CLOUDINARY_API_KEY,
  // apiSecret: process.env.CLOUDINARY_API_SECRET,
  get uploadPreset() {
    return process.env.CLOUDINARY_URL ?? 'house_rental';
  },
};
