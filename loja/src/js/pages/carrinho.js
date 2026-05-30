import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { fetchCatalog } from "../api.js";
import { readCart, updateQty, removeFromCart, cartSubtotal } from "../cart.js";
import { readSession } from "../account.js";
import { escapeHtml, money, productVisual } from "../utils.js";

async function init() {
  const catalog = await fetchCatalog();
  await mountLayout({ activePath: "", catalog });

  const listEl = document.getElementById("cart-list");
  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");
  const checkoutBtn = document.getElementById("btn-checkout");

  function render() {
    const items = readCart();

    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty">
          <p>Seu carrinho esta vazio.</p>
          <a class="btn btn--primary" href="/produtos.html">Explorar catalogo</a>
        </div>`;
      subtotalEl.textContent = money(0);
      totalEl.textContent = money(0);
      checkoutBtn.disabled = true;
      return;
    }

    checkoutBtn.disabled = false;
    listEl.innerHTML = items
      .map(
        item => `
      <div class="cart-row" data-id="${escapeHtml(item.id)}">
        <div class="cart-row__thumb">${productVisual(item, "thumb")}</div>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <p style="margin:4px 0;font-size:13px;color:var(--muted)">${escapeHtml(item.brand || "")}</p>
          <div class="qty">
            <button type="button" data-minus aria-label="Diminuir">−</button>
            <span>${item.qty}</span>
            <button type="button" data-plus aria-label="Aumentar">+</button>
            <button type="button" data-remove style="border:none;background:none;color:var(--price);cursor:pointer;margin-left:8px">Remover</button>
          </div>
        </div>
        <strong>${money(item.price * item.qty)}</strong>
      </div>`
      )
      .join("");

    const sub = cartSubtotal();
    subtotalEl.textContent = money(sub);
    totalEl.textContent = money(sub);

    listEl.querySelectorAll(".cart-row").forEach(row => {
      const id = row.dataset.id;
      const item = items.find(i => i.id === id);
      row.querySelector("[data-minus]")?.addEventListener("click", () => {
        updateQty(id, Math.max(1, item.qty - 1));
        render();
      });
      row.querySelector("[data-plus]")?.addEventListener("click", () => {
        updateQty(id, Math.min(item.stock || 99, item.qty + 1));
        render();
      });
      row.querySelector("[data-remove]")?.addEventListener("click", () => {
        removeFromCart(id);
        render();
      });
    });
  }

  checkoutBtn.addEventListener("click", () => {
    if (!readSession()) {
      window.location.href = "/login.html?redirect=/checkout.html";
      return;
    }

    window.location.href = "/checkout.html";
  });

  render();
  window.addEventListener("bitmobo:cart-updated", render);
}

init().catch(console.error);
