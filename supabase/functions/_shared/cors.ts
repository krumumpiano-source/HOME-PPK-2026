// Allowed browser origins for HOME PPK edge functions
const ALLOWED_ORIGINS = [
  'https://home-ppk-2026.pages.dev',
  'https://krumumpiano-source.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
];

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Cloudflare Pages preview deployments: https://<hash>.home-ppk-2026.pages.dev
  return /^https:\/\/[a-z0-9-]+\.home-ppk-2026\.pages\.dev$/.test(origin);
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token, x-server-secret',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}
