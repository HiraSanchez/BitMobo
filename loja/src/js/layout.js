import { loadAppConfig, getChatbotUrl, isChatbotConfigured } from "./config.js";
import { cartCount } from "./cart.js";
import { escapeHtml } from "./utils.js";
import { readSession, logout } from "./account.js";

const NAV = [
  { href: "/produtos.html", label: "Produtos" },
  { href: "/produtos.html?categoria=ofertas", label: "Ofertas" },
  { href: "/suporte.html", label: "Suporte" },
  { href: "/sobre.html", label: "Sobre" }
];

function chatbotButtons(chatUrl, configured) {
  const href = configured ? chatUrl : "/suporte.html#assistente";
  const title = configured
    ? "Abrir assistente virtual"
    : "Configure CHATBOT_URL - veja instrucoes em Suporte";

  return `
    <a class="btn btn--chat" href="${escapeHtml(href)}" target="${configured ? "_blank" : "_self"}" rel="noopener" title="${escapeHtml(title)}">
      <span class="btn-chat-icon" aria-hidden="true"></span>
      <span class="btn-chat-label">Fale com o assistente</span>
    </a>
  `;
}

function renderHeader(config, catalog, activePath, chatUrl, chatConfigured) {
  const storeName = config.storeName || catalog?.store?.name || "BitMobo";
  const categories = catalog?.categories || [];
  const session = readSession();
  const accountLink = session
    ? `<button type="button" class="header-link header-user" id="logout-button" title="Sair da conta">${escapeHtml(session.name || "Minha conta")} - Sair</button>`
    : `<a class="header-link" href="/login.html">Entrar</a>`;

  return `
    <header class="site-header">
      <div class="container header-row">
        <button type="button" class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Abrir menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <a class="brand" href="/" aria-label="${escapeHtml(storeName)}">
          <img class="brand__logo-full" src="/brand/bitmobo-logo.png" alt="" aria-hidden="true">
          <img class="brand__logo-mark" src="/brand/bitmobo-mark.png" alt="" aria-hidden="true">
          <span class="sr-only">${escapeHtml(storeName)}</span>
        </a>
        <form class="search" action="/produtos.html" method="get" role="search">
          <input type="search" name="q" placeholder="Buscar Ryzen, RTX, DDR5, B550..." aria-label="Buscar produtos">
          <button type="submit">Buscar</button>
        </form>
        <div class="header-actions">
          ${accountLink}
          ${chatbotButtons(chatUrl, chatConfigured)}
          <a class="btn btn--cart" href="/carrinho.html">
            Carrinho <span class="cart-count" id="cart-count">${cartCount()}</span>
          </a>
        </div>
      </div>
      <nav class="category-nav" aria-label="Categorias">
        <div class="container category-nav__inner">
          <a href="/produtos.html" class="${activePath === "produtos" ? "is-active" : ""}">Todos</a>
          ${categories
            .filter(c => c.id !== "ofertas")
            .map(
              c => `
            <a href="/produtos.html?categoria=${encodeURIComponent(c.id)}"
               class="${activePath === c.id ? "is-active" : ""}">
              ${escapeHtml(c.name)}
            </a>`
            )
            .join("")}
          <a href="/produtos.html?categoria=ofertas" class="${activePath === "ofertas" ? "is-active" : ""}">Combos</a>
        </div>
      </nav>
      <nav class="mobile-nav" id="mobile-nav" hidden>
        <div class="container">
          ${NAV.map(item => `<a href="${item.href}">${item.label}</a>`).join("")}
          <a href="/carrinho.html">Carrinho (${cartCount()})</a>
          ${session ? `<button type="button" id="mobile-logout-button">Sair de ${escapeHtml(session.name || "Minha conta")}</button>` : `<a href="/login.html">Entrar</a>`}
          <a href="${chatConfigured ? escapeHtml(chatUrl) : "/suporte.html#assistente"}">Fale com o assistente</a>
        </div>
      </nav>
    </header>
    <a class="fab-assistant" href="${chatConfigured ? escapeHtml(chatUrl) : "/suporte.html#assistente"}"
       target="${chatConfigured ? "_blank" : "_self"}" rel="noopener" aria-label="Fale com o assistente">
      AI
    </a>
  `;
}

function renderFooter(config, catalog) {
  const name = config.storeName || catalog?.store?.name || "BitMobo";

  return `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <img class="footer-logo" src="/brand/bitmobo-logo.png" alt="${escapeHtml(name)}">
          <p>Desde 2019 ajudando entusiastas e profissionais a montar PCs com pecas selecionadas e suporte tecnico especializado.</p>
        </div>
        <div>
          <h4>Comprar</h4>
          <ul>
            <li><a href="/produtos.html">Catalogo completo</a></li>
            <li><a href="/produtos.html?categoria=placas-mae">Placas-mae</a></li>
            <li><a href="/produtos.html?categoria=placas-video">Placas de video</a></li>
            <li><a href="/carrinho.html">Meu carrinho</a></li>
          </ul>
        </div>
        <div>
          <h4>Conta</h4>
          <ul>
            <li><a href="/login.html">Entrar</a></li>
            <li><a href="/cadastro.html">Criar conta</a></li>
            <li><a href="/checkout.html">Finalizar pedido</a></li>
          </ul>
        </div>
        <div>
          <h4>Ajuda</h4>
          <ul>
            <li><a href="/suporte.html">Central de suporte</a></li>
            <li><a href="/suporte.html#compatibilidade">Compatibilidade de pecas</a></li>
            <li><a href="/sobre.html">Sobre a BitMobo</a></li>
          </ul>
        </div>
      </div>
      <div class="container footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${escapeHtml(name)}. Precos e estoques simulados para demonstracao.</p>
      </div>
    </footer>
  `;
}

export async function mountLayout({ activePath = "", catalog = null } = {}) {
  const config = await loadAppConfig();
  if (!catalog) {
    const { fetchCatalog } = await import("./api.js");
    catalog = await fetchCatalog();
  }

  const chatUrl = await getChatbotUrl();
  const chatConfigured = isChatbotConfigured(chatUrl);

  document.getElementById("site-header").innerHTML = renderHeader(
    config,
    catalog,
    activePath,
    chatUrl,
    chatConfigured
  );

  document.getElementById("site-footer").innerHTML = renderFooter(config, catalog);

  const toggle = document.getElementById("menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    mobileNav.hidden = open;
  });

  document.getElementById("logout-button")?.addEventListener("click", () => {
    logout();
    window.location.href = "/";
  });

  document.getElementById("mobile-logout-button")?.addEventListener("click", () => {
    logout();
    window.location.href = "/";
  });

  const refreshCount = () => {
    const el = document.getElementById("cart-count");
    if (el) el.textContent = String(cartCount());
  };

  window.addEventListener("bitmobo:cart-updated", refreshCount);
  refreshCount();

  return { config, catalog, chatUrl, chatConfigured };
}
