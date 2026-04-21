import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Cloudinary wrapper used by admin image uploads (reader profile images).
 * If credentials are not configured, `upload` throws a descriptive error so
 * callers can degrade gracefully.
 */
class CloudinaryService {
  private configured = false;

  get enabled(): boolean {
    return config.cloudinary.enabled;
  }

  private ensureConfigured(): void {
    if (!this.enabled) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }
    if (!this.configured) {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
        secure: true,
      });
      this.configured = true;
    }
  }

  /**
   * Upload an in-memory buffer to Cloudinary and return the public URL.
   */
  async uploadBuffer(
    buffer: Buffer,
    opts: { folder?: string; publicId?: string } = {},
  ): Promise<{ url: string; publicId: string }> {
    this.ensureConfigured();

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: opts.folder ?? 'soulseer/readers',
          public_id: opts.publicId,
          resource_type: 'image',
          overwrite: true,
          invalidate: true,
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            logger.error({ err: error }, 'Cloudinary upload failed');
            reject(error ?? new Error('Cloudinary returned no result'));
            return;
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(buffer);
    });
  }
}

export const cloudinaryService = new CloudinaryService();
