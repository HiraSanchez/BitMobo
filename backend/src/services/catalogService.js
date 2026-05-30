const { readCatalog } = require("../data/store");
const { normalize, money } = require("../utils/text");

function allProducts() {
  const catalog = readCatalog();
  return (catalog.categories || []).flatMap(category =>
    (category.products || []).map(product => ({
      ...product,
      categoryId: category.id,
      categoryName: category.name
    }))
  );
}

function listCategories() {
  return readCatalog().categories || [];
}

function findCategory(text) {
  const requested = normalize(text);
  return listCategories().find(category =>
    normalize(category.id) === requested || normalize(category.name).includes(requested)
  );
}

function searchProducts(query) {
  const requested = normalize(query)
    .replace(/^tem\s+/, "")
    .replace(/^quero\s+/, "")
    .replace(/^buscar\s+/, "");

  return allProducts().filter(product => {
    const haystack = normalize(`${product.id} ${product.name} ${product.categoryName} ${product.description || ""}`);
    return haystack.includes(requested);
  });
}

function findProduct(query) {
  const requested = normalize(query);
  return allProducts().find(product =>
    normalize(product.id) === requested ||
    normalize(product.name) === requested ||
    normalize(product.name).includes(requested)
  );
}

function formatProduct(product) {
  return `${product.id} - ${product.name}: ${money(product.price)} (${product.stock} em estoque)`;
}

function productDetails(product) {
  return [
    `Nome: ${product.name}`,
    `Preco: ${money(product.price)}`,
    `Estoque: ${product.stock}`,
    `Categoria: ${product.categoryName}`,
    `Descricao: ${product.description || "Sem descricao"}`
  ].join("\n");
}

function formatCatalog(categoryId) {
  const categories = listCategories();

  if (!categoryId) {
    const names = categories
      .map(category => category.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return `Categorias disponiveis: ${names.join(", ")}.\nDigite uma categoria ou busque um produto pelo nome.`;
  }

  const category = findCategory(categoryId);

  if (!category) {
    const products = searchProducts(categoryId);
    if (products.length > 0) {
      return products.map(formatProduct).join("\n");
    }

    const fallbackNames = categories
      .map(item => item.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    return `Nao encontrei essa categoria ou produto. Categorias disponiveis: ${fallbackNames.join(", ")}.`;
  }

  return category.products.map(product => formatProduct({ ...product, categoryName: category.name })).join("\n");
}

module.exports = {
  allProducts,
  listCategories,
  findProduct,
  searchProducts,
  formatProduct,
  productDetails,
  formatCatalog
};
