import pino from "pino";
import { getConfig, getLoggingConfig } from "../config";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
// ============================================================================
// 3. LOGGER SYMBOL FOR REQUEST CONTEXT
// ============================================================================
/**
 * Symbol used to attach logger to request objects
 */
export const LOGGER_SYMBOL = Symbol.for("soulseer.logger");
// ============================================================================
// 4. LOG FORMATTERS
// ============================================================================
/**
 * Format log level for pretty output
 * @param level Log level
 * @returns Formatted level string
 */
function formatLevel(level) {
    const levels = {
        trace: "🔍",
        debug: "🐛",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
        fatal: "💀",
    };
    return levels[level] || level.toUpperCase();
}
/**
 * Format timestamp for pretty output
 * @param timestamp ISO timestamp
 * @returns Formatted timestamp string
 */
function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
/**
 * Pretty print formatter for development
 */
export function prettyFormatter(log) {
    const { level, time, msg, ...rest } = log;
    const contextParts = [];
    if (rest.requestId)
        contextParts.push(`req=${rest.requestId}`);
    if (rest.userId)
        contextParts.push(`user=${rest.userId}`);
    if (rest.method)
        contextParts.push(`${rest.method} ${rest.path}`);
    if (rest.durationMs)
        contextParts.push(`duration=${rest.durationMs}ms`);
    if (rest.statusCode)
        contextParts.push(`status=${rest.statusCode}`);
    const context = contextParts.length > 0 ? ` [${contextParts.join(" ")}]` : "";
    const message = typeof msg === "object" ? JSON.stringify(msg) : msg;
    return `${formatTimestamp(time)} ${formatLevel(level)} ${message}${context}`;
}
/**
 * JSON formatter for production
 */
export function jsonFormatter(log) {
    return JSON.stringify(log) + "\n";
}
// ============================================================================
// 5. LOG FILE MANAGEMENT
// ============================================================================
/**
 * Ensure log directory exists
 * @param logPath Full path to log file
 */
function ensureLogDirectoryExists(logPath) {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
/**
 * Get log file stream
 * @param logPath Path to log file
 * @returns Write stream for log file
 */
function getLogFileStream(logPath) {
    ensureLogDirectoryExists(logPath);
    return fs.createWriteStream(logPath, { flags: "a" });
}
/**
 * Rotate log files
 * @param logPath Current log file path
 * @param maxSize Maximum file size
 * @param maxFiles Maximum number of files to keep
 */
function rotateLogs(logPath, maxSize, maxFiles) {
    try {
        if (!fs.existsSync(logPath))
            return;
        const stats = fs.statSync(logPath);
        const sizeLimit = parseSize(maxSize);
        if (stats.size < sizeLimit)
            return;
        // Find all log files
        const dir = path.dirname(logPath);
        const baseName = path.basename(logPath, path.extname(logPath));
        const ext = path.extname(logPath);
        const logFiles = fs
            .readdirSync(dir)
            .filter((file) => file.startsWith(baseName) && file.endsWith(ext))
            .sort((a, b) => {
            const aIndex = parseInt(a.match(/\.(\d+)$/)?.[1] || "0");
            const bIndex = parseInt(b.match(/\.(\d+)$/)?.[1] || "0");
            return bIndex - aIndex;
        });
        // Rotate files
        if (logFiles.length >= maxFiles) {
            const oldest = logFiles[logFiles.length - 1];
            fs.unlinkSync(path.join(dir, oldest));
        }
        // Rename current files
        for (let i = logFiles.length - 1; i >= 0; i--) {
            const currentPath = path.join(dir, logFiles[i]);
            const nextIndex = i + 1;
            const newPath = path.join(dir, `${baseName}.${nextIndex}${ext}`);
            fs.renameSync(currentPath, newPath);
        }
        // Rename current log to .1
        const currentLogPath = path.join(dir, `${baseName}${ext}`);
        if (fs.existsSync(currentLogPath)) {
            fs.renameSync(currentLogPath, path.join(dir, `${baseName}.1${ext}`));
        }
    }
    catch (error) {
        console.error("Log rotation failed:", error);
    }
}
/**
 * Parse size string to bytes
 * @param size Size string (e.g., "10m", "1gb")
 * @returns Size in bytes
 */
function parseSize(size) {
    const match = size.match(/^(\d+)([kmgt]b?)$/i);
    if (!match)
        return parseInt(size) || 0;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case "kb":
            return value * 1024;
        case "k":
            return value * 1000;
        case "mb":
            return value * 1024 * 1024;
        case "m":
            return value * 1000 * 1000;
        case "gb":
            return value * 1024 * 1024 * 1024;
        case "g":
            return value * 1000 * 1000 * 1000;
        case "tb":
            return value * 1024 * 1024 * 1024 * 1024;
        case "t":
            return value * 1000 * 1000 * 1000 * 1000;
        default:
            return value;
    }
}
// ============================================================================
// 6. MAIN LOGGER CLASS
// ============================================================================
/**
 * Main Logger class with extended functionality
 */
