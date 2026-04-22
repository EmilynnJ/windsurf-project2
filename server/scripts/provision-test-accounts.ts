/**
 * Provision the three test accounts used for QA:
 *
 *   - admin  : emilynnj14@gmail.com
 *   - reader : emilynn992@gmail.com
 *   - client : emily81292@gmail.com
 *
 * Creates the Auth0 users (via Management API) with the caller-supplied
 * passwords, and upserts matching rows into the `users` table with the
 * correct role and a starter balance for the client.
 *
 * Usage:
 *   cd server
 *   AUTH0_MGMT_CLIENT_ID=... AUTH0_MGMT_CLIENT_SECRET=... \
 *   AUTH0_DOMAIN=... AUTH0_AUDIENCE=... DATABASE_URL=... \
 *   ADMIN_PASSWORD=... READER_PASSWORD=... CLIENT_PASSWORD=... \
 *   npx tsx scripts/provision-test-accounts.ts
 *
 * The script is idempotent — re-running it will skip existing Auth0 users
 * (swallowing 409 conflicts) and update the DB row instead of inserting
 * a duplicate.
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { ManagementClient } from 'auth0';
import { db, pool } from '../src/db/db';
import { users } from '../src/db/schema';
import { config } from '../src/config';

interface AccountSpec {
  label: 'admin' | 'reader' | 'client';
  email: string;
  password: string;
  fullName: string;
  username: string;
  startingBalanceCents?: number;
  pricing?: { chat: number; voice: number; video: number };
  bio?: string;
  specialties?: string;
}

const SPECS: AccountSpec[] = [
  {
    label: 'admin',
    email: 'emilynnj14@gmail.com',
    password: required('ADMIN_PASSWORD'),
    fullName: 'Emilynn (Admin)',
    username: 'emilynn-admin',
  },
  {
    label: 'reader',
    email: 'emilynn992@gmail.com',
    password: required('READER_PASSWORD'),
    fullName: 'Emilynn',
    username: 'emilynn',
    pricing: { chat: 299, voice: 399, video: 499 },
    bio: 'Test reader account for QA.',
    specialties: 'Tarot, Clairvoyance, Mediumship',
  },
  {
    label: 'client',
    email: 'emily81292@gmail.com',
    password: required('CLIENT_PASSWORD'),
    fullName: 'Emily',
    username: 'emily',
    startingBalanceCents: 5000, // $50 starter balance for smoke-testing
  },
];

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  if (!config.auth0Management.enabled) {
    console.error(
      'Auth0 Management is not configured. Set AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET.',
    );
    process.exit(1);
  }

  const mgmt = new ManagementClient({
    domain: config.auth0.domain,
    clientId: config.auth0Management.clientId,
    clientSecret: config.auth0Management.clientSecret,
  });

  for (const spec of SPECS) {
    console.log(`\n── [${spec.label}] ${spec.email} ─────────────────────────`);

    // 1) Create (or reuse) the Auth0 user.
    let auth0Id: string | null = null;
    try {
      // Not all Auth0 DB connections have `requires_username` enabled; only
      // include the username field when the connection supports it (the
      // Management API returns 400 otherwise). Default to omitting it.
      const includeUsername =
        process.env.AUTH0_CONNECTION_REQUIRES_USERNAME === 'true';
      const createBody: Record<string, unknown> = {
        connection: config.auth0Management.dbConnection,
        email: spec.email,
        password: spec.password,
        email_verified: true,
        verify_email: false,
        name: spec.fullName,
        user_metadata: { role: spec.label, source: 'test-provisioning' },
        app_metadata: { role: spec.label },
      };
      if (includeUsername) createBody.username = spec.username;
      const resp = await mgmt.users.create(
        createBody as Parameters<typeof mgmt.users.create>[0],
      );
      auth0Id = resp.data.user_id ?? null;
      console.log(`  Auth0 user created: ${auth0Id}`);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 409) {
        console.log('  Auth0 user already exists — looking up…');
        const existing = await mgmt.users.listUsersByEmail({ email: spec.email });
        // The SDK sometimes returns the array directly, sometimes wrapped
        // under `.data` depending on version / transport.
        const rawRows: unknown = Array.isArray(existing)
          ? existing
          : (existing as { data?: unknown }).data;
        const rows = Array.isArray(rawRows)
          ? (rawRows as Array<{ user_id?: string }>)
          : [];
        auth0Id = rows[0]?.user_id ?? null;
        if (!auth0Id) {
          console.error('  Could not resolve Auth0 user_id for existing account');
          continue;
        }
        console.log(`  Resolved existing Auth0 user: ${auth0Id}`);
        // Make sure the password matches what the caller expects.
        try {
          await mgmt.users.update(auth0Id, { password: spec.password });
          console.log('  Password updated to the supplied value');
        } catch (updateErr) {
          console.warn('  Failed to update password on existing Auth0 user:', updateErr);
        }
      } else {
        console.error('  Auth0 user creation failed:', err);
        continue;
      }
    }

    if (!auth0Id) continue;

    // 2) Upsert internal DB row with correct role/pricing/balance.
    const role = spec.label === 'admin' ? 'admin' : spec.label === 'reader' ? 'reader' : 'client';
    const [existingDb] = await db.select().from(users).where(eq(users.auth0Id, auth0Id));

    const patch = {
      email: spec.email,
      username: spec.username,
      fullName: spec.fullName,
      role,
      bio: spec.bio ?? null,
      specialties: spec.specialties ?? null,
      pricingChat: spec.pricing?.chat ?? 0,
      pricingVoice: spec.pricing?.voice ?? 0,
      pricingVideo: spec.pricing?.video ?? 0,
      balance: spec.startingBalanceCents ?? 0,
      updatedAt: new Date(),
    } as const;

    if (existingDb) {
      await db.update(users).set(patch).where(eq(users.id, existingDb.id));
      console.log(`  DB row updated (id=${existingDb.id}, role=${role})`);
    } else {
      const [inserted] = await db
        .insert(users)
        .values({ auth0Id, ...patch })
        .returning({ id: users.id });
      console.log(`  DB row inserted (id=${inserted?.id}, role=${role})`);
    }
  }

  console.log('\nDone. All accounts provisioned.');
  await pool.end();
}

main().catch((err) => {
  console.error('\nProvisioning failed:', err);
  void pool.end().finally(() => process.exit(1));
});
