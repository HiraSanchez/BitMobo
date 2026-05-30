const { readDb, writeDb, getStorageStatus, logEvent } = require("../data/store");
const { csvEscape } = require("../utils/text");

function adminPayload() {
  const db = readDb();
  return {
    storage: getStorageStatus(),
    complaints: db.complaints,
    returns: db.returns,
    ratings: db.ratings,
    staffReplies: db.staffReplies,
    conversations: Object.values(db.conversations).map(conversation => ({
      userId: conversation.userId,
      status: conversation.status,
      step: conversation.step,
      lastIntent: conversation.lastIntent,
      handoffProtocol: conversation.handoffProtocol || null,
      updatedAt: conversation.updatedAt,
      totalMessages: conversation.messages.length
    }))
  };
}

function conversationById(userId) {
  const db = readDb();
  return db.conversations[userId] || null;
}

function conversationMessages(userId, after = 0) {
  const db = readDb();
  const id = String(userId || "").trim();
  const conversation = id ? db.conversations[id] : null;
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
  const totalMessages = messages.length;
  const parsedAfter = Number.parseInt(after, 10);
  const start = Number.isFinite(parsedAfter) ? Math.max(0, Math.min(parsedAfter, totalMessages)) : 0;

  return {
    userId: id,
    status: conversation?.status || null,
    step: conversation?.step || null,
    intent: conversation?.lastIntent || null,
    protocol: conversation?.handoffProtocol || null,
    totalMessages,
    messages: messages.slice(start).map((message, offset) => ({
      index: start + offset + 1,
      from: message.from || "bot",
      text: message.text || "",
      attendant: message.attendant || null,
      attachmentName: message.attachmentName || null,
      at: message.at || conversation?.updatedAt || null
    }))
  };
}

function ticketCollection(db, type) {
  return type === "return" ? db.returns : db.complaints;
}

function updateTicketStatus({ protocol, type, status, assignedTo }) {
  const db = readDb();
  const collection = ticketCollection(db, type);
  const ticket = collection.find(item => item.protocol === protocol);

  if (!ticket) {
    return null;
  }

  ticket.status = status || ticket.status;
  ticket.assignedTo = assignedTo ?? ticket.assignedTo ?? null;
  ticket.updatedAt = new Date().toISOString();
  logEvent("ticket_status_updated", { protocol, type, status: ticket.status, assignedTo: ticket.assignedTo });
  writeDb(db);
  return ticket;
}

function staffReply({ userId, attendant, message }) {
  const db = readDb();
  const conversation = db.conversations[userId];

  if (!conversation || !String(message || "").trim()) {
    return null;
  }

  const reply = {
    userId,
    attendant: attendant || "Atendente",
    message: String(message).trim(),
    createdAt: new Date().toISOString()
  };

  conversation.status = "em atendimento";
  conversation.messages.push({
    from: "attendant",
    text: reply.message,
    attendant: reply.attendant,
    at: reply.createdAt
  });
  conversation.updatedAt = reply.createdAt;
  db.staffReplies.push(reply);
  writeDb(db);
  logEvent("staff_reply", reply);
  return reply;
}

function exportTicketsCsv() {
  const db = readDb();
  const tickets = [
    ...db.complaints.map(item => ({ ...item, ticketLabel: "reclamacao" })),
    ...db.returns.map(item => ({ ...item, ticketLabel: "troca_devolucao" }))
  ];
  const header = ["protocolo", "tipo", "status", "responsavel", "cliente", "telefone", "pedido", "motivo", "criado_em"];
  const rows = tickets.map(ticket => [
    ticket.protocol,
    ticket.ticketLabel,
    ticket.status,
    ticket.assignedTo || "",
    ticket.name || "",
    ticket.phone || "",
    ticket.order || "",
    ticket.reason || "",
    ticket.createdAt || ""
  ]);

  return [header, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");
}

module.exports = {
  adminPayload,
  conversationById,
  conversationMessages,
  updateTicketStatus,
  staffReply,
  exportTicketsCsv
};
