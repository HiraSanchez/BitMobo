const CART_KEY = "bitmobo:cart:v1";

export function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("bitmobo:cart-updated"));
}

export function cartCount() {
  return readCart().reduce((sum, item) => sum + item.qty, 0);
}

export function cartSubtotal() {
  return readCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

export function addToCart(product, qty = 1) {
  const items = readCart();
  const existing = items.find(item => item.id === product.id);
  const max = product.stock || 1;

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, max);
  } else {
    items.push({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: product.price,
      stock: product.stock,
      categoryIcon: product.categoryIcon,
      qty: Math.min(qty, max)
    });
  }

  writeCart(items);
  return items;
}

export function updateQty(id, qty) {
  const items = readCart()
    .map(item => (item.id === id ? { ...item, qty } : item))
    .filter(item => item.qty > 0);
  writeCart(items);
}

export function removeFromCart(id) {
  writeCart(readCart().filter(item => item.id !== id));
}

export function clearCart() {
  writeCart([]);
}
