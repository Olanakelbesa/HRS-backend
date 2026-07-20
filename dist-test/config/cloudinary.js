"use strict";
/**
 * Cloudinary / S3 multimedia config.
 * Add env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Or for S3: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryConfig = void 0;
const cloudinary_1 = require("cloudinary");
const env_1 = require("./env");
cloudinary_1.v2.config({
    cloud_name: env_1.env.CLOUDINARY_CLOUD_NAME,
    api_key: env_1.env.CLOUDINARY_API_KEY,
    api_secret: env_1.env.CLOUDINARY_API_SECRET,
});
exports.cloudinaryConfig = {
    cloudName: env_1.env.CLOUDINARY_CLOUD_NAME,
    apiKey: env_1.env.CLOUDINARY_API_KEY,
    apiSecret: env_1.env.CLOUDINARY_API_SECRET,
    get uploadPreset() {
        return env_1.env.CLOUDINARY_URL ?? 'house_rental';
    },
};
