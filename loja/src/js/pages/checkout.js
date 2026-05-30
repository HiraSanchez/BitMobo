import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { fetchCatalog } from "../api.js";
import { readCart, cartSubtotal, clearCart } from "../cart.js";
import { readSession } from "../account.js";
import { getChatbotUrl, isChatbotConfigured } from "../config.js";
import { money, escapeHtml, productVisual } from "../utils.js";

function createOrderNumber() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BM-${stamp}-${random}`;
}

async function init() {
  const catalog = await fetchCatalog();
  await mountLayout({ activePath: "", catalog });

  const items = readCart();
  const summaryEl = document.getElementById("order-summary");
  const form = document.getElementById("checkout-form");
  const session = readSession();

  if (!session) {
    summaryEl.innerHTML = `
      <div class="alert alert--warn">
        Entre na sua conta para continuar a compra.
      </div>
      <a href="/login.html?redirect=/checkout.html" class="btn btn--primary">Entrar para comprar</a>
    `;
    form.hidden = true;
    return;
  }

  if (!items.length) {
    summaryEl.innerHTML = `<div class="empty"><p>Carrinho vazio.</p><a href="/produtos.html" class="btn btn--primary">Voltar as compras</a></div>`;
    form.hidden = true;
    return;
  }

  const sub = cartSubtotal();
  const shipping = sub >= 999 ? 0 : 39.9;

  summaryEl.innerHTML = `
    ${items
      .map(
        i => `<div class="cart-row">
        <div class="cart-row__thumb">${productVisual(i, "thumb")}</div>
        <div><strong>${escapeHtml(i.name)}</strong><p style="font-size:13px;color:var(--muted)">Qtd ${i.qty}</p></div>
        <strong>${money(i.price * i.qty)}</strong>
      </div>`
      )
      .join("")}
    <div class="summary-line"><span>Subtotal</span><span>${money(sub)}</span></div>
    <div class="summary-line"><span>Frete</span><span>${shipping === 0 ? "Gratis" : money(shipping)}</span></div>
    <div class="summary-line total"><span>Total</span><strong>${money(sub + shipping)}</strong></div>
  `;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const chatUrl = await getChatbotUrl();
    const configured = isChatbotConfigured(chatUrl);
    const summary = items.map(i => `${i.qty}x ${i.name}`).join(", ");
    const orderNumber = createOrderNumber();
    const supportUrl = configured
      ? `${chatUrl}${chatUrl.includes("?") ? "&" : "?"}msg=${encodeURIComponent(`Preciso de ajuda com o pedido ${orderNumber}: ${summary}. Total aproximado ${money(sub + shipping)}.`)}`
      : "";

    clearCart();
    document.getElementById("checkout-success").innerHTML = `
      <h2>Pedido realizado com sucesso</h2>
      <p>Numero do pedido: <strong>${escapeHtml(orderNumber)}</strong></p>
      <p>Resumo: ${escapeHtml(summary)}.</p>
      <p>Total estimado: <strong>${money(sub + shipping)}</strong></p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px">
        <a class="btn btn--primary" href="/">Voltar a loja</a>
        ${
          configured
            ? `<a class="btn btn--ghost" href="${escapeHtml(supportUrl)}" target="_blank" rel="noopener">Falar com assistente</a>`
            : `<a class="btn btn--ghost" href="/suporte.html#assistente">Ver suporte</a>`
        }
      </div>
    `;
    document.getElementById("checkout-success").hidden = false;
    form.hidden = true;
  });
}

init().catch(console.error);