export class SoulSeerLogger {
    logger;
    context;
    constructor(options) {
        this.logger = pino(options);
        this.context = {};
    }
    /**
     * Add context to logger
     * @param key Context key
     * @param value Context value
     */
    withContext(key, value) {
        this.context[key] = value;
        return this;
    }
    /**
     * Create a child logger with additional context
     * @param context Additional context
     * @returns New logger instance
     */
    child(context) {
        const childLogger = this.logger.child(context);
        const newLogger = new SoulSeerLogger({});
        newLogger.logger = childLogger;
        newLogger.context = { ...this.context, ...context };
        return newLogger;
    }
    /**
     * Log at trace level
     * @param message Log message
     * @param data Additional data
     */
    trace(message, data) {
        this.logger.trace(this.context, message, data);
    }
    /**
     * Log at debug level
     * @param message Log message
     * @param data Additional data
     */
    debug(message, data) {
        this.logger.debug(this.context, message, data);
    }
    /**
     * Log at info level
     * @param message Log message
     * @param data Additional data
     */
    info(message, data) {
        this.logger.info(this.context, message, data);
    }
    /**
     * Log at warn level
     * @param message Log message
     * @param data Additional data
     */
    warn(message, data) {
        this.logger.warn(this.context, message, data);
    }
    /**
     * Log at error level
     * @param message Log message
     * @param error Error object
     * @param data Additional data
     */
    error(message, error, data) {
        const logData = data || {};
        if (error) {
            logData.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        this.logger.error(this.context, message, logData);
    }
    /**
     * Log at fatal level
     * @param message Log message
     * @param error Error object
     * @param data Additional data
     */
    fatal(message, error, data) {
        const logData = data || {};
        if (error) {
            logData.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        this.logger.fatal(this.context, message, logData);
    }
    /**
     * Log performance metrics
     * @param operation Operation name
     * @param startTime Start time in milliseconds
     * @param data Additional data
     */
    performance(operation, startTime, data) {
        const durationMs = Date.now() - startTime;
        this.info(`Performance: ${operation}`, {
            durationMs,
            ...data,
        });
    }
    /**
     * Log business metrics
     * @param metricName Metric name
     * @param value Metric value
     * @param data Additional data
     */
    metric(metricName, value, data) {
        this.info(`Metric: ${metricName}`, {
            value,
            ...data,
        });
    }
    /**
     * Get the underlying Pino logger
     * @returns Pino logger instance
     */
    getPinoLogger() {
        return this.logger;
    }
}
// ============================================================================
// 7. LOGGER INSTANCE MANAGEMENT
// ============================================================================
/**
 * Global logger instance
 */
let globalLogger = null;
/**
 * Create the main logger instance
 * @returns Logger instance
 */
export function createLogger() {
    const config = getConfig();
    const loggingConfig = getLoggingConfig(config);
    // Base logger options
    const options = {
        level: loggingConfig.level,
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        formatters: {
            level: (label) => {
                return { level: label };
            },
        },
    };
    // Add transports based on configuration
    const transports = [];
    // Console transport
    if (loggingConfig.format === "pretty") {
        transports.push({
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l o",
                ignore: "pid,hostname",
            },
        });
    }
    else {
        transports.push({
            target: "pino/file",
            options: {},
        });
    }
    // File transport if enabled
    if (loggingConfig.fileEnabled) {
        rotateLogs(loggingConfig.filePath, loggingConfig.fileMaxSize, loggingConfig.fileMaxFiles);
        transports.push({
            target: "pino/file",
            options: {
                destination: loggingConfig.filePath,
                mkdir: true,
            },
        });
    }
    if (transports.length > 0) {
        options.transport = {
            targets: transports,
        };
    }
    return new SoulSeerLogger(options);
}
/**
 * Get the global logger instance
 * @returns Logger instance
 */
export function getLogger() {
    if (!globalLogger) {
        globalLogger = createLogger();
    }
    return globalLogger;
}
/**
 * Reset the global logger instance (useful for testing)
 */
export function resetLogger() {
    globalLogger = null;
}
// ============================================================================
// 8. REQUEST LOGGING MIDDLEWARE
// ============================================================================
/**
 * Request logging middleware for Express
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function requestLoggerMiddleware(req, res, next) {
    const startTime = Date.now();
    const requestId = req.headers["x-request-id"] || randomUUID();
    const userAgent = req.headers["user-agent"] || "unknown";
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    // Create request context
    const context = {
        requestId: requestId,
        startTime,
        path: req.path,
        method: req.method,
        ip: ip,
        userAgent: userAgent,
    };
    // Attach logger and context to request
    const logger = getLogger().child(context);
    req[LOGGER_SYMBOL] = logger;
    // Add request ID to response headers
    res.setHeader("X-Request-ID", requestId);
    // Log request start
    logger.info(`Request started: ${req.method} ${req.path}`, {
        headers: req.headers,
        query: req.query,
        body: req.body,
    });
    // Wrap response methods to log completion
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    res.send = function (body) {
        logRequestCompletion(res, logger, startTime);
        return originalSend.call(this, body);
    };
    res.json = function (body) {
        logRequestCompletion(res, logger, startTime);
        return originalJson.call(this, body);
    };
    res.end = function (...args) {
        logRequestCompletion(res, logger, startTime);
        return originalEnd.call(this, ...args);
    };
    // Handle errors
    res.on("finish", () => {
        logRequestCompletion(res, logger, startTime);
    });
    res.on("close", () => {
        logRequestCompletion(res, logger, startTime);
    });
    res.on("error", (err) => {
        logger.error("Response error", err, {
            statusCode: res.statusCode,
        });
    });
    next();
}
/**
 * Log request completion
 * @param res Express response
 * @param logger Logger instance
 * @param startTime Request start time
 */
function logRequestCompletion(res, logger, startTime) {
    if (res.headersSent) {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;
        logger.info(`Request completed: ${statusCode}`, {
            statusCode,
            durationMs,
            headers: res.getHeaders(),
        });
    }
}
// ============================================================================
// 9. ERROR LOGGING MIDDLEWARE
// ============================================================================
/**
 * Error logging middleware for Express
 * @param err Error
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function errorLoggerMiddleware(err, req, res, next) {
    const logger = req[LOGGER_SYMBOL] || getLogger();
    const requestId = req.headers["x-request-id"] || "unknown";
    logger.error("Unhandled error in request", err, {
        requestId,
        path: req.path,
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body,
    });
    // Pass to next error handler
    next(err);
}
// ============================================================================
// 10. CORRELATION ID UTILITIES
// ============================================================================
/**
 * Get correlation ID from request
 * @param req Express request or IncomingMessage
 * @returns Correlation ID
 */
export function getCorrelationId(req) {
    return (req.headers["x-request-id"] ||
        req.headers["x-correlation-id"] ||
        randomUUID());
}
/**
 * Correlation ID middleware
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function correlationIdMiddleware(req, res, next) {
    const correlationId = getCorrelationId(req);
    req.headers["x-correlation-id"] = correlationId;
    res.setHeader("X-Correlation-ID", correlationId);
    next();
}
// ============================================================================
// 11. BUSINESS METRICS LOGGING
// ============================================================================
/**
 * Log reading-related business metrics
 * @param readingId Reading ID
 * @param userId User ID
 * @param action Action performed
 * @param data Additional data
 */
export function logReadingMetric(readingId, userId, action, data) {
    const logger = getLogger();
    logger.metric(`reading.${action}`, 1, {
        readingId,
        userId,
        ...data,
    });
}
/**
 * Log payment-related business metrics
 * @param transactionId Transaction ID
 * @param userId User ID
 * @param action Action performed
 * @param amount Amount in cents
 * @param data Additional data
 */
export function logPaymentMetric(transactionId, userId, action, amount, data) {
    const logger = getLogger();
    logger.metric(`payment.${action}`, amount, {
        transactionId,
        userId,
        ...data,
    });
}
/**
 * Log messaging-related business metrics
 * @param messageId Message ID
 * @param senderId Sender ID
 * @param receiverId Receiver ID
 * @param action Action performed
 * @param data Additional data
 */
export function logMessagingMetric(messageId, senderId, receiverId, action, data) {
    const logger = getLogger();
    logger.metric(`messaging.${action}`, 1, {
        messageId,
        senderId,
        receiverId,
        ...data,
    });
}
/**
 * Log forum-related business metrics
 * @param postId Post ID
 * @param userId User ID
 * @param action Action performed
 * @param data Additional data
 */
export function logForumMetric(postId, userId, action, data) {
    const logger = getLogger();
    logger.metric(`forum.${action}`, 1, {
        postId,
        userId,
        ...data,
    });
}
// ============================================================================
// 12. PERFORMANCE MONITORING
// ============================================================================
/**
 * Create a performance timer
 * @param operation Operation name
 * @returns Timer function
 */
export function createPerformanceTimer(operation) {
    const startTime = Date.now();
    const logger = getLogger();
    return () => {
        logger.performance(operation, startTime);
    };
}
/**
 * Performance monitoring middleware
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function performanceMiddleware(req, res, next) {
    const startTime = Date.now();
    const path = req.path;
    const method = req.method;
    res.on("finish", () => {
        const durationMs = Date.now() - startTime;
        const logger = getLogger();
        logger.performance(`${method} ${path}`, startTime, {
            statusCode: res.statusCode,
            contentLength: res.getHeader("content-length"),
        });
    });
    next();
}
// ============================================================================
// 13. HEALTH CHECK LOGGING
// ============================================================================
/**
 * Log health check result
 * @param service Service name
 * @param status Status
 * @param data Additional data
 */
export function logHealthCheck(service, status, data) {
    const logger = getLogger();
    logger.info(`Health check: ${service} ${status}`, {
        service,
        status,
        ...data,
    });
}
/**
 * Health check logging middleware
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function healthCheckMiddleware(req, res, next) {
    if (req.path === "/health") {
        const logger = getLogger();
        logger.info("Health check requested");
    }
    next();
}
// ============================================================================
// 14. LOGGER UTILITY FUNCTIONS
// ============================================================================
/**
 * Get logger from request
 * @param req Express request
 * @returns Logger instance
 */
export function getRequestLogger(req) {
    return req[LOGGER_SYMBOL] || getLogger();
}
/**
 * Create a scoped logger with additional context
 * @param context Additional context
 * @returns Scoped logger instance
 */
export function createScopedLogger(context) {
    return getLogger().child(context);
}
/**
 * Mask sensitive data in logs
 * @param data Data to mask
 * @param fields Fields to mask
 * @returns Masked data
 */
export function maskSensitiveData(data, fields = ["password", "token", "secret", "key"]) {
    const maskedData = { ...data };
    fields.forEach((field) => {
        if (maskedData[field]) {
            maskedData[field] = "[REDACTED]";
        }
    });
    return maskedData;
}
// ============================================================================
// 15. STARTUP AND SHUTDOWN LOGGING
// ============================================================================
/**
 * Log application startup
 * @param config Application configuration
 */
export function logStartup(config) {
    const logger = getLogger();
    logger.info(`Starting ${config.app.APP_NAME} v${config.app.APP_VERSION}`);
    logger.info(`Environment: ${config.app.NODE_ENV}`);
    logger.info(`Server listening on ${config.app.HOST}:${config.app.PORT}`);
    logger.info(`API prefix: ${config.app.API_PREFIX}`);
    logger.info(`Frontend URL: ${config.app.FRONTEND_URL}`);
    // Log feature flags
    logger.info("Feature flags:", {
        readingsEnabled: config.featureFlags.FEATURE_READINGS_ENABLED,
        messagingEnabled: config.featureFlags.FEATURE_MESSAGING_ENABLED,
        communityEnabled: config.featureFlags.FEATURE_COMMUNITY_ENABLED,
        paymentsEnabled: config.featureFlags.FEATURE_PAYMENTS_ENABLED,
        adminDashboardEnabled: config.featureFlags.FEATURE_ADMIN_DASHBOARD_ENABLED,
    });
    // Log service integrations
    logger.info("Service integrations:", {
        auth0: config.auth0.AUTH0_DOMAIN ? "enabled" : "disabled",
        stripe: config.stripe.STRIPE_SECRET_KEY ? "enabled" : "disabled",
        agora: config.agora.AGORA_APP_ID ? "enabled" : "disabled",
    });
}
/**
 * Log application shutdown
 * @param signal Shutdown signal
 */
export function logShutdown(signal) {
    const logger = getLogger();
    logger.info(`Received ${signal} signal, shutting down gracefully...`);
}
/**
 * Log unhandled promise rejection
 * @param reason Rejection reason
 * @param promise Rejected promise
 */
export function logUnhandledRejection(reason, promise) {
    const logger = getLogger();
    logger.error("Unhandled promise rejection", reason instanceof Error ? reason : new Error(String(reason)), {
        promise: promise.toString(),
    });
}
/**
 * Log uncaught exception
 * @param error Error object
 */
export function logUncaughtException(error) {
    const logger = getLogger();
    logger.fatal("Uncaught exception", error);
}
// ============================================================================
// 16. DEFAULT EXPORT
// ============================================================================
/**
 * Default export for easy import
 */
export default {
    getLogger,
    createLogger,
    resetLogger,
    requestLoggerMiddleware,
    errorLoggerMiddleware,
    correlationIdMiddleware,
    performanceMiddleware,
    healthCheckMiddleware,
    getRequestLogger,
    createScopedLogger,
    logReadingMetric,
    logPaymentMetric,
    logMessagingMetric,
    logForumMetric,
    createPerformanceTimer,
    logHealthCheck,
    logStartup,
    logShutdown,
    logUnhandledRejection,
    logUncaughtException,
    maskSensitiveData,
    LOGGER_SYMBOL,
};
