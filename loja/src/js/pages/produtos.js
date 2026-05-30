import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { fetchCatalog, flattenProducts, findCategory } from "../api.js";
import { renderProductCard, bindAddToCart } from "../products.js";
import { getQueryParam } from "../utils.js";

async function init() {
  const catalog = await fetchCatalog();
  const categoryId = getQueryParam("categoria") || "";
  const query = (getQueryParam("q") || "").trim().toLowerCase();

  await mountLayout({ activePath: categoryId || "produtos", catalog });

  const category = categoryId ? findCategory(catalog, categoryId) : null;
  document.getElementById("page-title").textContent = category
    ? category.name
    : query
      ? `Busca: "${query}"`
      : "Catalogo de componentes";

  document.getElementById("page-lead").textContent = category
    ? category.description || `${(category.products || []).length} produtos disponiveis`
    : "Placas-mae, CPUs, memoria, GPU, SSD, fontes, gabinetes e perifericos";

  let products = flattenProducts(catalog);
  if (categoryId) products = products.filter(p => p.categoryId === categoryId);
  if (query) {
    products = products.filter(p => {
      const hay = `${p.id} ${p.name} ${p.brand} ${p.description} ${(p.specs || []).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }

  const sortSelect = document.getElementById("sort-select");
  const grid = document.getElementById("product-grid");
  const empty = document.getElementById("empty-state");

  function render() {
    let list = [...products];
    const sort = sortSelect.value;
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    document.getElementById("result-count").textContent = `${list.length} produto(s)`;

    if (!list.length) {
      grid.innerHTML = "";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    grid.innerHTML = list.map(renderProductCard).join("");
    bindAddToCart(grid, catalog);
  }

  sortSelect.addEventListener("change", render);
  render();
}

init().catch(console.error);
