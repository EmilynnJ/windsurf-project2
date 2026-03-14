import { auth } from 'express-oauth2-jwt-bearer';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { config } from '../config';
import { resolveUser } from './rbac';

// JWT verification via Auth0
export const checkJwt = auth({
  audience: config.auth0.audience,
  issuerBaseURL: config.auth0.issuerBaseURL,
  tokenSigningAlg: 'RS256',
});

/**
 * Combined middleware: validate JWT + resolve internal user record.
 * Use as `router.use(requireAuth)` or `router.get('/path', requireAuth, handler)`.
 *
 * After this middleware runs, `req.user` is populated with the full DB user object.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // First: check JWT
  (checkJwt as RequestHandler)(req, res, (err?: any) => {
    if (err) {
      next(err);
      return;
    }
    // Then: resolve DB user from JWT sub claim
    resolveUser(req, res, next);
  });
}
