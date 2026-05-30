import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { fetchCatalog, findProduct } from "../api.js";
import { addToCart } from "../cart.js";
import { getQueryParam, escapeHtml, money, productVisual, stars } from "../utils.js";

async function init() {
  const id = getQueryParam("id");
  const catalog = await fetchCatalog();
  const product = id ? findProduct(catalog, id) : null;

  await mountLayout({ activePath: product?.categoryId || "", catalog });

  if (!product) {
    document.getElementById("product-root").hidden = true;
    document.getElementById("product-error").hidden = false;
    return;
  }

  document.title = `${product.name} - ${catalog.store?.name || "BitMobo"}`;

  document.getElementById("breadcrumb").innerHTML = `
    <a href="/">Inicio</a> /
    <a href="/produtos.html?categoria=${encodeURIComponent(product.categoryId)}">${escapeHtml(product.categoryName)}</a> /
    <span>${escapeHtml(product.name)}</span>
  `;

  const specsRows = (product.specs || [])
    .map(spec => `<tr><td>Especificacao</td><td>${escapeHtml(spec)}</td></tr>`)
    .join("");

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;

  document.getElementById("product-root").innerHTML = `
    <article class="product-detail">
      <div class="product-detail__visual">${productVisual(product, "detail")}</div>
      <div class="product-detail__info">
        ${product.badge ? `<span class="badge product-detail__badge">${escapeHtml(product.badge)}</span>` : ""}
        <p class="product-card__brand">${escapeHtml(product.brand)} - SKU ${escapeHtml(product.id)}</p>
        <h1 class="product-detail__title">${escapeHtml(product.name)}</h1>
        ${product.rating ? `<p class="product-card__rating">${stars(product.rating)} <span>${product.reviews} avaliacoes</span></p>` : ""}
        <div class="price-block product-detail__price">
          ${product.oldPrice ? `<s class="price-old">${money(product.oldPrice)} ${discount ? `(-${discount}%)` : ""}</s>` : ""}
          <strong class="price-current">${money(product.price)}</strong>
          <span class="price-note">em ate 10x sem juros (simulacao)</span>
        </div>
        <p class="${product.stock > 0 ? "stock-ok" : "stock-out"}">
          ${product.stock > 0 ? `${product.stock} unidades prontas para envio` : "Produto esgotado"}
        </p>
        <p>${escapeHtml(product.description)}</p>
        <table class="spec-table">${specsRows}</table>
        <div class="product-detail__actions">
          <button type="button" class="btn btn--primary btn--lg" id="btn-add" ${product.stock < 1 ? "disabled" : ""}>
            Adicionar ao carrinho
          </button>
          <a class="btn btn--ghost btn--lg" href="/carrinho.html">Ver carrinho</a>
        </div>
        <div class="alert alert--info product-detail__help">
          Duvida se a peca combina com seu setup? Use <strong>Fale com o assistente</strong> no topo. O bot consulta o mesmo catalogo da loja.
        </div>
      </div>
    </article>
  `;

  document.getElementById("btn-add")?.addEventListener("click", () => {
    addToCart(product);
    const toast = document.getElementById("toast");
    toast.textContent = "Adicionado ao carrinho";
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 2500);
  });
}

init().catch(console.error);
