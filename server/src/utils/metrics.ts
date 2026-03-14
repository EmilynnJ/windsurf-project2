import { getConfig, getMetricsConfig } from "../config";
import { getLogger } from "./logger";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Comprehensive application metrics collection system for SoulSeer platform
 * Features:
 * - Counters, gauges, histograms, timers
 * - Integration with Prometheus
 * - Key metrics: request counts, error rates, response times, business metrics
 * - Dora metrics for deployment tracking
 * - Custom business metrics (readings started, payments processed, etc.)
 * - Health check endpoint integration
 */

// ============================================================================
// 1. METRIC TYPES AND INTERFACES
// ============================================================================

export type MetricType = "counter" | "gauge" | "histogram" | "timer";

export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labels?: string[];
}

export interface CounterMetric {
  inc(labels?: Record<string, string>): void;
  add(value: number, labels?: Record<string, string>): void;
}

export interface GaugeMetric {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>): void;
  dec(labels?: Record<string, string>): void;
}

export interface HistogramMetric {
  observe(value: number, labels?: Record<string, string>): void;
}

export interface TimerMetric {
  startTimer(labels?: Record<string, string>): () => number;
}

// ============================================================================
// 2. METRIC REGISTRY
// ============================================================================

/**
 * Metric registry interface
 */
export interface MetricRegistry {
  registerMetric(metric: MetricDefinition): void;
  getCounter(name: string): CounterMetric;
  getGauge(name: string): GaugeMetric;
  getHistogram(name: string): HistogramMetric;
  getTimer(name: string): TimerMetric;
  getMetrics(): string;
  reset(): void;
}

// ============================================================================
// 3. PROMETHEUS METRIC REGISTRY IMPLEMENTATION
// ============================================================================

/**
 * Prometheus-compatible metric registry
 */
export class PrometheusMetricRegistry implements MetricRegistry {
  private metrics: Map<string, any>;
  private counters: Map<string, CounterMetric>;
  private gauges: Map<string, GaugeMetric>;
  private histograms: Map<string, HistogramMetric>;
  private timers: Map<string, TimerMetric>;
  private prefix: string;
  
  constructor(prefix: string = "soulseer") {
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.timers = new Map();
    this.prefix = prefix;
  }
  
  public registerMetric(metric: MetricDefinition): void {
    const metricName = this.getMetricName(metric.name);
    
    switch (metric.type) {
      case "counter":
        this.counters.set(metricName, this.createCounter(metricName, metric.help, metric.labels));
        break;
      case "gauge":
        this.gauges.set(metricName, this.createGauge(metricName, metric.help, metric.labels));
        break;
      case "histogram":
        this.histograms.set(metricName, this.createHistogram(metricName, metric.help, metric.labels));
        break;
      case "timer":
        this.timers.set(metricName, this.createTimer(metricName, metric.help, metric.labels));
        break;
    }
  }
  
  public getCounter(name: string): CounterMetric {
    const metricName = this.getMetricName(name);
    if (!this.counters.has(metricName)) {
      throw new Error(`Counter metric ${metricName} not registered`);
    }
    return this.counters.get(metricName)!;
  }
  
  public getGauge(name: string): GaugeMetric {
    const metricName = this.getMetricName(name);
    if (!this.gauges.has(metricName)) {
      throw new Error(`Gauge metric ${metricName} not registered`);
    }
    return this.gauges.get(metricName)!;
  }
  
  public getHistogram(name: string): HistogramMetric {
    const metricName = this.getMetricName(name);
    if (!this.histograms.has(metricName)) {
      throw new Error(`Histogram metric ${metricName} not registered`);
    }
    return this.histograms.get(metricName)!;
  }
  
  public getTimer(name: string): TimerMetric {
    const metricName = this.getMetricName(name);
    if (!this.timers.has(metricName)) {
      throw new Error(`Timer metric ${metricName} not registered`);
    }
    return this.timers.get(metricName)!;
  }
  
