import { z } from "zod";

/**
 * Comprehensive configuration management system for SoulSeer platform
 * Handles environment variable validation, nested configuration structure,
 * and environment-specific settings (development, staging, production)
 */

// ============================================================================
// 1. ENVIRONMENT VARIABLE SCHEMA DEFINITION
// ============================================================================

/**
 * Database Configuration Schema
 * Validates all database-related environment variables
 */
const databaseSchema = z.object({
  DATABASE_URL: z.string().url().describe("PostgreSQL connection URL"),
  DATABASE_MAX_POOL_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(20)
    .describe("Maximum database connection pool size"),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30000)
    .describe("Database connection idle timeout in milliseconds"),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5000)
    .describe("Database connection timeout in milliseconds"),
});

/**
 * Security Configuration Schema
 * Validates all security-related environment variables
 */
const securitySchema = z.object({
  JWT_SECRET: z.string().min(32).describe("JWT secret key for token signing"),
  JWT_EXPIRES_IN: z.string().default("1h").describe("JWT token expiration time"),
  REFRESH_TOKEN_SECRET: z.string().min(32).describe("Refresh token secret key"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d").describe("Refresh token expiration time"),
  COOKIE_SECRET: z.string().min(32).describe("Cookie signing secret"),
  SESSION_SECRET: z.string().min(32).describe("Session secret for express-session"),
  CORS_ORIGIN: z
    .string()
    .url()
    .or(z.string().regex(/^\*/))
    .default("*")
    .describe("Allowed CORS origin"),
  CORS_METHODS: z
    .string()
    .default("GET,HEAD,PUT,PATCH,POST,DELETE")
    .describe("Allowed CORS methods"),
  CORS_CREDENTIALS: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Allow CORS credentials"),
});

/**
 * Auth0 Configuration Schema
 * Validates all Auth0-related environment variables
 */
const auth0Schema = z.object({
  AUTH0_DOMAIN: z.string().url().describe("Auth0 domain URL"),
  AUTH0_CLIENT_ID: z.string().min(1).describe("Auth0 client ID"),
  AUTH0_CLIENT_SECRET: z.string().min(1).describe("Auth0 client secret"),
  AUTH0_AUDIENCE: z.string().default("https://soulseer.com").describe("Auth0 API audience"),
  AUTH0_ISSUER_BASE_URL: z.string().url().describe("Auth0 issuer base URL"),
  AUTH0_CALLBACK_URL: z.string().url().describe("Auth0 callback URL"),
  AUTH0_POST_LOGOUT_REDIRECT_URL: z
    .string()
    .url()
    .describe("Auth0 post-logout redirect URL"),
  AUTH0_SCOPE: z
    .string()
    .default("openid profile email")
    .describe("Auth0 authentication scope"),
});

/**
 * Stripe Configuration Schema
 * Validates all Stripe-related environment variables
 */
const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1).describe("Stripe secret key"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).describe("Stripe webhook signing secret"),
  STRIPE_CONNECT_CLIENT_ID: z.string().min(1).describe("Stripe Connect client ID"),
  STRIPE_SUCCESS_URL: z.string().url().describe("Stripe success redirect URL"),
  STRIPE_CANCEL_URL: z.string().url().describe("Stripe cancel redirect URL"),
  STRIPE_MINIMUM_TOPUP: z.coerce
    .number()
    .int()
    .positive()
    .default(500)
    .describe("Minimum top-up amount in cents"),
  STRIPE_PLATFORM_FEE_PERCENTAGE: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(30)
    .describe("Platform fee percentage for readings"),
});

/**
 * Agora Configuration Schema
 * Validates all Agora-related environment variables
 */
const agoraSchema = z.object({
  AGORA_APP_ID: z.string().min(1).describe("Agora application ID"),
  AGORA_APP_CERTIFICATE: z.string().min(1).describe("Agora application certificate"),
  AGORA_TOKEN_EXPIRATION: z.coerce
    .number()
    .int()
    .positive()
    .default(3600)
    .describe("Agora token expiration time in seconds"),
  AGORA_RTC_TOKEN_BUILDER: z
    .string()
    .default("RtcTokenBuilder")
    .describe("Agora RTC token builder class"),
  AGORA_RTM_TOKEN_BUILDER: z
    .string()
    .default("RtmTokenBuilder")
    .describe("Agora RTM token builder class"),
});

