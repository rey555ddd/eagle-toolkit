/**
 * POST /api/abby-login
 * 蹦闆精品 Abby 專區登入端點
 *
 * body: { password: string }
 * 正確 → set cookie eagle_abby_auth，回 200 JSON
 * 錯誤 → 回 401 JSON
 *
 * cookie: httpOnly + SameSite=Strict + Secure（production）
 * 有效期：7 天
 */

interface Env {
  EAGLE_ABBY_PASSWORD?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: { password?: string };
  try {
    body = (await context.request.json()) as { password?: string };
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: '請求格式錯誤' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { password } = body;
  const correctPassword = context.env?.EAGLE_ABBY_PASSWORD || 'Abby888';

  if (!password || password !== correctPassword) {
    return new Response(
      JSON.stringify({ ok: false, error: '密碼錯誤' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 7 天過期
  const maxAge = 7 * 24 * 60 * 60;
  const isProduction = !context.request.url.includes('localhost');
  const cookieFlags = [
    `eagle_abby_auth=${correctPassword}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    ...(isProduction ? ['Secure'] : []),
  ].join('; ');

  return new Response(
    JSON.stringify({ ok: true, message: '登入成功' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieFlags,
      },
    },
  );
};
