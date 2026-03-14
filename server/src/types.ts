import type { InferSelectModel } from 'drizzle-orm';
import type { users, readings } from '@soulseer/shared/schema';
import type { AuthResult } from 'express-oauth2-jwt-bearer';

export type User = InferSelectModel<typeof users>;
export type Reading = InferSelectModel<typeof readings>;

declare global {
  namespace Express {
    interface Request {
      user?: User;
      reading?: Reading;
      auth?: AuthResult;
    }
  }
}