/**
 * Rate Limiting Configuration Schema
 * Validates all rate limiting-related environment variables
 */
const rateLimitingSchema = z.object({
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000)
    .describe("Rate limiting window in milliseconds"),
  RATE_LIMIT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .positive()
    .default(100)
    .describe("Maximum requests per window"),
  RATE_LIMIT_STRICT: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(false)
    .describe("Enable strict rate limiting"),
  RATE_LIMIT_TRUST_PROXY: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Trust proxy headers for rate limiting"),
});

/**
 * Application Configuration Schema
 * Validates all application-related environment variables
 */
const appSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development")
    .describe("Node.js environment"),
  PORT: z.coerce.number().int().positive().default(3000).describe("Server port"),
  HOST: z.string().default("0.0.0.0").describe("Server host"),
  APP_NAME: z.string().default("SoulSeer").describe("Application name"),
  APP_VERSION: z.string().default("1.0.0").describe("Application version"),
  API_PREFIX: z.string().default("/api").describe("API route prefix"),
  FRONTEND_URL: z.string().url().describe("Frontend application URL"),
  ADMIN_EMAIL: z.string().email().describe("Admin contact email"),
});

/**
 * Logging Configuration Schema
 * Validates all logging-related environment variables
 */
const loggingSchema = z.object({
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "fatal", "silent"])
    .default("info")
    .describe("Logging level"),
  LOG_FORMAT: z
    .enum(["json", "pretty"])
    .default("pretty")
    .describe("Log output format"),
  LOG_FILE_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(false)
    .describe("Enable file logging"),
  LOG_FILE_PATH: z
    .string()
    .default("./logs/app.log")
    .describe("Log file path"),
  LOG_FILE_MAX_SIZE: z
    .string()
    .default("10m")
    .describe("Maximum log file size"),
  LOG_FILE_MAX_FILES: z.coerce
    .number()
    .int()
    .positive()
    .default(5)
    .describe("Maximum number of log files to keep"),
});

/**
 * Metrics Configuration Schema
 * Validates all metrics-related environment variables
 */
const metricsSchema = z.object({
  METRICS_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Enable metrics collection"),
  METRICS_PORT: z.coerce.number().int().positive().default(9090).describe("Metrics server port"),
  METRICS_PATH: z.string().default("/metrics").describe("Metrics endpoint path"),
  METRICS_PREFIX: z.string().default("soulseer_").describe("Metrics prefix"),
});

/**
 * File Storage Configuration Schema
 * Validates all file storage-related environment variables
 */
const fileStorageSchema = z.object({
  FILE_STORAGE_PROVIDER: z
    .enum(["cloudinary", "s3", "local"])
    .default("cloudinary")
    .describe("File storage provider"),
  CLOUDINARY_CLOUD_NAME: z.string().optional().describe("Cloudinary cloud name"),
  CLOUDINARY_API_KEY: z.string().optional().describe("Cloudinary API key"),
  CLOUDINARY_API_SECRET: z.string().optional().describe("Cloudinary API secret"),
  AWS_S3_BUCKET: z.string().optional().describe("AWS S3 bucket name"),
  AWS_S3_REGION: z.string().optional().describe("AWS S3 region"),
  AWS_ACCESS_KEY_ID: z.string().optional().describe("AWS access key ID"),
  AWS_SECRET_ACCESS_KEY: z.string().optional().describe("AWS secret access key"),
  FILE_UPLOAD_MAX_SIZE: z
    .string()
    .default("5mb")
    .describe("Maximum file upload size"),
  FILE_ALLOWED_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/webp")
    .describe("Allowed file types for upload"),
});

/**
 * Email Configuration Schema
 * Validates all email-related environment variables
 */
const emailSchema = z.object({
  EMAIL_SERVICE: z
    .enum(["sendgrid", "mailgun", "smtp", "none"])
    .default("none")
    .describe("Email service provider"),
  EMAIL_FROM: z
    .string()
    .email()
    .default("noreply@soulseer.com")
    .describe("Default from email address"),
  SENDGRID_API_KEY: z.string().optional().describe("SendGrid API key"),
  MAILGUN_API_KEY: z.string().optional().describe("Mailgun API key"),
  MAILGUN_DOMAIN: z.string().optional().describe("Mailgun domain"),
  SMTP_HOST: z.string().optional().describe("SMTP host"),
  SMTP_PORT: z.coerce.number().int().positive().optional().describe("SMTP port"),
  SMTP_USER: z.string().optional().describe("SMTP username"),
  SMTP_PASSWORD: z.string().optional().describe("SMTP password"),
});

