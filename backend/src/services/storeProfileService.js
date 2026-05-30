const storeProfile = {
  name: process.env.STORE_NAME || "BitMobo",
  assistantName: process.env.STORE_ASSISTANT_NAME || "Assistente BitMobo",
  tone: "profissional, claro e acolhedor",
  channels: {
    whatsapp: process.env.STORE_WHATSAPP_LABEL || "WhatsApp oficial",
    email: process.env.STORE_SUPPORT_EMAIL || "suporte@bitmobo.com.br"
  },
  businessHours: {
    label: process.env.STORE_BUSINESS_HOURS || "Segunda a sexta, das 08h as 18h",
    weekdays: [1, 2, 3, 4, 5],
    openHour: 8,
    closeHour: 18
  },
  policies: {
    exchangeReturn: "Trocas e devolucoes podem ser solicitadas com numero do pedido, motivo e comprovantes quando houver.",
    warranty: "Produtos com defeito passam por analise da equipe de suporte.",
    privacy: "Dados pessoais sao usados apenas para localizar pedidos e prestar atendimento."
  },
  supportTopics: [
    { id: "orders", label: "Pedidos", message: "Quero acompanhar meu pedido" },
    { id: "catalog", label: "Produtos", message: "Ver catalogo de produtos" },
    { id: "returns", label: "Trocas", message: "Solicitar troca ou devolucao" },
    { id: "payments", label: "Pagamentos", message: "formas de pagamento" },
    { id: "human", label: "Atendente", message: "Falar com atendente" }
  ],
  escalation: {
    target: "Equipe de atendimento",
    slaOpen: process.env.STORE_SLA_OPEN || "Atendimento humano durante o horario comercial.",
    slaClosed: process.env.STORE_SLA_CLOSED || "Fora do horario comercial, o chamado fica registrado para retorno."
  }
};

function publicStoreProfile() {
  return {
    name: storeProfile.name,
    assistantName: storeProfile.assistantName,
    businessHours: storeProfile.businessHours.label,
    supportTopics: storeProfile.supportTopics,
    channels: storeProfile.channels
  };
}

module.exports = {
  storeProfile,
  publicStoreProfile
};
