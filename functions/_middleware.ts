/**
 * Cloudflare Pages Functions Middleware
 * 1. 🔒 敏感路徑強制 404（資安 audit P2 #7、補 _redirects 失效的洞）
 * 2. CORS（僅允許 REYWAY 品牌域名 + 本地開發）
 * 3. 🔑 蹦闆精品 Abby 專區密碼守門（purchase.* / eagleRadar.* tRPC path）
 *    cookie: eagle_abby_auth=Abby888（預設）
 *    未登入 → 401 JSON，不 redirect
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

// ── Abby 專區：受密碼守門的 tRPC procedure 前綴 ──
// tRPC path 格式：/api/trpc/purchase.xxx 或 /api/trpc/eagleRadar.xxx
// （batch request 也可能是 /api/trpc/purchase.xxx,eagleRadar.xxx）
const ABBY_PROTECTED_PREFIXES = ['purchase.', 'eagleRadar.'];

function isAbbyProtectedPath(pathname: string): boolean {
  // 取出 tRPC path 部分（/api/trpc/{trpcPath}）
  const trpcMatch = pathname.match(/^\/api\/trpc\/(.+)$/);
  if (!trpcMatch) return false;
  const trpcPath = trpcMatch[1] as string;
  // 可能是 batch："purchase.batchRecognize,eagleRadar.scanNow"
  const parts = trpcPath.split(',');
  return parts.some((p) =>
    ABBY_PROTECTED_PREFIXES.some((prefix) => p.trim().startsWith(prefix)),
  );
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    result[key] = val;
  });
  return result;
}

export const onRequest: PagesFunction<{ EAGLE_ABBY_PASSWORD?: string }> = async (context) => {
  const url = new URL(context.request.url);

  // ── 🔒 攔截敏感路徑：直接回 404，不走 SPA fallback ──
  if (SENSITIVE_PATHS.some((re) => re.test(url.pathname))) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex' },
    });
  }

  // ── 🔑 Abby 專區密碼守門 ──
  if (isAbbyProtectedPath(url.pathname)) {
    const correctPassword = (context.env as { EAGLE_ABBY_PASSWORD?: string })?.EAGLE_ABBY_PASSWORD || 'Abby888';
    const cookieHeader = context.request.headers.get('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    if (cookies['eagle_abby_auth'] !== correctPassword) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: '請先登入蹦闆精品後台' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Protected-By': 'eagle-abby-auth',
          },
        },
      );
    }
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
