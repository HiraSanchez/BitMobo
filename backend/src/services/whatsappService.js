const { updateConversation } = require("./chatService");

function extractWhatsAppText(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  if (!message) {
    return null;
  }

  return {
    from: message.from,
    text: message.text?.body || ""
  };
}

async function sendWhatsAppMessage(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";

  if (!token || !phoneNumberId) {
    console.log("[WhatsApp simulado]", { to, text });
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });

  if (!response.ok) {
    console.error("Erro ao enviar WhatsApp:", response.status, await response.text());
  }
}

async function processWebhook(payload) {
  const incoming = extractWhatsAppText(payload);

  if (!incoming) {
    return false;
  }

  const result = updateConversation(incoming.from, incoming.text);
  await sendWhatsAppMessage(incoming.from, result.message);
  return true;
}

module.exports = { processWebhook };
