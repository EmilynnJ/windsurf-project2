import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_AUDIENCE: z.string().min(1),
  // Optional: Auth0 Management API credentials for creating reader accounts.
  // Create a Machine-to-Machine app in Auth0 authorized for the Management API
  // with scopes: create:users, read:users, update:users.
  AUTH0_MGMT_CLIENT_ID: z.string().default(''),
  AUTH0_MGMT_CLIENT_SECRET: z.string().default(''),
  AUTH0_DB_CONNECTION: z.string().default('Username-Password-Authentication'),
  AGORA_APP_ID: z.string().default(''),
  AGORA_APP_CERTIFICATE: z.string().default(''),
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  // Optional: Cloudinary credentials for reader profile image uploads.
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  ADMIN_EMAILS: z.string().default('emilynnj14@gmail.com'),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`\n❌ Invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }
  return parsed.data;
}

const env = loadConfig();

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  port: env.PORT,
  corsOrigin: env.CORS_ORIGIN,
  database: { url: env.DATABASE_URL },
  auth0: {
    domain: env.AUTH0_DOMAIN,
    audience: env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${env.AUTH0_DOMAIN}`,
  },
  agora: {
    appId: env.AGORA_APP_ID,
    appCertificate: env.AGORA_APP_CERTIFICATE,
    tokenExpiration: 3600,
  },
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },
  auth0Management: {
    clientId: env.AUTH0_MGMT_CLIENT_ID,
    clientSecret: env.AUTH0_MGMT_CLIENT_SECRET,
    dbConnection: env.AUTH0_DB_CONNECTION,
    enabled: Boolean(env.AUTH0_MGMT_CLIENT_ID && env.AUTH0_MGMT_CLIENT_SECRET),
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    enabled: Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    ),
  },
  adminEmails: env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()),
} as const;