/**
 * Feature Flags Configuration Schema
 * Validates all feature flag-related environment variables
 */
const featureFlagsSchema = z.object({
  FEATURE_READINGS_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Enable readings functionality"),
  FEATURE_MESSAGING_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Enable messaging functionality"),
  FEATURE_COMMUNITY_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Enable community forum functionality"),
  FEATURE_PAYMENTS_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Enable payment functionality"),
  FEATURE_ADMIN_DASHBOARD_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .pipe(z.boolean())
    .default(true)
    .describe("Enable admin dashboard functionality"),
});

/**
 * Performance Configuration Schema
 * Validates all performance-related environment variables
 */
const performanceSchema = z.object({
  CACHE_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default("true")
    .describe("Enable caching"),
  CACHE_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(300)
    .describe("Cache time-to-live in seconds"),
  COMPRESSION_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default("true")
    .describe("Enable response compression"),
  COMPRESSION_LEVEL: z.coerce
    .number()
    .int()
    .min(0)
    .max(9)
    .default(6)
    .describe("Compression level"),
  COMPRESSION_THRESHOLD: z
    .string()
    .default("1kb")
    .describe("Compression threshold"),
});

/**
 * WebSocket Configuration Schema
 * Validates all WebSocket-related environment variables
 */
const websocketSchema = z.object({
  WS_HEARTBEAT_INTERVAL: z.coerce
    .number()
    .int()
    .positive()
    .default(30000)
    .describe("WebSocket heartbeat interval in milliseconds"),
  WS_HEARTBEAT_TIMEOUT: z.coerce
    .number()
    .int()
    .positive()
    .default(60000)
    .describe("WebSocket heartbeat timeout in milliseconds"),
  WS_MAX_PAYLOAD_SIZE: z
    .string()
    .default("16kb")
    .describe("Maximum WebSocket payload size"),
});

/**
 * Health Check Configuration Schema
 * Validates all health check-related environment variables
 */
const healthCheckSchema = z.object({
  HEALTH_CHECK_ENABLED: z
    .string()
    .transform((val) => val === "true")
    .default("true")
    .describe("Enable health check endpoint"),
  HEALTH_CHECK_PATH: z
    .string()
    .default("/health")
    .describe("Health check endpoint path"),
  HEALTH_CHECK_INTERVAL: z.coerce
    .number()
    .int()
    .positive()
    .default(60000)
    .describe("Health check interval in milliseconds"),
});

// ============================================================================
// 2. COMPLETE CONFIGURATION SCHEMA
// ============================================================================

/**
 * Complete configuration schema combining all sub-schemas
 */
export const configSchema = z.object({
  // Core configurations
  app: appSchema,
  database: databaseSchema,
  security: securitySchema,
  
  // Service integrations
  auth0: auth0Schema,
  stripe: stripeSchema,
  agora: agoraSchema,
  
  // Operational configurations
  rateLimiting: rateLimitingSchema,
  logging: loggingSchema,
  metrics: metricsSchema,
  fileStorage: fileStorageSchema,
  email: emailSchema,
  
  // Feature configurations
  featureFlags: featureFlagsSchema,
  performance: performanceSchema,
  websocket: websocketSchema,
  healthCheck: healthCheckSchema,
});

// ============================================================================
// 3. CONFIGURATION TYPE DEFINITION
// ============================================================================

/**
 * TypeScript type for the complete configuration
 */
export type AppConfig = z.infer<typeof configSchema>;

// ============================================================================
// 4. CONFIGURATION VALIDATION AND LOADING
// ============================================================================

/**
 * Load and validate configuration from environment variables
 * @throws {Error} If configuration validation fails
 */