  public getMetrics(): string {
    let output = "# HELP soulseer_metrics SoulSeer application metrics\n";
    output += "# TYPE soulseer_metrics gauge\n";
    
    // Add all metrics
    this.counters.forEach((counter, name) => {
      output += this.formatCounterMetric(counter);
    });
    
    this.gauges.forEach((gauge, name) => {
      output += this.formatGaugeMetric(gauge);
    });
    
    this.histograms.forEach((histogram, name) => {
      output += this.formatHistogramMetric(histogram);
    });
    
    return output;
  }
  
  public reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timers.clear();
  }
  
  private getMetricName(name: string): string {
    return `${this.prefix}_${name}`;
  }
  
  private createCounter(name: string, help: string, labels: string[] = []): CounterMetric {
    const metric: any = {
      name,
      help,
      type: "counter" as const,
      values: new Map<string, number>(),
      labels,
    };
    
    return {
      inc: (labels = {}) => {
        const labelKey = this.getLabelKey(labels);
        const current = metric.values.get(labelKey) || 0;
        metric.values.set(labelKey, current + 1);
      },
      add: (value, labels = {}) => {
        const labelKey = this.getLabelKey(labels);
        const current = metric.values.get(labelKey) || 0;
        metric.values.set(labelKey, current + value);
      },
    };
  }
  
  private createGauge(name: string, help: string, labels: string[] = []): GaugeMetric {
    const metric: any = {
      name,
      help,
      type: "gauge" as const,
      values: new Map<string, number>(),
      labels,
    };
    
    return {
      set: (value, labels = {}) => {
        const labelKey = this.getLabelKey(labels);
        metric.values.set(labelKey, value);
      },
      inc: (labels = {}) => {
        const labelKey = this.getLabelKey(labels);
        const current = metric.values.get(labelKey) || 0;
        metric.values.set(labelKey, current + 1);
      },
      dec: (labels = {}) => {
        const labelKey = this.getLabelKey(labels);
        const current = metric.values.get(labelKey) || 0;
        metric.values.set(labelKey, current - 1);
      },
    };
  }
  
  private createHistogram(name: string, help: string, labels: string[] = []): HistogramMetric {
    const metric: any = {
      name,
      help,
      type: "histogram" as const,
      values: new Map<string, number[]>(),
      labels,
    };
    
    return {
      observe: (value, labels = {}) => {
        const labelKey = this.getLabelKey(labels);
        const values = metric.values.get(labelKey) || [];
        values.push(value);
        metric.values.set(labelKey, values);
      },
    };
  }
  
  private createTimer(name: string, help: string, labels: string[] = []): TimerMetric {
    const histogram = this.createHistogram(name, help, labels);
    
    return {
      startTimer: (labels = {}) => {
        const start = process.hrtime();
        return () => {
          const diff = process.hrtime(start);
          const durationMs = diff[0] * 1000 + diff[1] / 1000000;
          histogram.observe(durationMs, labels);
          return durationMs;
        };
      },
    };
  }
  
  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(",");
  }
  
  private formatCounterMetric(counter: any): string {
    let output = `# HELP ${counter.name} ${counter.help}\n`;
    output += `# TYPE ${counter.name} counter\n`;
    
    counter.values.forEach((value, labelKey) => {
      if (labelKey) {
        output += `${counter.name}{${labelKey}} ${value}\n`;
      } else {
        output += `${counter.name} ${value}\n`;
      }
    });
    
    return output;
  }
  
  private formatGaugeMetric(gauge: any): string {
    let output = `# HELP ${gauge.name} ${gauge.help}\n`;
    output += `# TYPE ${gauge.name} gauge\n`;
    
    gauge.values.forEach((value, labelKey) => {
      if (labelKey) {
        output += `${gauge.name}{${labelKey}} ${value}\n`;
      } else {
        output += `${gauge.name} ${value}\n`;
      }
    });
    
    return output;
  }
  
  private formatHistogramMetric(histogram: any): string {
    let output = `# HELP ${histogram.name} ${histogram.help}\n`;
    output += `# TYPE ${histogram.name} histogram\n`;
    
    histogram.values.forEach((values, labelKey) => {
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      const count = values.length;
      const avg = sum / count;
      
      if (labelKey) {
        output += `${histogram.name}_sum{${labelKey}} ${sum}\n`;
        output += `${histogram.name}_count{${labelKey}} ${count}\n`;
        output += `${histogram.name}_bucket{${labelKey},le="+Inf"} ${count}\n`;
      } else {
        output += `${histogram.name}_sum ${sum}\n`;
        output += `${histogram.name}_count ${count}\n`;
        output += `${histogram.name}_bucket{le="+Inf"} ${count}\n`;
      }
    });
    
    return output;
  }
}

