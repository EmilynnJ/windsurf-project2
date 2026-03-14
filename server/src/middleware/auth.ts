import { Request, Response, NextFunction, RequestHandler } from "express";
import { auth, AuthResult } from "express-oauth2-jwt-bearer";
import { eq } from "drizzle-orm";
import { users } from "@soulseer/shared/schema";
import { config } from "../config";
import { getDb } from "../db/db";
import { logger } from "../utils/logger";

// ─── Extend Express Request with our user object ────────────────────────────

export interface AuthUser {
  id: number;
  role: "client" | "reader" | "admin";
  email: string;
  auth0Id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      auth?: AuthResult;
    }
  }
}

// ─── JWT validation middleware (Auth0) ───────────────────────────────────────

const checkJwt = auth({
  audience: config.auth0.audience,
  issuerBaseURL: config.auth0.issuerBaseURL,
  tokenSigningAlg: "RS256",
});

// ─── DB user lookup middleware ───────────────────────────────────────────────

/**
 * After JWT validation, look up the user in our DB by auth0Id (req.auth.payload.sub).
 * Attach the full user object to req.user.
 * Returns 401 if user not found in DB.
 */
const resolveUser: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth0Id = req.auth?.payload?.sub;
    if (!auth0Id) {
      res.status(401).json({ error: "No auth0 subject in token" });
      return;
    }

    const db = getDb();
    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email,
        auth0Id: users.auth0Id,
      })
      .from(users)
      .where(eq(users.auth0Id, auth0Id))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "User not found in database" });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (err) {
    logger.error({ err }, "Error resolving user from token");
    res.status(500).json({ error: "Internal server error" });
  }
};

// ─── Exported middleware arrays ──────────────────────────────────────────────

/**
 * Full auth pipeline: validate JWT → look up DB user → attach req.user
 * Use for routes that need req.user (most authenticated routes).
 */
export const requireAuth: RequestHandler[] = [checkJwt, resolveUser];

/**
 * JWT-only: validate token but DON'T require user in DB yet.
 * Used for POST /auth/sync where the user might not exist in our DB yet.
 */
export const requireJwt: RequestHandler[] = [checkJwt];

/**
 * Role guard. Use after requireAuth:
 *   router.get('/admin-only', ...requireAuth, requireRole('admin'), handler)
 */
export function requireRole(...roles: Array<"client" | "reader" | "admin">): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden — insufficient role" });
      return;
    }
    next();
  };
}

/** Legacy alias */
export { checkJwt };
