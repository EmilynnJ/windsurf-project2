import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import { 
  uploadProfileImage, 
  removeProfileImage,
  updateProfileImage
} from '../services/profile-image-service';

// Extend the Express Request type to include auth property
interface AuthenticatedRequest extends Request {
  auth?: {
    sub?: string;
    role?: string;
    [key: string]: any;
  };
  user?: {
    id: number;
    role: string;
  };
}

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store in memory temporarily
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload profile image
router.post('/upload', authMiddleware, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload the image and get the URL
    const imageUrl = await uploadProfileImage(req.user.id, req.file);

    // Update the user's profile image in the database
    await updateProfileImage(req.user.id, imageUrl);

    res.json({ 
      message: 'Profile image uploaded successfully', 
      imageUrl 
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds limit of 5MB' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove profile image
router.delete('/remove', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Remove the profile image
    await removeProfileImage(req.user.id);

    res.json({ message: 'Profile image removed successfully' });
  } catch (error) {
    console.error('Error removing profile image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint: Update any user's profile image
router.post('/upload/:userId', authMiddleware, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow admins to update other users' profile images
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update other users\' profile images' });
    }

    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload the image and get the URL
    const imageUrl = await uploadProfileImage(userId, req.file);

    // Update the user's profile image in the database
    await updateProfileImage(userId, imageUrl);

    res.json({ 
      message: 'User profile image updated successfully', 
      imageUrl 
    });
  } catch (error) {
    console.error('Error updating user profile image:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds limit of 5MB' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;