// ============================================================================
// 4. GLOBAL METRIC REGISTRY
// ============================================================================

/**
 * Global metric registry instance
 */
let globalMetricRegistry: MetricRegistry | null = null;

/**
 * Get the global metric registry
 * @returns Metric registry instance
 */
export function getMetricRegistry(): MetricRegistry {
  if (!globalMetricRegistry) {
    const config = getConfig();
    const metricsConfig = getMetricsConfig(config);
    globalMetricRegistry = new PrometheusMetricRegistry(metricsConfig.prefix);
    registerStandardMetrics(globalMetricRegistry);
  }
  return globalMetricRegistry;
}

/**
 * Reset the global metric registry (useful for testing)
 */
export function resetMetricRegistry(): void {
  globalMetricRegistry = null;
}

// ============================================================================
// 5. STANDARD METRICS REGISTRATION
// ============================================================================

/**
 * Register standard application metrics
 * @param registry Metric registry
 */
function registerStandardMetrics(registry: MetricRegistry): void {
  // Application metrics
  registry.registerMetric({
    name: "app_start_time",
    help: "Application start time (unix timestamp)",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "app_uptime_seconds",
    help: "Application uptime in seconds",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "app_version",
    help: "Application version",
    type: "gauge",
    labels: ["version"],
  });
  
  // HTTP metrics
  registry.registerMetric({
    name: "http_requests_total",
    help: "Total HTTP requests",
    type: "counter",
    labels: ["method", "path", "status_code"],
  });
  
  registry.registerMetric({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    type: "histogram",
    labels: ["method", "path"],
  });
  
  registry.registerMetric({
    name: "http_request_size_bytes",
    help: "HTTP request size in bytes",
    type: "histogram",
    labels: ["method", "path"],
  });
  
  registry.registerMetric({
    name: "http_response_size_bytes",
    help: "HTTP response size in bytes",
    type: "histogram",
    labels: ["method", "path"],
  });
  
  registry.registerMetric({
    name: "http_errors_total",
    help: "Total HTTP errors",
    type: "counter",
    labels: ["method", "path", "status_code"],
  });
  
  // Database metrics
  registry.registerMetric({
    name: "db_query_count",
    help: "Total database queries",
    type: "counter",
    labels: ["operation"],
  });
  
  registry.registerMetric({
    name: "db_query_duration_seconds",
    help: "Database query duration in seconds",
    type: "histogram",
    labels: ["operation"],
  });
  
  registry.registerMetric({
    name: "db_connection_pool_size",
    help: "Current database connection pool size",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "db_connection_pool_waiting",
    help: "Number of waiting database connections",
    type: "gauge",
  });
  
  // Dora metrics (Deployment metrics)
  registry.registerMetric({
    name: "dora_deployment_frequency",
    help: "Deployment frequency (deployments per day)",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "dora_lead_time_for_changes",
    help: "Lead time for changes (hours)",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "dora_mean_time_to_recover",
    help: "Mean time to recover (minutes)",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "dora_change_failure_rate",
    help: "Change failure rate (percentage)",
    type: "gauge",
  });
  
  // Business metrics - Readings
  registry.registerMetric({
    name: "readings_started_total",
    help: "Total readings started",
    type: "counter",
    labels: ["type", "status"],
  });
  
  registry.registerMetric({
    name: "readings_completed_total",
    help: "Total readings completed",
    type: "counter",
    labels: ["type"],
  });
  
  registry.registerMetric({
    name: "readings_duration_minutes",
    help: "Reading duration in minutes",
    type: "histogram",
    labels: ["type"],
  });
  
  registry.registerMetric({
    name: "readings_revenue_cents",
    help: "Reading revenue in cents",
    type: "counter",
    labels: ["type"],
  });
  
  registry.registerMetric({
    name: "readings_active",
    help: "Currently active readings",
    type: "gauge",
    labels: ["type"],
  });
  
  // Business metrics - Payments
  registry.registerMetric({
    name: "payments_total",
    help: "Total payments processed",
    type: "counter",
    labels: ["type", "status"],
  });
  
  registry.registerMetric({
    name: "payments_amount_cents",
    help: "Payment amount in cents",
    type: "counter",
    labels: ["type"],
  });
  
  registry.registerMetric({
    name: "user_balance_total_cents",
    help: "Total user balance across all users in cents",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "reader_earnings_total_cents",
    help: "Total reader earnings in cents",
    type: "gauge",
  });
  
  // Business metrics - Messaging
  registry.registerMetric({
    name: "messages_sent_total",
    help: "Total messages sent",
    type: "counter",
    labels: ["type"],
  });
  
  registry.registerMetric({
    name: "messages_paid_total",
    help: "Total paid messages",
    type: "counter",
  });
  
  registry.registerMetric({
    name: "messages_revenue_cents",
    help: "Messaging revenue in cents",
    type: "counter",
  });
  
  // Business metrics - Forum
  registry.registerMetric({
    name: "forum_posts_total",
    help: "Total forum posts",
    type: "counter",
    labels: ["category"],
  });
  
  registry.registerMetric({
    name: "forum_comments_total",
    help: "Total forum comments",
    type: "counter",
  });
  
  registry.registerMetric({
    name: "forum_flags_total",
    help: "Total forum content flags",
    type: "counter",
    labels: ["type", "status"],
  });
  
  // Business metrics - Users
  registry.registerMetric({
    name: "users_total",
    help: "Total registered users",
    type: "gauge",
    labels: ["role"],
  });
  
  registry.registerMetric({
    name: "users_active",
    help: "Active users (last 30 days)",
    type: "gauge",
    labels: ["role"],
  });
  
  registry.registerMetric({
    name: "users_online",
    help: "Currently online users",
    type: "gauge",
    labels: ["role"],
  });
  
  // System metrics
  registry.registerMetric({
    name: "system_memory_usage_bytes",
    help: "System memory usage in bytes",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "system_cpu_usage",
    help: "System CPU usage (percentage)",
    type: "gauge",
  });
  
  registry.registerMetric({
    name: "event_loop_lag_seconds",
    help: "Event loop lag in seconds",
    type: "gauge",
  });
  
  // Initialize application metrics
  const startTime = Math.floor(Date.now() / 1000);
  registry.getGauge("app_start_time").set(startTime);
  
  const config = getConfig();
  registry.getGauge("app_version").set(1, { version: config.app.APP_VERSION });
}

