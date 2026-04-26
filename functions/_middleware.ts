/**
 * Cloudflare Pages Functions Middleware
 * 1. 🔒 敏感路徑強制 404（資安 audit P2 #7、補 _redirects 失效的洞）
 * 2. CORS（僅允許 REYWAY 品牌域名 + 本地開發）
 *
 * 2026-04-26 全集團 audit：併入敏感路徑攔截。
 * CF Pages 對「destination 不存在的路徑」會 ignore _redirects、
 * SPA fallback 還是把 /.env /.git/HEAD /wrangler.toml 等回 200 + index.html。
 * 改用 middleware 直接攔截、回真正的 404。
 */

const allowedOrigins = [
  'https://eagle.reyway.com',
  'https://cleanclean.reyway.com',
  'https://suan7.reyway.com',
  'https://club.reyway.com',
  'http://localhost:5173',
];

const SENSITIVE_PATHS = [
  /^\/\.env(\.|$)/,            // .env / .env.production / .env.local 等
  /^\/\.git(\/|$)/,            // .git/HEAD / .git/config 等
  /^\/\.dev\.vars$/,
  /^\/\.npmrc$/,
  /^\/\.prettierrc$/,
  /^\/wrangler\.toml$/,
  /^\/package(-lock)?\.json$/,
  /^\/pnpm-lock\.yaml$/,
  /^\/yarn\.lock$/,
  /^\/tsconfig(\..*)?\.json$/,
  /^\/vite\.config\.(ts|js)$/,
  /^\/Dockerfile$/i,
  /^\/docker-compose\..*$/i,
];

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // ── 🔒 攔截敏感路徑：直接回 404，不走 SPA fallback ──
  if (SENSITIVE_PATHS.some((re) => re.test(url.pathname))) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex' },
    });
  }

  const origin = context.request.headers.get('Origin') || '';
  const isAllowed = allowedOrigins.includes(origin);

  // Handle CORS preflight requests
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': isAllowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Process the request and add CORS headers to response
  const response = await context.next();
  const newResponse = new Response(response.body, response);

  if (isAllowed) {
    newResponse.headers.set('Access-Control-Allow-Origin', origin);
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return newResponse;
};
