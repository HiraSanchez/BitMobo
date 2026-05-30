export function money(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function stars(rating) {
  const full = Math.round(Number(rating) || 0);
  return "\u2605".repeat(full) + "\u2606".repeat(5 - full);
}

export const CATEGORY_ICONS = {
  motherboard: "MB",
  cpu: "CPU",
  ram: "RAM",
  gpu: "GPU",
  storage: "SSD",
  psu: "PSU",
  case: "ATX",
  peripheral: "I/O",
  deal: "KIT",
  default: "HW"
};

export function categoryIcon(key) {
  return CATEGORY_ICONS[key] || CATEGORY_ICONS.default;
}

export function productVisual(product, variant = "") {
  const image = product?.image || product?.imageUrl || product?.thumbnail;
  const alt = product?.name || "Produto BitMobo";
  const imageClasses = ["product-image", variant && `product-image--${variant}`].filter(Boolean).join(" ");

  if (image) {
    return `<img class="${imageClasses}" src="${escapeHtml(encodeURI(image))}" alt="${escapeHtml(alt)}" loading="lazy">`;
  }

  const brand = String(product?.brand || "BM").slice(0, 10).toUpperCase();
  const sku = String(product?.id || "SKU").toUpperCase();
  const category = String(product?.categoryName || product?.categoryId || "Hardware");
  const short = sku.split("-").slice(0, 2).join(" ");
  const classes = ["product-visual", variant && `product-visual--${variant}`].filter(Boolean).join(" ");

  return `
    <div class="${classes}" aria-hidden="true">
      <span class="product-visual__brand">${escapeHtml(brand)}</span>
      <strong>${escapeHtml(short)}</strong>
      <small>${escapeHtml(category)}</small>
    </div>
  `;
}