// ============================================================================
// 6. METRIC UTILITY FUNCTIONS
// ============================================================================

/**
 * Increment a counter metric
 * @param name Metric name
 * @param labels Metric labels
 */
export function incrementCounter(name: string, labels: Record<string, string> = {}): void {
  try {
    const registry = getMetricRegistry();
    const counter = registry.getCounter(name);
    counter.inc(labels);
  } catch (error) {
    getLogger().error("Failed to increment counter metric", error as Error);
  }
}

/**
 * Add value to a counter metric
 * @param name Metric name
 * @param value Value to add
 * @param labels Metric labels
 */
export function addToCounter(name: string, value: number, labels: Record<string, string> = {}): void {
  try {
    const registry = getMetricRegistry();
    const counter = registry.getCounter(name);
    counter.add(value, labels);
  } catch (error) {
    getLogger().error("Failed to add to counter metric", error as Error);
  }
}

/**
 * Set gauge metric value
 * @param name Metric name
 * @param value Value to set
 * @param labels Metric labels
 */
export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  try {
    const registry = getMetricRegistry();
    const gauge = registry.getGauge(name);
    gauge.set(value, labels);
  } catch (error) {
    getLogger().error("Failed to set gauge metric", error as Error);
  }
}

/**
 * Increment gauge metric
 * @param name Metric name
 * @param labels Metric labels
 */
