import pino from 'pino';
import { config } from '../config';

// pino-pretty is a dev-only enhancement. It is not installed as a dependency,
// so only request it when we can resolve it (dev shells where the user has
// opted in); in tests and production we stick to vanilla pino.
function resolvePrettyTransport():
  | { target: string; options: Record<string, unknown> }
  | undefined {
  if (config.isProduction || config.nodeEnv === 'test') return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true } };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level: config.isProduction ? 'info' : 'debug',
  transport: resolvePrettyTransport(),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});
