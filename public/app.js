const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const attachmentInput = document.querySelector("#attachment-input");
const quickActions = document.querySelector("#quick-actions");
const intent = document.querySelector("#intent");
const destination = document.querySelector("#destination");
const closed = document.querySelector("#closed");
const step = document.querySelector("#step");
const toastRegion = document.querySelector("#app-toast");
const storeName = document.querySelector("#store-name");
const storeSubtitle = document.querySelector("#store-subtitle");
const assistantTitle = document.querySelector("#assistant-title");
const assistantPresence = document.querySelector("#assistant-presence");
const assistantName = document.querySelector("#assistant-name");
const businessHours = document.querySelector("#business-hours");
const nextAction = document.querySelector("#next-action");
const activeProtocol = document.querySelector("#active-protocol");
const humanChannel = document.querySelector("#human-channel");

const USER_KEY = "chatbox:user-id";
const userId = localStorage.getItem(USER_KEY) || `web-${Date.now()}`;
localStorage.setItem(USER_KEY, userId);
let initialMessageSent = false;
let remoteMessageCursor = 0;
let isSyncingMessages = false;
let messageSyncTimer = null;

function formatTime(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function showToast(text, variant = "info") {
  if (!toastRegion) return;
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.textContent = text;
  toastRegion.appendChild(el);
  const ttl = variant === "error" ? 5200 : 3600;
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    setTimeout(() => el.remove(), 260);
  }, ttl);
}

function scrollMessagesToEnd() {
  requestAnimationFrame(() => {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  });
}

function addMessage(text, type, options = {}) {
  const wrap = document.createElement("div");
  const isError = type === "system-error";
  wrap.className = isError ? "message system-error" : `message ${type}`;
  wrap.setAttribute("role", "article");

  const body = document.createElement("div");
  body.className = "message__body";

  if (options.sender) {
    const sender = document.createElement("span");
    sender.className = "message__sender";
    sender.textContent = options.sender;
    body.appendChild(sender);
    body.appendChild(document.createTextNode(text));
  } else {
    body.textContent = text;
  }

  if (options.protocol) {
    const protocol = document.createElement("strong");
    protocol.className = "message__protocol";
    protocol.textContent = `Protocolo ${options.protocol}`;
    body.appendChild(document.createElement("br"));
    body.appendChild(protocol);
  }

  const meta = document.createElement("div");
  meta.className = "message__meta";
  const timeEl = document.createElement("time");
  const at = options.at || new Date();
  timeEl.dateTime = at.toISOString();
  timeEl.textContent = options.timeLabel || formatTime(at);
  meta.appendChild(timeEl);

  wrap.appendChild(body);
  wrap.appendChild(meta);
  messagesEl.appendChild(wrap);
  scrollMessagesToEnd();
  return wrap;
}

function showTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message bot typing";
  wrap.setAttribute("aria-label", "Bot está digitando");
  const dots = document.createElement("div");
  dots.className = "typing-dots";
  dots.appendChild(document.createElement("span"));
  dots.appendChild(document.createElement("span"));
  dots.appendChild(document.createElement("span"));
  wrap.appendChild(dots);
  messagesEl.appendChild(wrap);
  scrollMessagesToEnd();
  return wrap;
}

function setComposerBusy(busy) {
  form.classList.toggle("is-busy", busy);
  form.querySelector('button[type="submit"]').disabled = busy;
  input.disabled = busy;
  quickActions.querySelectorAll("button").forEach(btn => {
    btn.disabled = busy;
  });
}

function updateStatus(data) {
  intent.textContent = (data.intent || "menu").toLowerCase();
  destination.textContent = data.handoff ? "Equipe de atendimento" : "Bot";
  closed.textContent = data.closed ? "Encerrado" : "Aberto";
  step.textContent = data.step || "MENU";
  nextAction.textContent = data.nextBestAction || (data.handoff ? "Acompanhar retorno da equipe" : "Escolha uma opcao ou digite sua mensagem");
  activeProtocol.textContent = data.protocol || activeProtocol.textContent || "Ainda nao gerado";
  humanChannel.textContent = data.handoff ? "Equipe acionada" : "Disponivel por solicitacao";
}