export function incrementGauge(name: string, labels: Record<string, string> = {}): void {
  try {
    const registry = getMetricRegistry();
    const gauge = registry.getGauge(name);
    gauge.inc(labels);
  } catch (error) {
    getLogger().error("Failed to increment gauge metric", error as Error);
  }
}

/**
 * Decrement gauge metric
 * @param name Metric name
 * @param labels Metric labels
 */
export function decrementGauge(name: string, labels: Record<string, string> = {}): void {
  try {
    const registry = getMetricRegistry();
    const gauge = registry.getGauge(name);
    gauge.dec(labels);
  } catch (error) {
    getLogger().error("Failed to decrement gauge metric", error as Error);
  }
}

/**
 * Observe histogram value
 * @param name Metric name
 * @param value Value to observe
 * @param labels Metric labels
 */
export function observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  try {
    const registry = getMetricRegistry();
    const histogram = registry.getHistogram(name);
    histogram.observe(value, labels);
  } catch (error) {
    getLogger().error("Failed to observe histogram metric", error as Error);
  }
}

/**
 * Start timer for duration measurement
 * @param name Metric name
 * @param labels Metric labels
 * @returns Function to call when timing completes
 */
export function startTimer(name: string, labels: Record<string, string> = {}): () => number {
  try {
    const registry = getMetricRegistry();
    const timer = registry.getTimer(name);
    return timer.startTimer(labels);
  } catch (error) {
    getLogger().error("Failed to start timer metric", error as Error);
    return () => 0;
  }
}

// ============================================================================
// 7. BUSINESS METRIC UTILITIES
// ============================================================================

/**
 * Log reading started metric
 * @param readingId Reading ID
 * @param readingType Reading type
 * @param userId User ID
 */
export function logReadingStarted(readingId: number, readingType: string, userId: number): void {
  incrementCounter("readings_started_total", { type: readingType, status: "started" });
  incrementGauge("readings_active", { type: readingType });
}

/**
 * Log reading completed metric
 * @param readingId Reading ID
 * @param readingType Reading type
 * @param durationMinutes Duration in minutes
 * @param totalPrice Total price in cents
 */
export function logReadingCompleted(
  readingId: number,
  readingType: string,
  durationMinutes: number,
  totalPrice: number
): void {
  incrementCounter("readings_completed_total", { type: readingType });
  decrementGauge("readings_active", { type: readingType });
  observeHistogram("readings_duration_minutes", durationMinutes, { type: readingType });
  addToCounter("readings_revenue_cents", totalPrice, { type: readingType });
}

/**
 * Log payment processed metric
 * @param transactionId Transaction ID
 * @param transactionType Transaction type
 * @param userId User ID
 * @param amount Amount in cents
 * @param status Transaction status
 */
export function logPaymentProcessed(
  transactionId: number,
  transactionType: string,
  userId: number,
  amount: number,
  status: string
): void {
  incrementCounter("payments_total", { type: transactionType, status });
  addToCounter("payments_amount_cents", amount, { type: transactionType });
}

/**
 * Log message sent metric
 * @param messageId Message ID
 * @param senderId Sender ID
 * @param receiverId Receiver ID
 * @param isPaid Whether message is paid
 * @param price Price in cents (if paid)
 */
