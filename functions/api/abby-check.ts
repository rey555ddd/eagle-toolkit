/**
 * GET /api/abby-check
 * 蹦闆精品 Abby 專區登入狀態確認端點
 *
 * 檢查 eagle_abby_auth cookie 是否有效
 * 有效 → 200 JSON { ok: true }
 * 無效 → 401 JSON { ok: false }
 */

interface Env {
  EAGLE_ABBY_PASSWORD?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cookie = context.request.headers.get('Cookie') ?? '';
  const expectedPwd = context.env?.EAGLE_ABBY_PASSWORD || 'Abby888';

  const match = cookie
    .split(';')
    .some((c) => c.trim() === `eagle_abby_auth=${expectedPwd}`);

  return new Response(
    JSON.stringify({ ok: match }),
    {
      status: match ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
