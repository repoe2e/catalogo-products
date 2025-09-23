export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  // quando acessar a raiz, manda para o HTML que está em /public
  if (url.pathname === '/' || url.pathname === '') {
    return Response.redirect(new URL('/public/index.html', url), 302);
  }
  return new Response('Not found', { status: 404 });
}