export function logMessageSent(
  messageId: number,
  senderId: number,
  receiverId: number,
  isPaid: boolean,
  price?: number
): void {
  incrementCounter("messages_sent_total", { type: isPaid ? "paid" : "free" });
  
  if (isPaid && price) {
    incrementCounter("messages_paid_total");
    addToCounter("messages_revenue_cents", price);
  }
}

/**
 * Log forum post created metric
 * @param postId Post ID
 * @param userId User ID
 * @param category Forum category
 */
export function logForumPostCreated(postId: number, userId: number, category: string): void {
  incrementCounter("forum_posts_total", { category });
}

/**
 * Log forum comment created metric
 * @param commentId Comment ID
 * @param postId Post ID
 * @param userId User ID
 */
export function logForumCommentCreated(commentId: number, postId: number, userId: number): void {
  incrementCounter("forum_comments_total");
}

/**
 * Log forum flag created metric
 * @param flagId Flag ID
 * @param contentType Content type (post/comment)
 * @param contentId Content ID
 * @param reporterId Reporter ID
 */
export function logForumFlagCreated(
  flagId: number,
  contentType: string,
  contentId: number,
  reporterId: number
): void {
  incrementCounter("forum_flags_total", { type: contentType, status: "pending" });
}

/**
 * Log user registration metric
 * @param userId User ID
 * @param role User role
 */
export function logUserRegistered(userId: number, role: string): void {
  incrementGauge("users_total", { role });
}

/**
 * Log user login metric
 * @param userId User ID
 * @param role User role
 */
export function logUserLogin(userId: number, role: string): void {
  incrementGauge("users_online", { role });
}

/**
 * Log user logout metric
 * @param userId User ID
 * @param role User role
 */
export function logUserLogout(userId: number, role: string): void {
  decrementGauge("users_online", { role });
}

// ============================================================================
// 8. HTTP METRICS MIDDLEWARE
// ============================================================================

/**
 * HTTP metrics middleware for Express
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = process.hrtime();
  const requestId = req.headers["x-request-id"] || randomUUID();
  
  // Track request size
  let requestSize = 0;
  if (req.headers["content-length"]) {
    requestSize = parseInt(req.headers["content-length"] as string) || 0;
  }
  
  // Wrap response to track response size
  const originalSend = res.send;
  res.send = function (this: Response, body?: any): Response {
    const responseSize = Buffer.byteLength(
      typeof body === "string" ? body : JSON.stringify(body)
    );
    
    logHttpRequestMetrics(req, res, startTime, requestSize, responseSize);
    
    return originalSend.call(this, body);
  } as any;
  
  // Handle cases where response ends without send
  res.on("finish", () => {
    const responseSize = parseInt(res.getHeader("content-length") as string) || 0;
    logHttpRequestMetrics(req, res, startTime, requestSize, responseSize);
  });
  
  next();
}

/**
 * Log HTTP request metrics
 * @param req Express request
 * @param res Express response
 * @param startTime Request start time
 * @param requestSize Request size in bytes
 * @param responseSize Response size in bytes
 */
function logHttpRequestMetrics(
  req: Request,
  res: Response,
  startTime: [number, number],
  requestSize: number,
  responseSize: number
): void {
  const diff = process.hrtime(startTime);
  const durationMs = diff[0] * 1000 + diff[1] / 1000000;
  const durationSeconds = durationMs / 1000;
  
  const method = req.method;
  const path = req.path;
  const statusCode = res.statusCode;
  
  // Increment request counter
  incrementCounter("http_requests_total", { method, path, status_code: statusCode.toString() });
  
  // Observe request duration
  observeHistogram("http_request_duration_seconds", durationSeconds, { method, path });
  
  // Observe request size
  if (requestSize > 0) {
    observeHistogram("http_request_size_bytes", requestSize, { method, path });
  }
  
  // Observe response size
  if (responseSize > 0) {
    observeHistogram("http_response_size_bytes", responseSize, { method, path });
  }
  
  // Increment error counter if applicable
  if (statusCode >= 400) {
    incrementCounter("http_errors_total", { method, path, status_code: statusCode.toString() });
  }
}