function updateQuickReplies(data) {
  quickActions.innerHTML = "";

  if (!data.quickReplies || data.quickReplies.length === 0) {
    return;
  }

  data.quickReplies.forEach(reply => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = reply.label;
    button.dataset.message = reply.message;
    quickActions.appendChild(button);
  });
}

async function loadStoreProfile() {
  try {
    const response = await fetch("/api/store-profile");
    if (!response.ok) return;
    const profile = await response.json();

    storeName.textContent = profile.name || "BitMobo";
    storeSubtitle.textContent = "Suporte inteligente para pedidos, produtos e pos-venda.";
    assistantTitle.textContent = profile.assistantName || "Assistente BitMobo";
    assistantPresence.textContent = "Online agora · atendimento guiado";
    assistantName.textContent = profile.assistantName || "Assistente";
    businessHours.textContent = profile.businessHours || "";

    updateQuickReplies({
      quickReplies: profile.supportTopics || [
        { label: "Pedidos", message: "Quero acompanhar meu pedido" },
        { label: "Produtos", message: "Ver catalogo de produtos" },
        { label: "Atendente", message: "Falar com atendente" }
      ]
    });
  } catch {
    assistantName.textContent = "Assistente";
    businessHours.textContent = "Horario indisponivel";
  }
}

function renderStructuredHighlights(data) {
  if (data.protocol) {
    showToast(`Protocolo gerado: ${data.protocol}`, "success");
  }

  if (data.cart?.items?.length) {
    const total = data.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    showToast(`Carrinho atualizado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
  }

  if (data.product?.name) {
    showToast(`Produto selecionado: ${data.product.name}`, "info");
  }
}

function remoteDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function renderRemoteMessage(message) {
  if (!message?.text) return;

  const at = remoteDate(message.at);
  const type = message.from === "attendant" ? "attendant" : message.from === "user" ? "user" : "bot";
  const options = {
    at,
    timeLabel: formatTime(at)
  };

  if (type === "attendant") {
    options.sender = message.attendant || "Atendente";
  }

  addMessage(message.text, type, options);
}

function updateStatusFromConversation(data) {
  if (!data || !data.status) return;
  updateStatus({
    intent: data.intent || intent.textContent || "menu",
    handoff: data.status === "encaminhado" || data.status === "em atendimento",
    closed: data.status === "finalizado",
    step: data.step || step.textContent || "MENU",
    protocol: data.protocol || activeProtocol.textContent,
    nextBestAction: data.status === "em atendimento"
      ? "Responder ao atendente ou finalizar o atendimento"
      : "Escolha uma opcao ou digite sua mensagem"
  });
}

async function restoreConversationHistory() {
  try {
    const response = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}&after=0`, {
      cache: "no-store"
    });

    if (!response.ok) return false;

    const data = await response.json();
    const messages = Array.isArray(data.messages) ? data.messages : [];

    if (Number.isFinite(data.totalMessages)) {
      remoteMessageCursor = data.totalMessages;
    }

    if (messages.length === 0) {
      return false;
    }

    messages.forEach(renderRemoteMessage);
    updateStatusFromConversation(data);
    return true;
  } catch {
    return false;
  }
}

async function syncConversationMessages({ render = false } = {}) {
  if (isSyncingMessages) return;
  isSyncingMessages = true;

  try {
    const response = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}&after=${remoteMessageCursor}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const messages = Array.isArray(data.messages) ? data.messages : [];

    const attendantMessages = messages.filter(message => message.from === "attendant" && message.text);

    if (render) {
      attendantMessages.forEach(renderRemoteMessage);
      if (attendantMessages.length > 0) updateStatusFromConversation(data);
    }

    if (Number.isFinite(data.totalMessages)) {
      remoteMessageCursor = data.totalMessages;
    }
  } catch {
    // A sincronizacao silenciosa evita interromper a conversa por falhas momentaneas.
  } finally {
    isSyncingMessages = false;
  }
}

