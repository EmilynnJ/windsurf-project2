import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/db';
import { users } from '@soulseer/shared/schema';
// TODO: Implement S3/Cloud Storage provider for production scalability
// The current local file system storage will not work in environments with:
// - Multiple instances (load balanced)
// - Ephemeral storage (Heroku, AWS Lambda, etc.)
// Consider implementing a storage abstraction layer that supports:
// - AWS S3
// - Google Cloud Storage
// - Azure Blob Storage
// For production deployments
// Define image upload configuration
const PROFILE_IMAGE_CONFIG = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    UPLOAD_DIR: process.env.STORAGE_PATH || './uploads/profile-images',
};
// Ensure upload directory exists
async function ensureUploadDir() {
    try {
        await fs.access(PROFILE_IMAGE_CONFIG.UPLOAD_DIR);
    }
    catch {
        await fs.mkdir(PROFILE_IMAGE_CONFIG.UPLOAD_DIR, { recursive: true });
    }
}
// Validate image file
function validateImage(file) {
    if (!PROFILE_IMAGE_CONFIG.ALLOWED_TYPES.includes(file.mimetype)) {
        throw new Error(`Invalid file type. Allowed types: ${PROFILE_IMAGE_CONFIG.ALLOWED_TYPES.join(', ')}`);
    }
    if (file.size > PROFILE_IMAGE_CONFIG.MAX_SIZE) {
        throw new Error(`File size exceeds limit of ${PROFILE_IMAGE_CONFIG.MAX_SIZE / (1024 * 1024)}MB`);
    }
}
// Generate unique filename
function generateFilename(originalName) {
    const ext = path.extname(originalName);
    return `${uuidv4()}${ext}`;
}
// Upload profile image
export async function uploadProfileImage(userId, file) {
    // Validate the image
    validateImage(file);
    // Ensure upload directory exists
    await ensureUploadDir();
    // Generate unique filename
    const filename = generateFilename(file.originalname);
    const filepath = path.join(PROFILE_IMAGE_CONFIG.UPLOAD_DIR, filename);
    // Save the file
    await fs.writeFile(filepath, file.buffer);
    // Return the public URL/path for the image
    return `/uploads/profile-images/${filename}`;
}
// Delete profile image
export async function deleteProfileImage(imageUrl) {
    if (!imageUrl)
        return;
    // Extract filename from URL
    const filename = path.basename(imageUrl);
    const filepath = path.join(PROFILE_IMAGE_CONFIG.UPLOAD_DIR, filename);
    try {
        await fs.unlink(filepath);
    }
    catch (error) {
        // If file doesn't exist, we still consider it a success
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}
// Update user's profile image in the database
export async function updateProfileImage(userId, imageUrl) {
    const db = getDb();
    await db
        .update(users)
        .set({ profileImage: imageUrl })
        .where(eq(users.id, userId));
}
// Remove user's profile image
export async function removeProfileImage(userId) {
    const db = getDb();
    // Get current image URL to delete the file
    const [currentUser] = await db
        .select({ profileImage: users.profileImage })
        .from(users)
        .where(eq(users.id, userId));
    if (currentUser?.profileImage) {
        await deleteProfileImage(currentUser.profileImage);
    }
    await db
        .update(users)
        .set({ profileImage: null })
        .where(eq(users.id, userId));
}