// ============================================================================
// 9. DATABASE METRICS
// ============================================================================

/**
 * Database query metrics wrapper
 * @param operation Database operation name
 * @param queryFunction Query function to wrap
 * @returns Wrapped function with metrics
 */
export function withDbMetrics<T>(
  operation: string,
  queryFunction: () => Promise<T>
): Promise<T> {
  const startTime = process.hrtime();
  
  return queryFunction()
    .then((result) => {
      const diff = process.hrtime(startTime);
      const durationMs = diff[0] * 1000 + diff[1] / 1000000;
      const durationSeconds = durationMs / 1000;
      
      incrementCounter("db_query_count", { operation });
      observeHistogram("db_query_duration_seconds", durationSeconds, { operation });
      
      return result;
    })
    .catch((error) => {
      const diff = process.hrtime(startTime);
      const durationMs = diff[0] * 1000 + diff[1] / 1000000;
      const durationSeconds = durationMs / 1000;
      
      incrementCounter("db_query_count", { operation });
      observeHistogram("db_query_duration_seconds", durationSeconds, { operation });
      
      throw error;
    });
}

/**
 * Set database connection pool metrics
 * @param poolSize Current pool size
 * @param waitingClients Waiting clients count
 */
export function setDbPoolMetrics(poolSize: number, waitingClients: number): void {
  setGauge("db_connection_pool_size", poolSize);
  setGauge("db_connection_pool_waiting", waitingClients);
}

// ============================================================================
// 10. SYSTEM METRICS COLLECTOR
// ============================================================================

/**
 * Collect system metrics
 */
export function collectSystemMetrics(): void {
  try {
    // Memory usage
    const memoryUsage = process.memoryUsage();
    setGauge("system_memory_usage_bytes", memoryUsage.heapUsed);
    
    // CPU usage (simplified - would need os module for accurate measurement)
    // For production, consider using a more robust CPU monitoring solution
    
    // Event loop lag (simplified)
    const start = process.hrtime();
    setImmediate(() => {
      const end = process.hrtime(start);
      const lagMs = end[0] * 1000 + end[1] / 1000000;
      const lagSeconds = lagMs / 1000;
      setGauge("event_loop_lag_seconds", lagSeconds);
    });
  } catch (error) {
    getLogger().error("Failed to collect system metrics", error as Error);
  }
}

/**
 * Start system metrics collection interval
 * @param intervalMs Collection interval in milliseconds
 */
export function startSystemMetricsCollection(intervalMs: number = 60000): NodeJS.Timeout {
  collectSystemMetrics();
  return setInterval(collectSystemMetrics, intervalMs);
}

// ============================================================================
// 11. DORA METRICS (DEVOPS METRICS)
// ============================================================================

/**
 * Set Dora metrics
 * @param deploymentFrequency Deployments per day
 * @param leadTime Hours from commit to deploy
 * @param meanTimeToRecover Minutes to recover from failure
 * @param changeFailureRate Percentage of failed changes
 */
export function setDoraMetrics(
  deploymentFrequency: number,
  leadTime: number,
  meanTimeToRecover: number,
  changeFailureRate: number
): void {
  setGauge("dora_deployment_frequency", deploymentFrequency);
  setGauge("dora_lead_time_for_changes", leadTime);
  setGauge("dora_mean_time_to_recover", meanTimeToRecover);
  setGauge("dora_change_failure_rate", changeFailureRate);
}

// ============================================================================
// 12. METRICS SERVER
// ============================================================================

/**
 * Start metrics server
 * @param port Port to listen on
 * @param path Metrics endpoint path
 * @returns Server instance
 */
