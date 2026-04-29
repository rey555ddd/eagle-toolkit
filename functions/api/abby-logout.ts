/**
 * POST /api/abby-logout
 * 蹦闆精品 Abby 專區登出端點
 *
 * 清除 eagle_abby_auth cookie（Max-Age=0）
 */

export const onRequestPost: PagesFunction = async (context) => {
  const isProduction = !context.request.url.includes('localhost');
  const cookieFlags = [
    'eagle_abby_auth=',
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    ...(isProduction ? ['Secure'] : []),
  ].join('; ');

  return new Response(
    JSON.stringify({ ok: true, message: '已登出' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieFlags,
      },
    },
  );
};
