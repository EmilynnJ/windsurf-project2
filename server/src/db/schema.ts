// Re-export all schema from the shared package.
// Uses the @soulseer/shared package name (resolved via npm workspaces)
// instead of a relative path so compiled JS output is bundler-friendly.
export * from '@soulseer/shared/schema';
