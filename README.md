# Catálogo (Cloudflare Pages + D1)

API e site estático para catálogo de produtos com compra (baixa de estoque) hospedado no Cloudflare Pages com Pages Functions e banco D1.
A API já envia os cabeçalhos CORS; portanto o front-end pode ser hospedado no mesmo domínio ou em outro (ex.: GitHub Pages) usando apenas HTML + CSS + JS.

**Produção:** https://catalogo-products.pages.dev  
**Swagger:** https://catalogo-products.pages.dev/docs/

---

## Sumário
- [Visão geral](#visão-geral)
- [Como consumir (sem CORS)](#como-consumir-sem-cors)
- [Endpoints](#endpoints)
  - [GET /api/products](#get-apiproducts)
  - [POST /api/orders](#post-apiorders)
- [Exemplos de uso](#exemplos-de-uso)
  - [fetch (JS no navegador)](#fetch-js-no-navegador)
  - [curl](#curl)
- [Modelos de dados](#modelos-de-dados)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Cloudflare Pages & D1 (instrutor)](#cloudflare-pages--d1-instrutor)
- [Publicar mudanças](#publicar-mudanças)
- [Troubleshooting](#troubleshooting)
- [Licença](#licença)

---

## Visão geral

- **Frontend + API** no mesmo projeto Pages → chamadas **same-origin** (sem CORS).
- **Banco:** Cloudflare **D1** (SQLite gerenciado).
- **Catálogo:** 500 produtos pré-populados (estoque diminui após compra).
- **Swagger:** documentação pronta em `/docs`.

> Para **não ter CORS**, publique seu frontend dentro deste mesmo projeto (mesmo domínio da API).

---

## Como consumir (sem CORS)

No seu HTML/JS hospedado **no mesmo domínio**:

```js
// listar produtos
## Como consumir a API

### A) Mesmo domínio (sem CORS)
Se o seu HTML/JS está no **mesmo projeto Pages** da API:

```js
// listar produtos
const r = await fetch('/api/products?page=1&pageSize=10');
const data = await r.json();

// criar um pedido
await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    buyer: { name: 'Cliente', email: 'c@demo.com' },
    items: [{ productId: 'PROD-0001', qty: 1 }]
  })
});

```

## Endpoints
GET /api/products

Lista produtos paginado.

Query params

page (int, padrão 1)

pageSize (int, padrão 10)

## Exemplo
GET /api/products?page=1&pageSize=10

## Resposta (exemplo resumido)

{
  "meta": { "total": 500, "page": 1, "pageSize": 10 },
  "products": [
    {
      "id": "PROD-0001",
      "title": "Produto 1",
      "slug": "produto-1",
      "category": "casa",
      "brand": "Marca 2",
      "description": "Descrição do produto 1",
      "price": { "currency": "BRL", "original": 11.01, "discount_percent": 0, "final": 11.01 },
      "stock": { "quantity": 21, "sku": "SKU-PROD-0001", "warehouse": "RJ" },
      "rating": { "average": 3.2, "count": 12 },
      "created_at": "2025-09-23T...",
      "updated_at": "2025-09-23T..."
    }
  ]
}


## Exemplos de uso
- fetch (JS no navegador)

```
<script>
async function carregarProdutos(page = 1, pageSize = 10) {
  const r = await fetch(`/api/products?page=${page}&pageSize=${pageSize}`);
  const data = await r.json();
  console.log('Total:', data.meta.total);
  console.log('Primeiro produto:', data.products[0]);
}

async function comprar(prodId, qty = 1) {
  const r = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyer: { name: 'Cliente', email: 'c@demo.com' },
      items: [{ productId: prodId, qty }]
    })
  });

  const data = await r.json();
  if (!r.ok) {
    alert('Erro: ' + (data.error || 'falha na compra'));
    return;
  }
  alert('Pedido criado: ' + data.order.id + ' total R$ ' + data.order.total);
}
</script>

```

## Modelos de dados
{
  "id": "PROD-0001",
  "title": "Produto 1",
  "slug": "produto-1",
  "category": "casa",
  "brand": "Marca 2",
  "description": "Descrição...",
  "price": { "currency": "BRL", "original": 11.01, "discount_percent": 0, "final": 11.01 },
  "stock": { "quantity": 21, "sku": "SKU-PROD-0001", "warehouse": "RJ" },
  "rating": { "average": 3.2, "count": 12 },
  "created_at": "2025-09-23T...",
  "updated_at": "2025-09-23T..."
}

