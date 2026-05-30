import { loadAppConfig } from "./config.js";

let catalogCache = null;

export async function fetchCatalog(force = false) {
  if (catalogCache && !force) return catalogCache;

  const config = await loadAppConfig();
  const endpoint = config.apiBaseUrl
    ? `${config.apiBaseUrl.replace(/\/$/, "")}/catalog`
    : "/api/catalog";

  const response = await fetch(endpoint, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error("Catalogo indisponivel");

  catalogCache = await response.json();
  return catalogCache;
}

export function flattenProducts(catalog) {
  return (catalog.categories || []).flatMap(category =>
    (category.products || []).map(product => ({
      ...product,
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon
    }))
  );
}

export function findProduct(catalog, id) {
  return flattenProducts(catalog).find(item => item.id === id) || null;
}

export function findCategory(catalog, categoryId) {
  return (catalog.categories || []).find(item => item.id === categoryId) || null;
}