export function loadConfig(): AppConfig {
  try {
    // Parse environment variables with prefix-based organization
    const rawConfig = {
      app: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        APP_NAME: process.env.APP_NAME,
        APP_VERSION: process.env.APP_VERSION,
        API_PREFIX: process.env.API_PREFIX,
        FRONTEND_URL: process.env.FRONTEND_URL,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      },
      database: {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_MAX_POOL_SIZE: process.env.DATABASE_MAX_POOL_SIZE,
        DATABASE_IDLE_TIMEOUT_MS: process.env.DATABASE_IDLE_TIMEOUT_MS,
        DATABASE_CONNECTION_TIMEOUT_MS: process.env.DATABASE_CONNECTION_TIMEOUT_MS,
      },
      security: {
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
        REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,
        COOKIE_SECRET: process.env.COOKIE_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        CORS_METHODS: process.env.CORS_METHODS,
        CORS_CREDENTIALS: process.env.CORS_CREDENTIALS,
      },
      auth0: {
        AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
        AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
        AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
        AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
        AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
        AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL,
        AUTH0_POST_LOGOUT_REDIRECT_URL: process.env.AUTH0_POST_LOGOUT_REDIRECT_URL,
        AUTH0_SCOPE: process.env.AUTH0_SCOPE,
      },
      stripe: {
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID,
        STRIPE_SUCCESS_URL: process.env.STRIPE_SUCCESS_URL,
        STRIPE_CANCEL_URL: process.env.STRIPE_CANCEL_URL,
        STRIPE_MINIMUM_TOPUP: process.env.STRIPE_MINIMUM_TOPUP,
        STRIPE_PLATFORM_FEE_PERCENTAGE: process.env.STRIPE_PLATFORM_FEE_PERCENTAGE,
      },
      agora: {
        AGORA_APP_ID: process.env.AGORA_APP_ID,
        AGORA_APP_CERTIFICATE: process.env.AGORA_APP_CERTIFICATE,
        AGORA_TOKEN_EXPIRATION: process.env.AGORA_TOKEN_EXPIRATION,
        AGORA_RTC_TOKEN_BUILDER: process.env.AGORA_RTC_TOKEN_BUILDER,
        AGORA_RTM_TOKEN_BUILDER: process.env.AGORA_RTM_TOKEN_BUILDER,
      },
      rateLimiting: {
        RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
        RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_STRICT: process.env.RATE_LIMIT_STRICT,
        RATE_LIMIT_TRUST_PROXY: process.env.RATE_LIMIT_TRUST_PROXY,
      },
      logging: {
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FORMAT: process.env.LOG_FORMAT,
        LOG_FILE_ENABLED: process.env.LOG_FILE_ENABLED,
        LOG_FILE_PATH: process.env.LOG_FILE_PATH,
        LOG_FILE_MAX_SIZE: process.env.LOG_FILE_MAX_SIZE,
        LOG_FILE_MAX_FILES: process.env.LOG_FILE_MAX_FILES,
      },
      metrics: {
        METRICS_ENABLED: process.env.METRICS_ENABLED,
        METRICS_PORT: process.env.METRICS_PORT,
        METRICS_PATH: process.env.METRICS_PATH,
        METRICS_PREFIX: process.env.METRICS_PREFIX,
      },
      fileStorage: {
        FILE_STORAGE_PROVIDER: process.env.FILE_STORAGE_PROVIDER,
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
        AWS_S3_REGION: process.env.AWS_S3_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        FILE_UPLOAD_MAX_SIZE: process.env.FILE_UPLOAD_MAX_SIZE,
        FILE_ALLOWED_TYPES: process.env.FILE_ALLOWED_TYPES,
      },
      email: {
        EMAIL_SERVICE: process.env.EMAIL_SERVICE,
        EMAIL_FROM: process.env.EMAIL_FROM,
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
        MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
        MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      },
      featureFlags: {
        FEATURE_READINGS_ENABLED: process.env.FEATURE_READINGS_ENABLED,
        FEATURE_MESSAGING_ENABLED: process.env.FEATURE_MESSAGING_ENABLED,
        FEATURE_COMMUNITY_ENABLED: process.env.FEATURE_COMMUNITY_ENABLED,
        FEATURE_PAYMENTS_ENABLED: process.env.FEATURE_PAYMENTS_ENABLED,
        FEATURE_ADMIN_DASHBOARD_ENABLED: process.env.FEATURE_ADMIN_DASHBOARD_ENABLED,
      },
      performance: {
        CACHE_ENABLED: process.env.CACHE_ENABLED,
        CACHE_TTL: process.env.CACHE_TTL,
        COMPRESSION_ENABLED: process.env.COMPRESSION_ENABLED,
        COMPRESSION_LEVEL: process.env.COMPRESSION_LEVEL,
        COMPRESSION_THRESHOLD: process.env.COMPRESSION_THRESHOLD,
      },
      websocket: {
        WS_HEARTBEAT_INTERVAL: process.env.WS_HEARTBEAT_INTERVAL,
        WS_HEARTBEAT_TIMEOUT: process.env.WS_HEARTBEAT_TIMEOUT,
        WS_MAX_PAYLOAD_SIZE: process.env.WS_MAX_PAYLOAD_SIZE,
      },
      healthCheck: {
        HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED,
        HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH,
        HEALTH_CHECK_INTERVAL: process.env.HEALTH_CHECK_INTERVAL,
      },
    };

    // Validate the configuration
    const validatedConfig = configSchema.parse(rawConfig);

    // Additional validation for environment-specific requirements
    validateEnvironmentSpecificConfig(validatedConfig);

    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return `Invalid ${path}: ${issue.message}`;
        })
        .join("\n");
      
      throw new Error(
        `Configuration validation failed:\n${errorMessages}\n\nPlease check your environment variables.`
      );
    }
    
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate environment-specific configuration requirements
 * @param config Validated configuration object
 * @throws {Error} If environment-specific validation fails
 */
