const { storeProfile } = require("./storeProfileService");

function quickSupportReplies() {
  return storeProfile.supportTopics.map(topic => ({
    label: topic.label,
    message: topic.message
  }));
}

const supportAnswers = {
  SAUDACAO: {
    message: [
      `Ola! Sou o ${storeProfile.assistantName} da ${storeProfile.name}.`,
      "Posso ajudar com pedidos, produtos, pagamentos, trocas, devolucoes, garantia, nota fiscal ou encaminhar para um atendente."
    ].join("\n"),
    quickReplies: quickSupportReplies()
  },
  ENTREGA_PRAZOS: {
    message: [
      "Prazos e frete:",
      "- O prazo final depende do CEP e da transportadora.",
      "- Quando o pedido for enviado, voce pode acompanhar pelo numero do pedido.",
      "- Se preferir, consulte agora em Rastrear pedido.",
      `Horario de atendimento: ${storeProfile.businessHours.label}.`
    ].join("\n"),
    quickReplies: [
      { label: "Rastrear pedido", message: "Quero acompanhar meu pedido" },
      { label: "Falar com atendente", message: "Falar com atendente" }
    ]
  },
  GARANTIA: {
    message: [
      "Garantia:",
      "- Produtos com defeito podem ser analisados pela equipe de suporte.",
      "- Tenha em maos numero do pedido, fotos ou comprovantes.",
      `- Politica atual: ${storeProfile.policies.warranty}`,
      "- Para iniciar, escolha Reclamacao ou Troca/devolucao."
    ].join("\n"),
    quickReplies: [
      { label: "Reclamacao", message: "Quero registrar uma reclamacao" },
      { label: "Troca/devolucao", message: "Solicitar troca ou devolucao" },
      { label: "Atendente", message: "Falar com atendente" }
    ]
  },
  NOTA_FISCAL: {
    message: [
      "Nota fiscal:",
      "- A segunda via pode ser solicitada pelo suporte.",
      "- Informe o numero do pedido e o CPF/CNPJ usado na compra quando falar com a equipe.",
      `Canal de apoio: ${storeProfile.channels.email}.`
    ].join("\n"),
    quickReplies: [
      { label: "Atendente", message: "Falar com atendente" },
      { label: "Rastrear pedido", message: "Quero acompanhar meu pedido" }
    ]
  },
  SEGURANCA_PRIVACIDADE: {
    message: [
      "Privacidade e seguranca:",
      "- Seus dados sao usados apenas para localizar pedidos e prestar atendimento.",
      "- Nunca envie senha, codigo de banco ou dados completos do cartao pelo chat.",
      `Politica: ${storeProfile.policies.privacy}`
    ].join("\n"),
    quickReplies: quickSupportReplies()
  }
};

function answerSupportIntent(intent) {
  return supportAnswers[intent] || null;
}

module.exports = {
  answerSupportIntent,
  quickSupportReplies
};
