import { Request, Response, NextFunction } from 'express';
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

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
export const extractUserInfo = (req: Request, res: Response, next: NextFunction) => {
  // The decoded token is attached to req.auth by express-jwt
  if (req.auth) {
    // Extract the user ID from the token (typically stored as 'sub')
    req.userId = req.auth.sub?.replace('auth0|', ''); // Remove auth0| prefix if present
    req.userRole = req.auth.role || 'client'; // Default to client role if not specified
  }
  next();
};

// Combined middleware for authentication and user info extraction
export const requireAuth = [authenticateToken, extractUserInfo];

// Type augmentation to add custom properties to Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}