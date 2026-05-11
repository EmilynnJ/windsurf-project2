import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Hoist non-VITE_-prefixed Auth0 vars (AUTH0_DOMAIN_URL, AUTH0_ISSUER_BASE_URL,
// AUTH0_IDENTIFIER, AUTH0_ALLOWED_URL) into the VITE_AUTH0_* names the client
// reads, so a single Vercel env var works for both server and client.
function deriveClientAuth0Env(env: Record<string, string>) {
  const domainSource =
    env.VITE_AUTH0_DOMAIN ||
    env.AUTH0_DOMAIN ||
    env.AUTH0_DOMAIN_URL ||
    env.AUTH0_ISSUER_BASE_URL ||
    '';
  const domain = domainSource.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const audience =
    env.VITE_AUTH0_AUDIENCE ||
    env.AUTH0_AUDIENCE ||
    env.AUTH0_IDENTIFIER ||
    (domain ? `https://${domain}/api/v2/` : '');

  const redirectUri = (
    env.VITE_AUTH0_REDIRECT_URI ||
    env.AUTH0_ALLOWED_URL ||
    env.AUTH0_BASE_URL ||
    ''
  ).replace(/\/$/, '');

  return { domain, audience, redirectUri };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const auth0 = deriveClientAuth0Env(env);

  const apiBase = env.VITE_API_URL || env.AUTH0_ALLOWED_URL || env.AUTH0_BASE_URL || '';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:5000',
          ws: true,
        },
      },
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router')
            )
              return 'vendor';
            if (id.includes('node_modules/@auth0')) return 'auth';
          },
        },
      },
    },
    envPrefix: 'VITE_',
    define: {
      'import.meta.env.VITE_AUTH0_DOMAIN': JSON.stringify(auth0.domain),
      'import.meta.env.VITE_AUTH0_AUDIENCE': JSON.stringify(auth0.audience),
      'import.meta.env.VITE_AUTH0_REDIRECT_URI': JSON.stringify(auth0.redirectUri),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiBase.replace(/\/$/, '')),
    },
  };
});
