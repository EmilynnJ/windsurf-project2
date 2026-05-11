import { ManagementClient } from 'auth0';
import { randomBytes } from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Auth0 Management API wrapper for programmatic user creation.
 *
 * Requires a Machine-to-Machine application in Auth0 authorized for the
 * Management API with at least the following scopes:
 *   create:users, read:users, update:users
 *
 * When credentials are not configured, the service throws a clearly-named
 * error so callers can degrade gracefully.
 */
class Auth0ManagementService {
  private client: ManagementClient | null = null;

  get enabled(): boolean {
    return config.auth0Management.enabled;
  }

  private getClient(): ManagementClient {
    if (!this.enabled) {
      throw new Error(
        'Auth0 Management API is not configured. Set AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET.',
      );
    }
    if (!this.client) {
      this.client = new ManagementClient({
        domain: config.auth0.domain,
        clientId: config.auth0Management.clientId,
        clientSecret: config.auth0Management.clientSecret,
      });
    }
    return this.client;
  }

  /**
   * Generate a cryptographically strong password that satisfies typical Auth0
   * Good/Excellent password policies (length ≥ 16, upper, lower, digit, symbol).
   */
  generatePassword(length = 18): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*-_=+?';
    const all = upper + lower + digits + symbols;
    const required = [upper, lower, digits, symbols];

    const bytes = randomBytes(length);
    const chars: string[] = [];
    for (let i = 0; i < required.length; i++) {
      chars.push(required[i]![bytes[i]! % required[i]!.length]!);
    }
    for (let i = required.length; i < length; i++) {
      chars.push(all[bytes[i]! % all.length]!);
    }
    // Fisher–Yates shuffle using fresh random bytes
    const shuffle = randomBytes(length);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffle[i]! % (i + 1);
      [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    return chars.join('');
  }

  /**
   * Create an Auth0 user in the configured database connection.
   * Returns the Auth0 user_id (`auth0|<uuid>`) and the generated password.
   * The caller is responsible for delivering the password to the reader.
   */
  async createUserWithPassword(params: {
    email: string;
    fullName: string;
    username?: string | null;
  }): Promise<{ auth0Id: string; password: string }> {
    const client = this.getClient();
    const password = this.generatePassword();

    try {
      const response = await client.users.create({
        connection: config.auth0Management.dbConnection,
        email: params.email,
        password,
        email_verified: true,
        verify_email: false,
        name: params.fullName,
        ...(params.username ? { username: params.username } : {}),
        user_metadata: { role: 'reader', source: 'admin-provisioned' },
        app_metadata: { role: 'reader' },
      });

      const data = response.data;
      if (!data.user_id) {
        throw new Error('Auth0 did not return a user_id');
      }

      logger.info(
        { auth0Id: data.user_id, email: params.email },
        'Auth0 user created via Management API',
      );

      return { auth0Id: data.user_id, password };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      const message = (err as Error).message || 'Unknown Auth0 error';
      logger.error({ err, status, email: params.email }, 'Auth0 user creation failed');
      // Surface common errors with actionable messaging
      if (status === 409) {
        throw new Error(`Auth0 user with email ${params.email} already exists`);
      }
      throw new Error(`Auth0 user creation failed: ${message}`);
    }
  }

  /**
   * Create the user, or if one already exists with the same email, update the
   * password to the supplied value. Used for QA test-account provisioning where
   * the caller wants a known, repeatable password.
   */
  async upsertUserWithPassword(params: {
    email: string;
    password: string;
    fullName: string;
    role: 'admin' | 'reader' | 'client';
    username?: string | null;
  }): Promise<{ auth0Id: string; created: boolean }> {
    const client = this.getClient();
    try {
      const response = await client.users.create({
        connection: config.auth0Management.dbConnection,
        email: params.email,
        password: params.password,
        email_verified: true,
        verify_email: false,
        name: params.fullName,
        ...(params.username ? { username: params.username } : {}),
        user_metadata: { role: params.role, source: 'test-provisioning' },
        app_metadata: { role: params.role },
      });
      const id = response.data.user_id;
      if (!id) throw new Error('Auth0 did not return a user_id');
      return { auth0Id: id, created: true };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status !== 409) throw err;
      const list = await client.users.listUsersByEmail({ email: params.email });
      const raw: unknown = Array.isArray(list)
        ? list
        : (list as { data?: unknown }).data;
      const rows = Array.isArray(raw) ? (raw as Array<{ user_id?: string }>) : [];
      const existingId = rows[0]?.user_id;
      if (!existingId) throw new Error(`Auth0 user exists for ${params.email} but user_id is unresolved`);
      await client.users.update(existingId, {
        password: params.password,
        email_verified: true,
      });
      return { auth0Id: existingId, created: false };
    }
  }

  /**
   * Delete an Auth0 user. Idempotent — returns true if the user was deleted or
   * did not exist, false if the service is disabled.
   */
  async deleteUser(auth0Id: string): Promise<boolean> {
    if (!this.enabled) {
      logger.warn({ auth0Id }, 'Auth0 deleteUser skipped — Management API not configured');
      return false;
    }
    const client = this.getClient();
    try {
      await client.users.delete(auth0Id);
      logger.info({ auth0Id }, 'Auth0 user deleted');
      return true;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404) {
        // Already gone — treat as success.
        return true;
      }
      logger.error({ err, status, auth0Id }, 'Auth0 user deletion failed');
      throw new Error(`Auth0 user deletion failed: ${(err as Error).message}`);
    }
  }
}

export const auth0ManagementService = new Auth0ManagementService();
