const adminShell = document.querySelector(".admin-shell");
const tickets = document.querySelector("#tickets");
const ratings = document.querySelector("#ratings");
const conversations = document.querySelector("#conversations");
const history = document.querySelector("#history");
const search = document.querySelector("#admin-search");
const statusFilter = document.querySelector("#status-filter");
const metricOpen = document.querySelector("#metric-open");
const metricHandoff = document.querySelector("#metric-handoff");
const metricResolved = document.querySelector("#metric-resolved");
const metricRating = document.querySelector("#metric-rating");
const replyForm = document.querySelector("#reply-form");
const replyUserId = document.querySelector("#reply-user-id");
const replyAttendant = document.querySelector("#reply-attendant");
const replyMessage = document.querySelector("#reply-message");
const toastRegion = document.querySelector("#admin-toast");
const storagePill = document.querySelector("#storage-pill");
const storageMode = document.querySelector("#storage-mode");

let adminData = {
  storage: null,
  complaints: [],
  returns: [],
  ratings: [],
  conversations: []
};

let selectedUserId = null;
let searchDebounceTimer = null;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function empty(text) {
  return `<p class="empty">${escapeHtml(text)}</p>`;
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function showToast(text, variant = "info") {
  if (!toastRegion) return;
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.textContent = text;
  toastRegion.appendChild(el);
  const ttl = variant === "error" ? 5200 : 3200;
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
    setTimeout(() => el.remove(), 260);
  }, ttl);
}

function renderStorageMeta() {
  const s = adminData.storage;
  if (!s || !storagePill || !storageMode) return;
  storagePill.hidden = false;
  storageMode.textContent = s.mode === "sqlite" ? "SQLite" : "JSON local";
  storagePill.title = s.note || "";
}

function allTickets() {
  const complaints = adminData.complaints.map(item => ({ ...item, ticketType: "complaint", ticketLabel: "Reclamação" }));
  const returns = adminData.returns.map(item => ({ ...item, ticketType: "return", ticketLabel: "Troca/devolução" }));
  return [...complaints, ...returns];
}

function filteredTickets() {
  const query = normalize(search.value);
  const status = statusFilter.value;

  return allTickets().filter(ticket => {
    const haystack = normalize([
      ticket.protocol,
      ticket.name,
      ticket.phone,
      ticket.order,
      ticket.reason,
      ticket.status,
      ticket.ticketLabel
    ].join(" "));

    const matchesSearch = !query || haystack.includes(query);
    const matchesStatus = status === "todos" || ticket.status === status;
    return matchesSearch && matchesStatus;
  });
}

function updateMetrics() {
  const items = allTickets();
  const open = items.filter(item => item.status === "aberta").length;
  const resolved = items.filter(item => item.status === "resolvida").length;
  const handoff = adminData.conversations.filter(item => item.status === "encaminhado").length;
  const ratingAverage = adminData.ratings.length
    ? adminData.ratings.reduce((sum, item) => sum + Number(item.rating), 0) / adminData.ratings.length
    : 0;

  metricOpen.textContent = open;
  metricHandoff.textContent = handoff;
  metricResolved.textContent = resolved;
  metricRating.textContent = adminData.ratings.length ? ratingAverage.toFixed(1) : "—";
}

function renderTickets() {
  const items = filteredTickets().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  if (items.length === 0) {
    tickets.innerHTML = empty("Nenhum chamado encontrado com os filtros atuais.");
    return;
  }

  tickets.innerHTML = items.map(ticket => `
    <div class="admin-item ticket-item">
      <div class="ticket-heading">
        <strong>${escapeHtml(ticket.protocol)}</strong>
        <span class="badge ${ticket.status === "resolvida" ? "success" : "warning"}">${escapeHtml(ticket.status)}</span>
      </div>
      <span>Tipo: ${escapeHtml(ticket.ticketLabel)}</span>
      <span>Cliente: ${escapeHtml(ticket.name || "Não informado")}</span>
      <span>Telefone: ${escapeHtml(ticket.phone || "Não informado")}</span>
      <span>Pedido: ${escapeHtml(ticket.order || "Não informado")}</span>
      <span>Motivo: ${escapeHtml(ticket.reason || "Não informado")}</span>
      <span>Prioridade: ${escapeHtml(ticket.urgency || "normal")}</span>
      <span>Anexo: ${escapeHtml(ticket.attachmentName || "Sem anexo")}</span>
      <span>Responsável: ${escapeHtml(ticket.assignedTo || "Não assumido")}</span>
      <div class="ticket-actions">
        <button type="button" data-action="assume" data-protocol="${escapeHtml(ticket.protocol)}" data-type="${ticket.ticketType}" ${ticket.status === "resolvida" ? "disabled" : ""}>Assumir chamado</button>
        <button type="button" data-action="finish" data-protocol="${escapeHtml(ticket.protocol)}" data-type="${ticket.ticketType}" ${ticket.status === "resolvida" ? "disabled" : ""}>Finalizar</button>
      </div>
    </div>
  `).join("");
}

