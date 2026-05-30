const { VERIFY_TOKEN, ADMIN_USER, ADMIN_PASSWORD, ADMIN_SESSION } = require("../config");
const { readBody, sendJson, sendText, parseCookies, serveStatic, parseJsonBody } = require("../utils/http");
const { updateConversation } = require("../services/chatService");
const { adminPayload, conversationById, conversationMessages, updateTicketStatus, staffReply, exportTicketsCsv } = require("../services/adminService");
const { processWebhook } = require("../services/whatsappService");
const { publicStoreProfile } = require("../services/storeProfileService");

function isAdmin(req) {
  return parseCookies(req).chatbox_session === ADMIN_SESSION;
}

function requireAdmin(req, res) {
  if (isAdmin(req)) {
    return true;
  }

  sendJson(res, 401, { error: "Nao autorizado" });
  return false;
}

async function handleLogin(req, res) {
  const rawBody = await readBody(req);
  const body = parseJsonBody(rawBody, {});

  if (body === null) {
    sendJson(res, 400, { error: "JSON invalido no corpo da requisicao" });
    return;
  }

  if (body.user === ADMIN_USER && body.password === ADMIN_PASSWORD) {
    const secureCookie = process.env.NODE_ENV === "production" || process.env.RENDER ? "; Secure" : "";
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": `chatbox_session=${encodeURIComponent(ADMIN_SESSION)}; Path=/; HttpOnly; SameSite=Lax${secureCookie}`
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  sendJson(res, 401, { error: "Usuario ou senha invalidos" });
}

async function handleApiChat(req, res) {
  const rawBody = await readBody(req);
  const body = parseJsonBody(rawBody, {});

  if (body === null) {
    sendJson(res, 400, { error: "JSON invalido no corpo da requisicao" });
    return;
  }

  sendJson(res, 200, updateConversation(body.userId || "web-simulator", body.message || "", body.attachmentName || null));
}

function handleWebhookVerify(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    sendText(res, 200, challenge);
    return;
  }

  sendText(res, 403, "Token invalido");
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/login") {
      await handleLogin(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleApiChat(req, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/store-profile") {
      sendJson(res, 200, publicStoreProfile());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/messages") {
      sendJson(res, 200, conversationMessages(url.searchParams.get("userId"), url.searchParams.get("after")));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/admin") {
      if (!requireAdmin(req, res)) return;
      sendJson(res, 200, adminPayload());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/export/tickets.csv") {
      if (!requireAdmin(req, res)) return;
      sendText(res, 200, exportTicketsCsv(), "text/csv; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/conversations/")) {
      if (!requireAdmin(req, res)) return;
      const conversation = conversationById(decodeURIComponent(url.pathname.replace("/api/conversations/", "")));
      conversation ? sendJson(res, 200, conversation) : sendJson(res, 404, { error: "Conversa nao encontrada" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ticket-status") {
      if (!requireAdmin(req, res)) return;
      const body = parseJsonBody(await readBody(req), {});
      if (body === null) {
        sendJson(res, 400, { error: "JSON invalido no corpo da requisicao" });
        return;
      }
      const ticket = updateTicketStatus(body);
      ticket ? sendJson(res, 200, ticket) : sendJson(res, 404, { error: "Protocolo nao encontrado" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/staff-reply") {
      if (!requireAdmin(req, res)) return;
      const body = parseJsonBody(await readBody(req), {});
      if (body === null) {
        sendJson(res, 400, { error: "JSON invalido no corpo da requisicao" });
        return;
      }
      const reply = staffReply(body);
      reply ? sendJson(res, 200, reply) : sendJson(res, 400, { error: "Nao foi possivel enviar resposta" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/webhook") {
      handleWebhookVerify(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      const rawWebhook = await readBody(req);
      const webhookBody = parseJsonBody(rawWebhook, {});
      if (webhookBody === null) {
        sendJson(res, 400, { error: "JSON invalido no webhook" });
        return;
      }
      await processWebhook(webhookBody);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: "Metodo nao permitido" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Erro interno do servidor" });
  }
}

module.exports = { handleRequest };
