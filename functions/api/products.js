export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10)));
  const q = url.searchParams.get('q');
  const category = url.searchParams.get('category');

  const where = [];
  const binds = [];
  if (q) { where.push('(title LIKE ? OR description LIKE ?)'); binds.push(`%${q}%`, `%${q}%`); }
  if (category) { where.push('category = ?'); binds.push(category); }
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM products ${W}`).bind(...binds).first();
  const offset = (page - 1) * pageSize;

  const rows = await env.DB.prepare(`
    SELECT id,title,slug,category,brand,description,
           price_original,price_discount_percent,price_final,
           stock_quantity,sku,warehouse,
           rating_average,rating_count,created_at,updated_at
      FROM products
      ${W}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
  `).bind(...binds, pageSize, offset).all();

  const products = (rows.results || []).map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    category: r.category,
    brand: r.brand,
    description: r.description,
    price: { currency: 'BRL', original: r.price_original, discount_percent: r.price_discount_percent, final: r.price_final },
    stock: { quantity: r.stock_quantity, sku: r.sku, warehouse: r.warehouse },
    rating: { average: r.rating_average, count: r.rating_count },
    created_at: r.created_at,
    updated_at: r.updated_at
  }));

  return new Response(JSON.stringify({ meta: { total: totalRow.total, page, pageSize }, products }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
}