import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { fetchCatalog, flattenProducts } from "../api.js";
import { renderProductCard, bindAddToCart } from "../products.js";
import { escapeHtml, money, categoryIcon } from "../utils.js";

async function init() {
  const catalog = await fetchCatalog();
  await mountLayout({ activePath: "home", catalog });

  const store = catalog.store || {};
  document.getElementById("hero-title").textContent =
    store.tagline || "Monte seu desktop com pecas testadas pela BitMobo";

  const tags = ["AM5 & LGA 1700", "DDR5 em estoque", "RTX & Radeon", "Suporte de compatibilidade"];
  document.getElementById("hero-tags").innerHTML = tags.map(t => `<span class="pill">${t}</span>`).join("");

  const combo = flattenProducts(catalog).find(p => p.id === "KIT-AM4") || flattenProducts(catalog)[0];
  if (combo) {
    document.getElementById("hero-deal-price").textContent = money(combo.price);
    document.getElementById("hero-deal-name").textContent = combo.name;
  }

  document.getElementById("category-grid").innerHTML = (catalog.categories || [])
    .filter(c => c.id !== "ofertas")
    .map(
      cat => `
      <a class="category-tile" href="/produtos.html?categoria=${encodeURIComponent(cat.id)}">
        <div class="category-tile__icon">${categoryIcon(cat.icon)}</div>
        <strong>${escapeHtml(cat.name)}</strong>
        <p>${escapeHtml(cat.description || "")}</p>
      </a>`
    )
    .join("");

  const featured = flattenProducts(catalog)
    .filter(p => p.badge)
    .slice(0, 8);

  const grid = document.getElementById("featured-grid");
  grid.innerHTML = (featured.length ? featured : flattenProducts(catalog).slice(0, 8))
    .map(renderProductCard)
    .join("");

  bindAddToCart(grid, catalog);
}

init().catch(console.error);
