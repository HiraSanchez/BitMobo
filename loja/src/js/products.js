import { escapeHtml, money, productVisual, stars } from "./utils.js";
import { addToCart } from "./cart.js";

export function renderProductCard(product) {
  const stockLabel =
    product.stock > 10
      ? "Em estoque - envio em ate 2 dias uteis"
      : product.stock > 0
        ? `Restam ${product.stock} unidades`
        : "Indisponivel";

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;

  return `
    <article class="product-card">
      <a class="product-card__media" href="/produto.html?id=${encodeURIComponent(product.id)}">
        ${product.badge ? `<span class="badge">${escapeHtml(product.badge)}</span>` : ""}
        ${discount ? `<span class="badge badge--sale">-${discount}%</span>` : ""}
        ${productVisual(product)}
      </a>
      <div class="product-card__body">
        <span class="product-card__brand">${escapeHtml(product.brand)}</span>
        <h3 class="product-card__title">
          <a href="/produto.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a>
        </h3>
        ${product.rating ? `<p class="product-card__rating" aria-label="Nota ${product.rating}">${stars(product.rating)} <span>(${product.reviews || 0})</span></p>` : ""}
        <div class="price-block">
          ${product.oldPrice ? `<s class="price-old">${money(product.oldPrice)}</s>` : ""}
          <strong class="price-current">${money(product.price)}</strong>
          <span class="price-note">no Pix</span>
        </div>
        <p class="stock-label ${product.stock > 0 ? "stock-ok" : "stock-out"}">${stockLabel}</p>
        <div class="product-card__actions">
          <a class="btn btn--ghost btn--sm" href="/produto.html?id=${encodeURIComponent(product.id)}">Ver detalhes</a>
          <button type="button" class="btn btn--primary btn--sm" data-add-cart="${escapeHtml(product.id)}" ${product.stock < 1 ? "disabled" : ""}>
            Adicionar
          </button>
        </div>
      </div>
    </article>
  `;
}

export function bindAddToCart(container, catalog, onAdded) {
  container.querySelectorAll("[data-add-cart]").forEach(button => {
    button.addEventListener("click", () => {
      const product = catalog.categories
        .flatMap(c => c.products.map(p => ({ ...p, categoryIcon: c.icon, categoryId: c.id, categoryName: c.name })))
        .find(p => p.id === button.dataset.addCart);

      if (!product || product.stock < 1) return;

      addToCart(product);
      if (onAdded) onAdded(product);
      else {
        const toast = document.getElementById("toast");
        if (toast) {
          toast.textContent = `${product.name} adicionado ao carrinho`;
          toast.hidden = false;
          setTimeout(() => { toast.hidden = true; }, 2800);
        }
      }
    });
  });
}
