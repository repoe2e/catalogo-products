export async function onRequestPost({ env, request }) {
  try {
    const body = await request.json();
    const items = body?.items;
    const buyer = body?.buyer || {};
    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'items required' }, 400);
    }

    await env.DB.exec('BEGIN IMMEDIATE TRANSACTION;');

    let total = 0;
    for (const it of items) {
      const { productId, qty } = it || {};
      if (!productId || !Number.isInteger(qty) || qty <= 0) {
        await env.DB.exec('ROLLBACK;'); return json({ error: 'invalid item' }, 400);
      }

      const prod = await env.DB.prepare('SELECT price_final FROM products WHERE id = ?').bind(productId).first();
      if (!prod) { await env.DB.exec('ROLLBACK;'); return json({ error: `product ${productId} not found` }, 404); }

      const upd = await env.DB.prepare(`
        UPDATE products
           SET stock_quantity = stock_quantity - ?, updated_at = ?
         WHERE id = ? AND stock_quantity >= ?
      `).bind(qty, new Date().toISOString(), productId, qty).run();

      if (upd.meta.changes !== 1) {
        await env.DB.exec('ROLLBACK;'); return json({ error: `insufficient stock for ${productId}` }, 409);
      }

      total += prod.price_final * qty;
    }

    const orderId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO orders (id, created_at, buyer_name, buyer_email, total)
      VALUES (?, ?, ?, ?, ?)
    `).bind(orderId, new Date().toISOString(), buyer.name || null, buyer.email || null, total).run();

    for (const it of items) {
      const p = await env.DB.prepare('SELECT price_final FROM products WHERE id = ?').bind(it.productId).first();
      const unit = p.price_final;
      await env.DB.prepare(`
        INSERT INTO order_items (id, order_id, product_id, qty, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), orderId, it.productId, it.qty, unit, unit * it.qty).run();
    }

    await env.DB.exec('COMMIT;');
    return json({ id: orderId, total }, 201);

  } catch (e) {
    try { await env.DB.exec('ROLLBACK;'); } catch {}
    return json({ error: e.message || 'internal error' }, 500);
  }
}
function json(data, status=200){
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}