function renderConversations() {
  const items = adminData.conversations
    .slice()
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  if (items.length === 0) {
    conversations.innerHTML = empty("Nenhuma conversa registrada.");
    return;
  }

  conversations.innerHTML = items.map(conversation => {
    const sel = conversation.userId === selectedUserId ? " is-selected" : "";
    return `
    <button type="button" class="conversation-button${sel}" data-user-id="${escapeHtml(conversation.userId)}">
      <strong>${escapeHtml(conversation.userId)}</strong>
      <span>Status: ${escapeHtml(conversation.status)}</span>
      ${conversation.handoffProtocol ? `<span>Protocolo: ${escapeHtml(conversation.handoffProtocol)}</span>` : ""}
      <span>Etapa: ${escapeHtml(conversation.step)}</span>
      <span>Mensagens: ${conversation.totalMessages}</span>
    </button>
  `;
  }).join("");
}

function renderRatings() {
  const items = adminData.ratings.slice().reverse();

  if (items.length === 0) {
    ratings.innerHTML = empty("Nenhuma avaliação registrada.");
    return;
  }

  ratings.innerHTML = items.map(rating => `
    <div class="admin-item">
      <strong>${rating.rating}/5</strong>
      <span>Usuário: ${escapeHtml(rating.userId)}</span>
      <span>Data: ${new Date(rating.createdAt).toLocaleString("pt-BR")}</span>
    </div>
  `).join("");
}

async function updateTicket(protocol, type, status, assignedTo = null) {
  try {
    const response = await fetch("/api/ticket-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocol, type, status, assignedTo })
    });

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      showToast(err.error || "Não foi possível atualizar o chamado.", "error");
      return;
    }

    showToast(status === "resolvida" ? "Chamado finalizado." : "Chamado assumido.", "success");
    await loadAdmin();
  } catch {
    showToast("Falha de rede ao atualizar chamado.", "error");
  }
}

async function loadConversation(userId) {
  selectedUserId = userId;
  renderConversations();

  try {
    const response = await fetch(`/api/conversations/${encodeURIComponent(userId)}`);

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      replyForm.hidden = true;
      history.classList.add("empty-state");
      history.innerHTML = `<p class="empty">Conversa não encontrada ou indisponível.</p>`;
      showToast("Não foi possível carregar esta conversa.", "error");
      return;
    }

    const conversation = await response.json();

    if (!conversation.messages) {
      history.classList.add("empty-state");
      history.innerHTML = `<p class="empty">Dados da conversa incompletos.</p>`;
      return;
    }

    replyForm.hidden = false;
    replyUserId.value = userId;
    history.classList.remove("empty-state");
    history.innerHTML = conversation.messages.map(message => `
    <div class="history-message ${message.from}">
      <strong>${message.from === "bot" ? "Bot" : message.from === "attendant" ? (message.attendant || "Atendente") : "Cliente"}</strong>
      <p>${escapeHtml(message.text)}</p>
      ${message.attachmentName ? `<span>Anexo: ${escapeHtml(message.attachmentName)}</span>` : ""}
      <time datetime="${escapeHtml(message.at)}">${new Date(message.at).toLocaleString("pt-BR")}</time>
    </div>
  `).join("");
    history.scrollTop = history.scrollHeight;
  } catch {
    showToast("Erro ao carregar histórico.", "error");
  }
}

function render() {
  renderStorageMeta();
  updateMetrics();
  renderTickets();
  renderConversations();
  renderRatings();
}

async function loadAdmin() {
  if (adminShell) adminShell.classList.add("is-loading");
  try {
    const response = await fetch("/api/admin");

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      showToast("Não foi possível carregar o painel.", "error");
      return;
    }

    adminData = await response.json();
    render();
  } catch {
    showToast("Sem conexão ou servidor indisponível.", "error");
  } finally {
    if (adminShell) adminShell.classList.remove("is-loading");
  }
}

tickets.addEventListener("click", event => {
  const button = event.target.closest("button[data-protocol]");

  if (button) {
    if (button.dataset.action === "assume") {
      updateTicket(button.dataset.protocol, button.dataset.type, "em atendimento", replyAttendant.value || "Atendente");
    }

    if (button.dataset.action === "finish") {
      updateTicket(button.dataset.protocol, button.dataset.type, "resolvida", replyAttendant.value || "Atendente");
    }
  }
});

conversations.addEventListener("click", event => {
  const button = event.target.closest("[data-user-id]");

  if (button) {
    loadConversation(button.dataset.userId);
  }
});

function scheduleTicketFilter() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => renderTickets(), 200);
}

search.addEventListener("input", scheduleTicketFilter);
statusFilter.addEventListener("change", renderTickets);

replyForm.addEventListener("submit", async event => {
  event.preventDefault();

  const message = replyMessage.value.trim();
  if (!message) {
    showToast("Digite uma mensagem para enviar.", "error");
    return;
  }

  try {
    const response = await fetch("/api/staff-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: replyUserId.value,
        attendant: replyAttendant.value || "Atendente",
        message
      })
    });

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showToast(data.error || "Não foi possível enviar a resposta.", "error");
      return;
    }

    replyMessage.value = "";
    showToast("Resposta registrada.", "success");
    await loadConversation(replyUserId.value);
    await loadAdmin();
  } catch {
    showToast("Falha de rede ao enviar resposta.", "error");
  }
});

loadAdmin();
setInterval(loadAdmin, 5000);
