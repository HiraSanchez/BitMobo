import "../../styles/main.css";
import { mountLayout } from "../layout.js";
import { getChatbotUrl, isChatbotConfigured } from "../config.js";
import { escapeHtml } from "../utils.js";

async function init() {
  await mountLayout({ activePath: "" });

  const chatUrl = await getChatbotUrl();
  const configured = isChatbotConfigured(chatUrl);
  const assistente = document.getElementById("assistente-block");

  if (configured) {
    assistente.innerHTML = `
      <p>Nosso assistente virtual responde sobre pedidos, compatibilidade de pecas, prazos e trocas.</p>
      <a class="btn btn--primary btn--lg" href="${escapeHtml(chatUrl)}" target="_blank" rel="noopener">Abrir assistente</a>
    `;
  } else {
    assistente.innerHTML = `
      <div class="alert alert--warn">
        Configure a variavel <code>CHATBOT_URL</code> no Render (ou no arquivo <code>.env</code> local) com a URL publica do seu chatbot.
      </div>
      <p>Exemplo: <code>CHATBOT_URL=https://meu-chatbot.onrender.com</code></p>
    `;
  }

  if (location.hash === "#assistente") {
    assistente.scrollIntoView({ behavior: "smooth" });
  }
}

init().catch(console.error);
