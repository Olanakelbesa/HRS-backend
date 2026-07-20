"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const streamifier_1 = __importDefault(require("streamifier"));
require("../config/cloudinary"); // Initialize config
const uploadToCloudinary = (buffer, folder, resourceType) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: resourceType,
        }, (error, result) => {
            if (error || !result)
                return reject(error);
            resolve(result.secure_url);
        });
        streamifier_1.default.createReadStream(buffer).pipe(stream);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = async (url, resourceType = 'image') => {
    try {
        // Extract public ID from URL
        // e.g., https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image_id.jpg
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        const folderPart = parts[parts.length - 2];
        // Remove extension
        const publicIdWithFolder = `${folderPart}/${lastPart.split('.')[0]}`;
        await cloudinary_1.v2.uploader.destroy(publicIdWithFolder, { resource_type: resourceType });
    }
    catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
