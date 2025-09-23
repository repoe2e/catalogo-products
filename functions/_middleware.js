// functions/_middleware.js
// CORS global para todas as rotas do Pages Functions (inclui /api/*)
//
// Se quiser limitar para Github Pages apenas, troque ALLOW_ORIGIN = '*' por uma checagem do Origin.

const ALLOW_ORIGIN = '*';

function corsHeaders(req) {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export const onRequest = async ({ request, next }) => {
  // Responde o preflight de imediato
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  // Executa a rota normalmente e adiciona os headers CORS
  const res = await next();
  const headers = new Headers(res.headers);
  const extra = corsHeaders(request);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};
