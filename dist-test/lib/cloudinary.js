"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatarToCloudinary = uploadAvatarToCloudinary;
exports.uploadDocumentToCloudinary = uploadDocumentToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
exports.extractPublicId = extractPublicId;
const cloudinary_1 = require("cloudinary");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
/**
 * Upload avatar image to Cloudinary
 */
async function uploadAvatarToCloudinary(file, userId) {
    return new Promise((resolve, reject) => {
        const publicId = `avatars/${userId}-${Date.now()}`;
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            public_id: publicId,
            folder: 'house-rental/avatars',
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto',
        }, (error, result) => {
            if (error) {
                reject(new Error(`Cloudinary upload failed: ${error.message}`));
            }
            else if (result?.secure_url) {
                resolve(result.secure_url);
            }
            else {
                reject(new Error('Cloudinary upload failed: No URL returned'));
            }
        });
        uploadStream.end(file.buffer);
    });
}
/**
 * Upload verification document to Cloudinary
 */
async function uploadDocumentToCloudinary(file, userId, documentType) {
    return new Promise((resolve, reject) => {
        const publicId = `documents/${userId}-${documentType}-${Date.now()}`;
        const isImage = file.mimetype.startsWith('image/');
        const uploadOptions = {
            public_id: publicId,
            folder: 'house-rental/documents',
            resource_type: isImage ? 'image' : 'raw',
        };
        if (isImage) {
            uploadOptions.quality = 'auto';
            uploadOptions.fetch_format = 'auto';
        }
        const uploadStream = cloudinary_1.v2.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                reject(new Error(`Cloudinary upload failed: ${error.message}`));
            }
            else if (result?.secure_url) {
                resolve(result.secure_url);
            }
            else {
                reject(new Error('Cloudinary upload failed: No URL returned'));
            }
        });
        uploadStream.end(file.buffer);
    });
}
/**
 * Delete file from Cloudinary
 */
async function deleteFromCloudinary(publicId) {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        console.error(`Failed to delete Cloudinary file ${publicId}:`, error);
        // Don't throw - deletion failure shouldn't break the operation
    }
}
/**
 * Extract Cloudinary public ID from URL
 */
function extractPublicId(url) {
    const match = url.match(/\/([^/]+)\/([^/]+)\./) || url.match(/\/([^/]+)$/);
    return match ? match[1] : '';
}