function startMessageSync() {
  if (messageSyncTimer) return;
  syncConversationMessages({ render: false });
  messageSyncTimer = setInterval(() => syncConversationMessages({ render: true }), 3000);
}

function greetingText() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia!";
  if (hour < 18) return "Boa tarde!";
  return "Boa noite!";
}

function getInitialMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const message = params.get("msg");
  return message ? message.trim().slice(0, 1000) : "";
}

function clearInitialMessageFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("msg")) return;
  url.searchParams.delete("msg");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function handleInitialMessage() {
  const message = getInitialMessageFromUrl();
  if (!message || initialMessageSent) return;

  initialMessageSent = true;
  clearInitialMessageFromUrl();
  setTimeout(() => sendMessage(message), 350);
}

function resetConversation() {
  localStorage.removeItem(USER_KEY);
  window.location.reload();
}

function addUtilityActions() {
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Novo atendimento";
  reset.addEventListener("click", event => {
    event.stopPropagation();
    resetConversation();
  });

  if (quickActions.children.length > 0) {
    quickActions.appendChild(reset);
  }
}

function afterQuickReplyRender() {
  addUtilityActions();
}

const originalUpdateQuickReplies = updateQuickReplies;
updateQuickReplies = function patchedQuickReplies(data) {
  originalUpdateQuickReplies(data);
  afterQuickReplyRender();
};

function bindInitialQuickActions() {
  quickActions.addEventListener("click", event => {
    const button = event.target.closest("button[data-message]");
    if (button) {
      sendMessage(button.dataset.message);
    }
  });
}

async function sendMessage(text) {
  const cleanText = text.trim();
  const file = attachmentInput.files[0];

  if (!cleanText && !file) {
    return;
  }

  addMessage(
    file ? `${cleanText || "Comprovante enviado"} · ${file.name}` : cleanText,
    "user"
  );
  input.value = "";
  attachmentInput.value = "";

  const typing = showTyping();
  setComposerBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        message: cleanText || "Enviei um comprovante",
        attachmentName: file ? file.name : null
      })
    });

    typing.remove();

    const raw = await response.text();
    let data;

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      showToast("Resposta inválida do servidor.", "error");
      addMessage("Não foi possível interpretar a resposta. Tente novamente em instantes.", "system-error");
      return;
    }

    if (!response.ok) {
      const msg = data.error || `Erro ${response.status}`;
      showToast(msg, "error");
      addMessage(`Algo deu errado: ${msg}`, "system-error");
      return;
    }

    if (typeof data.message !== "string") {
      showToast("Resposta incompleta do servidor.", "error");
      addMessage("Não recebemos uma mensagem válida. Tente de novo.", "system-error");
      return;
    }

    addMessage(data.message, "bot", { protocol: data.protocol });
    if (Number.isFinite(data.messageCount)) {
      remoteMessageCursor = Math.max(remoteMessageCursor, data.messageCount);
    } else {
      syncConversationMessages({ render: false });
    }
    updateStatus(data);
    updateQuickReplies(data);
    renderStructuredHighlights(data);
  } catch (err) {
    typing.remove();
    console.error(err);
    showToast("Sem conexão ou servidor indisponível.", "error");
    addMessage(
      "Não conseguimos contatar o servidor. Verifique sua conexão e tente novamente.",
      "system-error"
    );
  } finally {
    setComposerBusy(false);
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

bindInitialQuickActions();
loadStoreProfile().finally(async () => {
  const restored = await restoreConversationHistory();

  if (!restored) {
    addMessage(
      `${greetingText()} Sou o assistente virtual da loja. Posso ajudar com pedidos, produtos, pagamentos, trocas, garantia ou atendimento humano.`,
      "bot"
    );
  }

  handleInitialMessage();
  startMessageSync();
});
