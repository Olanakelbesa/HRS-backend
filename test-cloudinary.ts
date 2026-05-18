import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dkqthvuy2',
    api_key: process.env.CLOUDINARY_API_KEY || '671985636631885',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'ABLfgvTa95HSwImQd7T-gR6kYc8',
});

async function main() {
    try {
        console.log("Testing STREAM Cloudinary upload...");
        const fakeBuffer = Buffer.from('hello world', 'utf8');

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'house-rental/documents' },
                (error, result) => {
                    if (error) {
                        reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    } else if (result?.secure_url) {
                        resolve(result.secure_url);
                        console.log("Success: ", result.secure_url);
                    } else {
                        reject(new Error('Cloudinary upload failed: No URL returned'));
                    }
                }
            );
            uploadStream.end(fakeBuffer);
        });
    } catch (err) {
        console.error("Cloudinary Upload Error:", err);
    }
}

main().then(() => console.log('Done')).catch(console.error);
