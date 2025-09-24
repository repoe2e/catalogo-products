// functions/api/orders.js
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const buyer_name = body.buyer_name ?? null;
    const buyer_email = body.buyer_email ?? null;

    if (items.length === 0) {
      return json({ error: "Informe items: [{productId, qty}]" }, 400);
    }

    // 1) Carrega os produtos que serão comprados
    const ids = items.map((i) => i.productId);
    const placeholders = ids.map(() => "?").join(",");
    const prodRows = await env.DB
      .prepare(`SELECT id, title, price_final, stock_quantity FROM products WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all();

    const found = new Map(prodRows.results.map((r) => [r.id, r]));
    // valida existência e estoque
    for (const it of items) {
      const p = found.get(it.productId);
      if (!p) return json({ error: `Produto não encontrado: ${it.productId}` }, 404);
      const q = Number(it.qty || 0);
      if (!Number.isFinite(q) || q <= 0) return json({ error: `Quantidade inválida para ${it.productId}` }, 400);
      if (q > p.stock_quantity) {
        return json({
          error: `Estoque insuficiente para ${it.productId}`,
          available: p.stock_quantity
        }, 409);
      }
    }

    // 2) Calcula totais
    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    let total = 0;
    const enriched = items.map((it) => {
      const p = found.get(it.productId);
      const qty = Number(it.qty);
      const unit = Number(p.price_final);
      const line = +(unit * qty).toFixed(2);
      total += line;
      return { ...it, qty, unit, line };
    });
    total = +total.toFixed(2);

    // 3) Monta todas as operações dentro de um único batch (transação do D1)
    const stmts = [];

    // insert da ordem
    stmts.push(
      env.DB.prepare(
        `INSERT INTO orders (id, created_at, buyer_name, buyer_email, total)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(orderId, now, buyer_name, buyer_email, total)
    );

    // itens + baixa de estoque (update protegido por condição)
    for (const it of enriched) {
      const itemId = crypto.randomUUID();
      stmts.push(
        env.DB.prepare(
          `INSERT INTO order_items (id, order_id, product_id, qty, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(itemId, orderId, it.productId, it.qty, it.unit, it.line)
      );

      // garante que só atualiza se houver estoque suficiente no momento
      stmts.push(
        env.DB.prepare(
          `UPDATE products
             SET stock_quantity = stock_quantity - ?, updated_at = ?
           WHERE id = ? AND stock_quantity >= ?`
        ).bind(it.qty, now, it.productId, it.qty)
      );
    }

    // executa tudo de uma vez (TRANSAÇÃO automática)
    const results = await env.DB.batch(stmts);

    // checa se todos os updates de estoque afetaram 1 linha
    // (cada item tem um UPDATE; eles estão nas posições 1 + (i*2) + 1)
    for (let i = 0; i < enriched.length; i++) {
      const res = results[1 + (i * 2) + 1]; // 0=order, para cada item: +1 insert, +1 update
      const ok = res?.meta?.changes === 1;
      if (!ok) {
        // Falha de concorrência: alguém comprou no meio
        return json({ error: "Falha ao reservar estoque. Tente novamente." }, 409);
      }
    }

    return json({
      order_id: orderId,
      created_at: now,
      total,
      items: enriched.map((i) => ({
        product_id: i.productId,
        qty: i.qty,
        unit_price: i.unit,
        line_total: i.line
      }))
    });
  } catch (e) {
    return json({ error: e.message || String(e) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}
