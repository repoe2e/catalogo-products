// TEMPORÁRIO: use 1x para popular 500 produtos, depois remova este arquivo e redeploy.
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token !== 'E2E_SEED_123') return new Response('forbidden', { status: 403 });

  const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM products').first();
  if (count.c > 0) return new Response('already seeded', { status: 200 });

  function rnd(min, max){ return Math.random()*(max-min)+min; }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function pad(n){ return String(n).padStart(4, '0'); }

  const cats = ["Eletrônicos/Smartphones","Eletrônicos/Fones de Ouvido","Casa/Cozinha","Beleza/Cuidados Pessoais","Informática/Periféricos","Games/Consoles","Esportes/Fitness","Vestuário/Camisetas","Acessórios/Relógios","Ferramentas/Oficina"];
  const now = new Date().toISOString();

  await env.DB.exec('BEGIN IMMEDIATE TRANSACTION;');
  for (let i=1;i<=500;i++){
    const id = `PROD-${pad(i)}`;
    const title = `Produto ${i} ${['Pro','Max','Plus','Lite','Go'][i%5]}`;
    const slug = title.toLowerCase().replace(/\s+/g,'-');
    const category = pick(cats);
    const brand = `Marca ${String.fromCharCode(65+(i%26))}`;
    const description = `Descrição do ${title}.`;
    const original = Number(rnd(20,5000).toFixed(2));
    const discount = Math.floor(rnd(0,40));
    const final = Number((original*(1-discount/100)).toFixed(2));
    const qty = Math.floor(rnd(0,1000));
    const sku = `SKU-${Math.floor(rnd(100000,999999))}`;
    const warehouse = pick(["SP-01","SP-02","RJ-01","MG-01"]);
    const ratingAvg = Number(rnd(1,5).toFixed(1));
    const ratingCount = Math.floor(rnd(0,2000));

    await env.DB.prepare(`
      INSERT INTO products
      (id,title,slug,category,brand,description,price_original,price_discount_percent,price_final,stock_quantity,sku,warehouse,rating_average,rating_count,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(id,title,slug,category,brand,description,original,discount,final,qty,sku,warehouse,ratingAvg,ratingCount,now,now).run();
  }
  await env.DB.exec('COMMIT;');
  return new Response('seed ok', { status: 201 });
}