import { Request, Response, NextFunction } from 'express';
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

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

// Configuration for Auth0
const authConfig = {
  domain: process.env.AUTH0_DOMAIN!,
  audience: process.env.AUTH0_AUDIENCE!,
};

// Middleware for validating JWT tokens
export const authenticateToken = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
  }),
  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ['RS256'],
});

// Custom middleware to extract user info from decoded token
export const extractUserInfo = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // The decoded token is attached to req.auth by express-jwt
  if (req.auth) {
    // Extract the user ID from the token (typically stored as 'sub')
    const userId = parseInt(req.auth.sub?.replace('auth0|', '') || '0');
    
    // Set user object on request
    req.user = {
      id: userId,
      role: req.auth.role || 'client', // Default to client role if not specified
    };
  }
  next();
};

// Combined middleware for authentication and user info extraction
export const requireAuth = [authenticateToken, extractUserInfo];

// Authentication middleware alias
export const authMiddleware = requireAuth;