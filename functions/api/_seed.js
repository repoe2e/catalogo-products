// functions/api/_seed.js
const TOKEN = "E2E_SEED_123";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (token !== TOKEN) {
      return new Response("forbidden", { status: 403 });
    }

    // 1) Schema (idempotente)
    const schema = `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT,
        category TEXT,
        brand TEXT,
        description TEXT,
        price_original REAL NOT NULL,
        price_discount_percent INTEGER NOT NULL DEFAULT 0,
        price_final REAL NOT NULL,
        sku TEXT,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        warehouse TEXT,
        rating_average REAL,
        rating_count INTEGER,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        buyer_name TEXT,
        buyer_email TEXT,
        total REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
    `;
    await env.DB.exec(schema);

    // Já tem dados?
    const row = await env.DB
      .prepare("SELECT COUNT(*) AS c FROM products")
      .first();
    if (row && row.c > 0) {
      return json({ status: "already seeded", count: row.c });
    }

    // 2) Gerar 500 produtos
    const now = new Date().toISOString();
    const categories = ["eletronicos", "casa", "moda", "esportes"];
    const warehouses = ["SP", "RJ", "MG", "BA"];

    // Inserção em lotes para evitar "too many SQL variables"
    const BATCH = 50;
    let batch = [];

    const stmt = env.DB.prepare(`
      INSERT OR IGNORE INTO products
      (id, title, slug, category, brand, description,
       price_original, price_discount_percent, price_final,
       sku, stock_quantity, warehouse, rating_average,
       rating_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 500; i++) {
      const id = `PROD-${String(i).padStart(4, "0")}`;
      const title = `Produto ${i}`;
      const slug = `produto-${i}`;
      const category = categories[i % categories.length];
      const brand = `Marca ${((i % 10) + 1)}`;
      const description = `Descrição do produto ${i}`;
      const price_original = 10 + (i % 90) + (i / 100);
      const price_discount_percent = (i % 5 === 0) ? 10 : 0;
      const price_final = +(price_original * (1 - price_discount_percent / 100)).toFixed(2);
      const sku = `SKU-${id}`;
      const stock_quantity = 20 + (i % 30);
      const warehouse = warehouses[i % warehouses.length];
      const rating_average = Math.min(5, 3 + (i % 20) / 10);
      const rating_count = 10 + (i % 200);

      batch.push(
        stmt.bind(
          id, title, slug, category, brand, description,
          price_original, price_discount_percent, price_final,
          sku, stock_quantity, warehouse, rating_average,
          rating_count, now, now
        )
      );

      if (batch.length === BATCH) {
        await env.DB.batch(batch);
        batch = [];
      }
    }
    if (batch.length) {
      await env.DB.batch(batch);
    }

    const row2 = await env.DB
      .prepare("SELECT COUNT(*) AS c FROM products")
      .first();

    return json({ status: "seed ok", inserted: row2?.c ?? 0 });
  } catch (e) {
    return json({ error: e.message || String(e) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