function validateEnvironmentSpecificConfig(config: AppConfig): void {
  // Production environment validation
  if (config.app.NODE_ENV === "production") {
    if (!config.security.JWT_SECRET || config.security.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    
    if (!config.security.REFRESH_TOKEN_SECRET || config.security.REFRESH_TOKEN_SECRET.length < 32) {
      throw new Error("REFRESH_TOKEN_SECRET must be at least 32 characters in production");
    }
    
    if (!config.security.COOKIE_SECRET || config.security.COOKIE_SECRET.length < 32) {
      throw new Error("COOKIE_SECRET must be at least 32 characters in production");
    }
    
    if (!config.security.SESSION_SECRET || config.security.SESSION_SECRET.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters in production");
    }
    
    if (config.logging.LOG_FORMAT !== "json") {
      console.warn("Warning: Production should use JSON logging format for better log management");
    }
  }
  
  // Development environment validation
  if (config.app.NODE_ENV === "development") {
    if (config.logging.LOG_FORMAT !== "pretty") {
      console.warn("Warning: Development typically uses pretty logging format for better readability");
    }
  }
  
  // Validate required service configurations based on feature flags
  if (config.featureFlags.FEATURE_PAYMENTS_ENABLED) {
    if (!config.stripe.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required when payments are enabled");
    }
    
    if (!config.stripe.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is required when payments are enabled");
    }
  }
  
  if (config.featureFlags.FEATURE_READINGS_ENABLED) {
    if (!config.agora.AGORA_APP_ID) {
      throw new Error("AGORA_APP_ID is required when readings are enabled");
    }
    
    if (!config.agora.AGORA_APP_CERTIFICATE) {
      throw new Error("AGORA_APP_CERTIFICATE is required when readings are enabled");
    }
  }
}

// ============================================================================
// 5. CONFIGURATION UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if the current environment is production
 * @param config Configuration object
 * @returns True if production environment
 */
export function isProduction(config: AppConfig): boolean {
  return config.app.NODE_ENV === "production";
}

/**
 * Check if the current environment is development
 * @param config Configuration object
 * @returns True if development environment
 */
export function isDevelopment(config: AppConfig): boolean {
  return config.app.NODE_ENV === "development";
}

/**
 * Check if the current environment is test
 * @param config Configuration object
 * @returns True if test environment
 */
export function isTest(config: AppConfig): boolean {
  return config.app.NODE_ENV === "test";
}

/**
 * Get the full API base URL
 * @param config Configuration object
 * @returns Full API base URL
 */
export function getApiBaseUrl(config: AppConfig): string {
  return `${config.app.FRONTEND_URL}${config.app.API_PREFIX}`;
}

/**
 * Get database connection URL with pool configuration
 * @param config Configuration object
 * @returns Database connection configuration
 */
export function getDatabaseConfig(config: AppConfig): any {
 return {
   connectionString: config.database.DATABASE_URL,
   max: config.database.DATABASE_MAX_POOL_SIZE,
   idleTimeoutMillis: config.database.DATABASE_IDLE_TIMEOUT_MS,
   connectionTimeoutMillis: config.database.DATABASE_CONNECTION_TIMEOUT_MS,
 };
}

/**
* Get CORS configuration
* @param config Configuration object
* @returns CORS configuration object
*/
export function getCorsConfig(config: AppConfig): any {
 return {
   origin: config.security.CORS_ORIGIN,
   methods: config.security.CORS_METHODS,
   credentials: config.security.CORS_CREDENTIALS,
   allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
 };
}

/**
* Get JWT configuration
* @param config Configuration object
* @returns JWT configuration object
*/
export function getJwtConfig(config: AppConfig): any {
 return {
   secret: config.security.JWT_SECRET,
   expiresIn: config.security.JWT_EXPIRES_IN,
   refreshSecret: config.security.REFRESH_TOKEN_SECRET,
   refreshExpiresIn: config.security.REFRESH_TOKEN_EXPIRES_IN,
 };
}

/**
* Get Stripe configuration
* @param config Configuration object
* @returns Stripe configuration object
*/
export function getStripeConfig(config: AppConfig): any {
 return {
   secretKey: config.stripe.STRIPE_SECRET_KEY,
   webhookSecret: config.stripe.STRIPE_WEBHOOK_SECRET,
   connectClientId: config.stripe.STRIPE_CONNECT_CLIENT_ID,
   successUrl: config.stripe.STRIPE_SUCCESS_URL,
   cancelUrl: config.stripe.STRIPE_CANCEL_URL,
   minimumTopup: config.stripe.STRIPE_MINIMUM_TOPUP,
   platformFeePercentage: config.stripe.STRIPE_PLATFORM_FEE_PERCENTAGE,
 };
}

/**
* Get Agora configuration
* @param config Configuration object
* @returns Agora configuration object
*/
export function getAgoraConfig(config: AppConfig): any {
 return {
   appId: config.agora.AGORA_APP_ID,
   appCertificate: config.agora.AGORA_APP_CERTIFICATE,
   tokenExpiration: config.agora.AGORA_TOKEN_EXPIRATION,
   rtcTokenBuilder: config.agora.AGORA_RTC_TOKEN_BUILDER,
   rtmTokenBuilder: config.agora.AGORA_RTM_TOKEN_BUILDER,
 };
}

/**
* Get logging configuration
* @param config Configuration object
* @returns Logging configuration object
*/
export function getLoggingConfig(config: AppConfig): any {
 return {
   level: config.logging.LOG_LEVEL,
   format: config.logging.LOG_FORMAT,
   fileEnabled: config.logging.LOG_FILE_ENABLED,
   filePath: config.logging.LOG_FILE_PATH,
   fileMaxSize: config.logging.LOG_FILE_MAX_SIZE,
   fileMaxFiles: config.logging.LOG_FILE_MAX_FILES,
 };
}

/**
* Get metrics configuration
* @param config Configuration object
* @returns Metrics configuration object
*/
export function getMetricsConfig(config: AppConfig): any {
 return {
   enabled: config.metrics.METRICS_ENABLED,
   port: config.metrics.METRICS_PORT,
   path: config.metrics.METRICS_PATH,
   prefix: config.metrics.METRICS_PREFIX,
 };
}

// ============================================================================
// 6. CONFIGURATION SINGLETON
// ============================================================================

/**
 * Configuration singleton instance
 */
let configInstance: AppConfig | null = null;

/**
 * Get the configuration singleton instance
 * @returns Validated configuration object
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset the configuration singleton (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

// ============================================================================
// 7. STARTUP VALIDATION
// ============================================================================

/**
 * Validate configuration on application startup
 * This ensures all required environment variables are present before the server starts
 */
export function validateStartupConfig(): void {
  try {
    const config = getConfig();
    console.log(`✅ Configuration validated successfully for ${config.app.NODE_ENV} environment`);
    console.log(`🚀 Starting ${config.app.APP_NAME} v${config.app.APP_VERSION}`);
    console.log(`🌐 Server will listen on ${config.app.HOST}:${config.app.PORT}`);
    console.log(`📡 API prefix: ${config.app.API_PREFIX}`);
  } catch (error) {
    console.error("❌ Configuration validation failed during startup:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ============================================================================
// 8. CONFIGURATION EXPORT
// ============================================================================

/**
 * Default export for easy import
 */
export default {
  loadConfig,
  getConfig,
  resetConfig,
  validateStartupConfig,
  isProduction,
  isDevelopment,
  isTest,
  getApiBaseUrl,
  getDatabaseConfig,
  getCorsConfig,
  getJwtConfig,
  getStripeConfig,
  getAgoraConfig,
  getLoggingConfig,
  getMetricsConfig,
  configSchema,
};