export function startMetricsServer(port: number = 9090, path: string = "/metrics"): any {
  const config = getConfig();
  const metricsConfig = getMetricsConfig(config);
  
  if (!metricsConfig.enabled) {
    getLogger().info("Metrics server disabled by configuration");
    return null;
  }
  
  try {
    const express = require("express");
    const app = express();
    
    app.get(path, (req: Request, res: Response) => {
      try {
        const registry = getMetricRegistry();
        const metrics = registry.getMetrics();
        
        res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
        res.send(metrics);
      } catch (error) {
        getLogger().error("Failed to generate metrics", error as Error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    const server = app.listen(port, () => {
      getLogger().info(`Metrics server started on port ${port}, path: ${path}`);
    });
    
    return server;
  } catch (error) {
    getLogger().error("Failed to start metrics server", error as Error);
    return null;
  }
}

// ============================================================================
// 13. HEALTH CHECK METRICS
// ============================================================================

/**
 * Health check metrics
 * @returns Health check status and metrics
 */
export function getHealthCheckMetrics(): Record<string, any> {
  try {
    const registry = getMetricRegistry();
    
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: {
        http_requests_total: getCounterValue(registry, "http_requests_total"),
        http_errors_total: getCounterValue(registry, "http_errors_total"),
        db_query_count: getCounterValue(registry, "db_query_count"),
        readings_active: getGaugeValue(registry, "readings_active"),
        users_online: getGaugeValue(registry, "users_online"),
      },
    };
  } catch (error) {
    getLogger().error("Failed to get health check metrics", error as Error);
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get counter value from registry
 * @param registry Metric registry
 * @param name Counter name
 * @returns Counter value
 */
function getCounterValue(registry: MetricRegistry, name: string): number {
  try {
    const counter = registry.getCounter(name);
    // This is a simplified approach - in a real implementation, you'd need to access the internal state
    return 0; // Placeholder
  } catch (error) {
    return 0;
  }
}

/**
 * Get gauge value from registry
 * @param registry Metric registry
 * @param name Gauge name
 * @returns Gauge value
 */
function getGaugeValue(registry: MetricRegistry, name: string): number {
  try {
    const gauge = registry.getGauge(name);
    // This is a simplified approach - in a real implementation, you'd need to access the internal state
    return 0; // Placeholder
  } catch (error) {
    return 0;
  }
}

// ============================================================================
// 14. METRICS INITIALIZATION
// ============================================================================

/**
 * Initialize metrics system
 */
export function initializeMetrics(): void {
  const config = getConfig();
  const metricsConfig = getMetricsConfig(config);
  
  if (!metricsConfig.enabled) {
    getLogger().info("Metrics system disabled by configuration");
    return;
  }
  
  getLogger().info("Initializing metrics system");
  
  // Start system metrics collection
  startSystemMetricsCollection();
  
  // Start metrics server
  startMetricsServer(metricsConfig.port, metricsConfig.path);
  
  // Log initialization
  getLogger().info(`Metrics system initialized with prefix: ${metricsConfig.prefix}`);
}

// ============================================================================
// 15. DEFAULT EXPORT
// ============================================================================

/**
 * Default export for easy import
 */
export default {
  getMetricRegistry,
  resetMetricRegistry,
  initializeMetrics,
  incrementCounter,
  addToCounter,
  setGauge,
  incrementGauge,
  decrementGauge,
  observeHistogram,
  startTimer,
  logReadingStarted,
  logReadingCompleted,
  logPaymentProcessed,
  logMessageSent,
  logForumPostCreated,
  logForumCommentCreated,
  logForumFlagCreated,
  logUserRegistered,
  logUserLogin,
  logUserLogout,
  httpMetricsMiddleware,
  withDbMetrics,
  setDbPoolMetrics,
  collectSystemMetrics,
  startSystemMetricsCollection,
  setDoraMetrics,
  startMetricsServer,
  getHealthCheckMetrics,
};