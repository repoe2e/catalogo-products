// Reseed do catálogo com nomes reais (rodar 1x e apagar o arquivo).
// GET /admin/reseed?token=E2E_ADMIN_123&n=500&drop=1
const TOKEN = "E2E_ADMIN_123";

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== TOKEN) return json({ error: "forbidden" }, 403);

    const N = clampInt(url.searchParams.get("n"), 1, 2000, 500);
    const drop = url.searchParams.get("drop") === "1";

    // Tabelas (idempotente)
    await env.DB.prepare(`
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
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        buyer_name TEXT,
        buyer_email TEXT,
        total REAL NOT NULL
      );
    `).run();

    await env.DB.prepare(`
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
    `).run();

    if (drop) {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM order_items`),
        env.DB.prepare(`DELETE FROM orders`),
        env.DB.prepare(`DELETE FROM products`),
      ]);
    } else {
      await env.DB.prepare(`DELETE FROM products`).run();
    }

    // ---------- Geradores de produtos (nomes reais) ----------
    const brands = {
      eletronicos: ["Samsung","Xiaomi","Motorola","Apple","LG","Sony","Philips","JBL","Dell","Lenovo","Acer","Asus"],
      casa: ["Electrolux","Brastemp","Mondial","Philco","Arno","Oster","Britânia","Consul"],
      moda: ["Nike","Adidas","Puma","Hering","Reserva","Calvin Klein","Oakley"],
      esportes: ["Nike","Adidas","Puma","Penalty","Wilson","Spalding","Speedo","Kappa"]
    };

    const gen = {
      eletronicos() {
        const kind = pick(["Smartphone","Smart TV","Notebook","Fone Bluetooth","Monitor"]);
        const b = pick(brands.eletronicos);
        if (kind === "Smartphone") {
          const storage = pick([64,128,256,512]);
          const ram = pick([4,6,8,12]);
          const tela = pick([6.1,6.4,6.6,6.7,6.8]);
          return {
            title: `${kind} ${b} ${storage}GB ${ram}GB ${tela.toString().replace(".",",")}"`,
            brand: b,
            base: pick([899,1099,1299,1499,1799,1999,2299,2599,2999]),
            desc: `Smartphone ${b} com ${ram}GB RAM, ${storage}GB e tela ${tela}".`
          };
        }
        if (kind === "Smart TV") {
          const size = pick([32,43,50,55,65,75]);
          return {
            title: `${kind} ${b} ${size}" 4K UHD`,
            brand: b,
            base: pick([1499,1899,2299,2799,3299,3999,4999]),
            desc: `Smart TV ${b} ${size}" com 4K, HDR e apps de streaming.`
          };
        }
        if (kind === "Notebook") {
          const cpu = pick(["i5","i7","Ryzen 5","Ryzen 7"]);
          const ram = pick([8,16]);
          const ssd = pick([256,512,1000]);
          return {
            title: `${kind} ${b} ${cpu} ${ram}GB ${ssd}GB SSD 15.6"`,
            brand: b,
            base: pick([2299,2799,3299,3899,4499,5299]),
            desc: `Notebook ${b} ${cpu}, ${ram}GB RAM e ${ssd}GB SSD.`
          };
        }
        if (kind === "Fone Bluetooth") {
          return {
            title: `${kind} ${b} com Cancelamento de Ruído`,
            brand: b,
            base: pick([149,199,249,299,399,599]),
            desc: `Fone TWS ${b} com ANC.`
          };
        }
        // Monitor
        const size = pick([24,27,29,32,34]), hz = pick([60,75,120,144]);
        return {
          title: `Monitor ${b} ${size}" ${hz}Hz`,
          brand: b,
          base: pick([499,799,999,1299,1599,1999]),
          desc: `Monitor ${b} ${size}" ${hz}Hz.`
        };
      },
      casa() {
        const kind = pick(["Air Fryer","Liquidificador","Aspirador Robô","Cafeteira"]);
        const b = pick(brands.casa);
        if (kind === "Air Fryer") {
          const L = pick([3,4,5,7,8]);
          return {
            title: `${kind} ${b} ${L}L Antiaderente`,
            brand: b,
            base: pick([279,349,399,499,599,699]),
            desc: `Fritadeira ${b} ${L}L com cesto antiaderente.`
          };
        }
        if (kind === "Liquidificador") {
          const W = pick([500,800,1000,1200,1400]);
          return {
            title: `${kind} ${b} ${W}W Inox`,
            brand: b,
            base: pick([129,159,199,249,299,349]),
            desc: `Liquidificador ${b} ${W}W.`
          };
        }
        if (kind === "Aspirador Robô") {
          return {
            title: `${kind} ${b} Wi-Fi`,
            brand: b,
            base: pick([899,999,1199,1499,1799]),
            desc: `Aspirador robô ${b} com mapeamento.`
          };
        }
        return {
          title: `Cafeteira Elétrica ${b} 18 xícaras`,
          brand: b,
          base: pick([119,159,199,249]),
          desc: `Cafeteira ${b} com jarra de vidro.`
        };
      },
      moda() {
        const kind = pick(["Tênis","Camiseta","Jaqueta","Calça Jeans"]);
        const b = pick(brands.moda);
        if (kind === "Tênis") {
          const line = pick(["Run","Street","Classic","Zoom"]);
          const gender = pick(["Masculino","Feminino"]);
          return {
            title: `${kind} ${b} ${line} ${gender}`,
            brand: b,
            base: pick([199,249,299,349,449,599,799]),
            desc: `Tênis ${b} linha ${line}.`
          };
        }
        if (kind === "Camiseta")
          return { title: `Camiseta ${b} Algodão Premium`, brand: b, base: pick([59,69,79,89,99,119]), desc: `Camiseta ${b} 100% algodão.` };
        if (kind === "Jaqueta")
          return { title: `Jaqueta ${b} Corta-vento`, brand: b, base: pick([179,219,259,299,349,399]), desc: `Jaqueta ${b} leve.` };
        return { title: `Calça Jeans ${b} Slim`, brand: b, base: pick([129,159,199,229,259,299]), desc: `Calça jeans ${b} slim.` };
      },
      esportes() {
        const kind = pick(["Bicicleta","Bola de Futebol","Par de Halteres","Skate"]);
        const b = pick(brands.esportes);
        if (kind === "Bicicleta")
          return { title: `${kind} ${b} Aro 29 21v`, brand: b, base: pick([999,1299,1599,1899,2199,2599]), desc: `Bike aro 29 com 21v.` };
        if (kind === "Bola de Futebol")
          return { title: `${kind} ${b} Campo`, brand: b, base: pick([79,99,129,149,199]), desc: `Bola ${b} para campo.` };
        if (kind === "Par de Halteres") {
          const kg = pick([2,3,4,5,6,8,10,12]);
          return { title: `${kind} ${kg}kg Revestidos`, brand: "Genérico", base: pick([69,89,109,129,159,189,219]), desc: `Par de halteres ${kg}kg.` };
        }
        return { title: `Skate ${b} Maple 8.0"`, brand: b, base: pick([229,279,329,399,499]), desc: `Skate ${b} maple 8.0".` };
      }
    };

    const categories = Object.keys(gen);
    const warehouses = ["SP","RJ","MG","BA","PR","SC","RS"];
    const insert = env.DB.prepare(`
      INSERT OR IGNORE INTO products
      (id, title, slug, category, brand, description,
       price_original, price_discount_percent, price_final,
       sku, stock_quantity, warehouse, rating_average,
       rating_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const BATCH = 50;
    let batch = [];

    for (let i = 1; i <= N; i++) {
      const category = pick(categories);
      const item = gen[category]();

      const discount = pick([0,0,5,10,15,20]);
      const priceOriginal = withVariance(item.base, 0.12);
      const priceFinal = +(priceOriginal * (1 - discount/100)).toFixed(2);

      const id = `PROD-${String(i).padStart(4,"0")}`;
      const slug = slugify(`${item.title}-${item.brand}-${i}`);
      const sku = `SKU-${id}`;
      const stock = pick([12,15,18,20,22,25,28,30,35,40]);
      const ratingAvg = +(pick([3.2,3.4,3.6,3.7,3.8,3.9,4.0,4.1,4.2,4.4])).toFixed(1);
      const ratingCount = pick([8,10,12,15,18,20,23,28,35,40,55,80,120]);
      const wh = pick(warehouses);

      batch.push(
        insert.bind(
          id, item.title, slug, category, item.brand, item.desc,
          priceOriginal, discount, priceFinal, sku, stock, wh,
          ratingAvg, ratingCount, now, now
        )
      );

      if (batch.length === BATCH) { await env.DB.batch(batch); batch = []; }
    }
    if (batch.length) await env.DB.batch(batch);

    const after = await env.DB.prepare(`SELECT COUNT(*) AS c FROM products`).first();
    return json({ status: "ok", products: after?.c ?? 0 });
  } catch (e) {
    return json({ error: e.message || String(e) }, 500);
  }
}

// utils
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function withVariance(base, pct=0.1) {
  const d = base * pct; const v = base + (Math.random()*2*d - d); return Math.max(10, +v.toFixed(2));
}
function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)+/g,"");
}
function clampInt(v, min, max, def) {
  const n = Number(v); if (!Number.isFinite(n)) return def; return Math.min(max, Math.max(min, Math.floor(n)));
}
