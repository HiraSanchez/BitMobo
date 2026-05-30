const { readDb, writeDb, logEvent } = require("../data/store");
const { normalize, digitsOnly, money } = require("../utils/text");
const { detectIntent } = require("./intentService");
const { findOrder } = require("./orderService");
const { formatCatalog, searchProducts, findProduct, productDetails, listCategories } = require("./catalogService");
const { validateName, validatePhone, validateOrder, validateReason, validateRating } = require("./validationService");
const { answerSupportIntent, quickSupportReplies } = require("./supportService");
const { storeProfile } = require("./storeProfileService");

function createProtocol(prefix) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${stamp}-${random}`;
}

function defaultQuickReplies() {
  return quickSupportReplies();
}

function getBusinessStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const hours = storeProfile.businessHours;
  const open = hours.weekdays.includes(day) && hour >= hours.openHour && hour < hours.closeHour;
  return { open, label: open ? "Dentro do horario comercial" : "Fora do horario comercial", hours: hours.label };
}

function menuReply() {
  return [
    `Sou o ${storeProfile.assistantName}. Como posso ajudar?`,
    "- Registrar reclamacao",
    "- Ver catalogo de produtos",
    "- Acompanhar pedido",
    "- Solicitar troca ou devolucao",
    "- Falar com atendente"
  ].join("\n");
}

function getConversation(db, userId) {
  if (!db.conversations[userId]) {
    db.conversations[userId] = {
      userId,
      status: "aguardando cliente",
      step: "MENU",
      failedAttempts: 0,
      messages: [],
      createdAt: new Date().toISOString()
    };
  }
  return db.conversations[userId];
}

function getCart(db, userId) {
  if (!db.carts[userId]) {
    db.carts[userId] = { items: [] };
  }
  return db.carts[userId];
}

function pushMessage(conversation, from, text, extra = {}) {
  conversation.messages.push({ from, text, at: new Date().toISOString(), ...extra });
}

function buildResponse(conversation, message, options = {}) {
  const reply = {
    userId: conversation.userId,
    message,
    intent: options.intent || conversation.lastIntent || "MENU",
    status: conversation.status,
    step: conversation.step,
    closed: conversation.status === "finalizado",
    handoff: conversation.status === "encaminhado" || conversation.status === "em atendimento",
    quickReplies: options.quickReplies ?? defaultQuickReplies(),
    protocol: options.protocol || null,
    catalog: options.catalog || null,
    product: options.product || null,
    cart: options.cart || null,
    customer: options.customer || null,
    confidence: options.confidence ?? null,
    nextBestAction: options.nextBestAction || null
  };

  pushMessage(conversation, "bot", message, { intent: reply.intent, status: reply.status });
  reply.messageCount = conversation.messages.length;
  return reply;
}

function complaintSummary(data, typeLabel) {
  return [
    `Confirme os dados da ${typeLabel}:`,
    `Nome: ${data.name || "Nao informado"}`,
    `Telefone: ${data.phone || "Nao informado"}`,
    `Pedido: ${data.order || "Nao informado"}`,
    `Motivo: ${data.reason || "Nao informado"}`,
    "",
    "1 - Confirmar",
    "2 - Corrigir"
  ].join("\n");
}

function correctionMenu() {
  return "O que deseja corrigir?\n1 - Nome\n2 - Telefone\n3 - Pedido\n4 - Motivo";
}

function saveCustomer(db, userId, data) {
  if (!data?.name && !data?.phone) {
    return;
  }

  db.customers[userId] = {
    userId,
    name: data.name || db.customers[userId]?.name || "",
    phone: data.phone || db.customers[userId]?.phone || "",
    updatedAt: new Date().toISOString()
  };
}

function saveTicket(db, conversation, type) {
  const pending = conversation.pendingTicket;
  const protocol = createProtocol(type === "return" ? "TRC" : "REC");
  const ticket = {
    protocol,
    type: type === "return" ? "troca_devolucao" : "reclamacao",
    status: "aberta",
    createdAt: new Date().toISOString(),
    assignedTo: null,
    ...pending,
    attachmentName: conversation.pendingAttachmentName || null,
    conversationId: conversation.userId
  };

  if (type === "return") {
    db.returns.push(ticket);
  } else {
    db.complaints.push(ticket);
  }

  saveCustomer(db, conversation.userId, pending);
  logEvent("ticket_created", { protocol, type, userId: conversation.userId });
  conversation.pendingTicket = null;
  conversation.pendingAttachmentName = null;
  conversation.step = "WAITING_STAFF";
  conversation.status = "encaminhado";
  return protocol;
}

function createHandoff(conversation, reason) {
  if (!conversation.handoffProtocol) {
    conversation.handoffProtocol = createProtocol("ATD");
    logEvent("handoff_requested", {
      protocol: conversation.handoffProtocol,
      userId: conversation.userId,
      reason
    });
  }

  conversation.step = "WAITING_STAFF";
  conversation.status = "encaminhado";
  return conversation.handoffProtocol;
}

function classifyUrgency(text) {
  const normalized = normalize(text);
  if (["fraude", "cobranca indevida", "golpe", "nao reconheco", "urgente"].some(term => normalized.includes(term))) {
    return "alta";
  }
  if (["quebrado", "danificado", "defeito", "atrasado"].some(term => normalized.includes(term))) {
    return "media";
  }
  return "normal";
}

function parseStoreOrderMessage(text) {
  const raw = String(text || "").trim();
  const normalized = normalize(raw);

  if (!normalized.includes("preciso de ajuda com o pedido") || !normalized.includes("total aproximado")) {
    return null;
  }

  const order = raw.match(/pedido\s+(BM-\d{8}-\d{4})/i)?.[1];

  if (!order) {
    return null;
  }

  const afterOrder = raw.split(/:\s*/).slice(1).join(": ").trim();
  const [itemsPart, totalPart] = afterOrder.split(/\.\s*Total aproximado\s*/i);

  return {
    order,
    items: (itemsPart || "").replace(/\.$/, "").trim(),
    total: (totalPart || "").replace(/\.$/, "").trim()
  };
}

function storeOrderFromText(conversation, text) {
  const raw = String(text || "");
  const order = raw.match(/BM-\d{8}-\d{4}/i)?.[0]?.toUpperCase();

  if (order) {
    const known = conversation.lastStoreOrder?.order === order ? conversation.lastStoreOrder : null;
    return known || { order, items: "", total: "" };
  }

  return conversation.lastStoreOrder || null;
}

function handleStoreOrderMessage(conversation, userMessage) {
  const storeOrder = parseStoreOrderMessage(userMessage);

  if (!storeOrder) {
    return null;
  }

  conversation.lastStoreOrder = storeOrder;
  conversation.step = "MENU";
  conversation.status = "aguardando cliente";
  conversation.lastIntent = "PEDIDO_LOJA";

  return buildResponse(
    conversation,
    [
      `Recebi o resumo do pedido ${storeOrder.order}.`,
      storeOrder.items ? `Itens: ${storeOrder.items}.` : null,
      storeOrder.total ? `Total aproximado: ${storeOrder.total}.` : null,
      "Como posso ajudar com este pedido?"
    ].filter(Boolean).join("\n"),
    {
      intent: "PEDIDO_LOJA",
      nextBestAction: "Escolha o tipo de ajuda para este pedido.",
      quickReplies: [
        { label: "Acompanhar pedido", message: `Quero acompanhar o pedido ${storeOrder.order}` },
        { label: "Troca/devolucao", message: `Solicitar troca ou devolucao do pedido ${storeOrder.order}` },
        { label: "Atendente", message: `Falar com atendente sobre o pedido ${storeOrder.order}` }
      ]
    }
  );
}

function handleStoreOrderAction(conversation, userMessage) {
  const text = normalize(userMessage);
  const storeOrder = storeOrderFromText(conversation, userMessage);

  if (!storeOrder) {
    return null;
  }

  const aboutOrder = text.includes("pedido") || text.includes(normalize(storeOrder.order));

  if (aboutOrder && (text.includes("acompanhar") || text.includes("rastrear") || text.includes("status"))) {
    conversation.step = "MENU";
    conversation.status = "aguardando cliente";
    conversation.lastIntent = "RASTREIO_PEDIDO_LOJA";

    return buildResponse(
      conversation,
      [
        `Pedido ${storeOrder.order}: compra registrada na BitMobo.`,
        "Status: pedido recebido e aguardando separacao.",
        storeOrder.items ? `Itens: ${storeOrder.items}.` : null,
        storeOrder.total ? `Total aproximado: ${storeOrder.total}.` : null,
        "Nesta demonstracao, o rastreio da transportadora seria conectado ao backend real."
      ].filter(Boolean).join("\n"),
      {
        intent: "RASTREIO_PEDIDO_LOJA",
        nextBestAction: "Acompanhe o pedido ou acione suporte humano.",
        quickReplies: [
          { label: "Troca/devolucao", message: `Solicitar troca ou devolucao do pedido ${storeOrder.order}` },
          { label: "Atendente", message: `Falar com atendente sobre o pedido ${storeOrder.order}` },
          { label: "Encerrar", message: "Encerrar" }
        ]
      }
    );
  }

  if (aboutOrder && (text.includes("troca") || text.includes("devolucao") || text.includes("devolver"))) {
    conversation.pendingType = "return";
    conversation.pendingTicket = {
      ...(conversation.pendingTicket || {}),
      type: "return",
      order: storeOrder.order
    };
    conversation.step = "WAITING_TICKET_NAME";
    conversation.status = "aguardando cliente";
    conversation.lastIntent = "TROCA_DEVOLUCAO";

    return buildResponse(
      conversation,
      `Vou abrir uma solicitacao de troca/devolucao para o pedido ${storeOrder.order}. Primeiro, informe seu nome.`,
      { intent: "TROCA_DEVOLUCAO", quickReplies: [] }
    );
  }

  if (aboutOrder && (text.includes("atendente") || text.includes("humano") || text.includes("pessoa"))) {
    const protocol = createHandoff(conversation, `pedido_loja_${storeOrder.order}`);

    return buildResponse(
      conversation,
      `Vou encaminhar o pedido ${storeOrder.order} para a equipe de atendimento.\nProtocolo de atendimento: ${protocol}.`,
      {
        intent: "FALAR_COM_ATENDENTE",
        protocol,
        nextBestAction: "Envie detalhes adicionais enquanto aguarda a equipe.",
        quickReplies: [
          { label: "Encerrar", message: "Encerrar" },
          { label: "Menu", message: "menu" }
        ]
      }
    );
  }

  return null;
}

function formatCart(cart) {
  if (!cart.items.length) {
    return "Seu carrinho esta vazio.";
  }

  const lines = cart.items.map(item => `${item.quantity}x ${item.name} - ${money(item.price * item.quantity)}`);
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return `Carrinho:\n${lines.join("\n")}\nTotal: ${money(total)}`;
}

function addToCart(db, userId, product, quantity = 1) {
  const cart = getCart(db, userId);
  const existing = cart.items.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ id: product.id, name: product.name, price: product.price, quantity });
  }

  return cart;
}

function productCodeFromMessage(message, conversation) {
  const direct = String(message || "").match(/[A-Z]{2,5}-[A-Z0-9]+(?:-[A-Z0-9]+)*/i)?.[0];
  return direct || conversation.lastProductId;
}

function handleTicketStep(conversation, userMessage, db, type) {
  const text = userMessage.trim();
  const typeLabel = type === "return" ? "troca/devolucao" : "reclamacao";

  if (conversation.step === "WAITING_TICKET_NAME") {
    if (!validateName(text)) {
      return buildResponse(conversation, "Informe um nome com pelo menos 2 caracteres.", { intent: conversation.lastIntent, quickReplies: [] });
    }
    conversation.pendingTicket = { ...(conversation.pendingTicket || {}), type, name: text };
    conversation.step = "WAITING_TICKET_PHONE";
    return buildResponse(conversation, "Agora informe seu telefone com DDD.", { intent: conversation.lastIntent, quickReplies: [] });
  }

  if (conversation.step === "WAITING_TICKET_PHONE") {
    if (!validatePhone(text)) {
      return buildResponse(conversation, "Telefone invalido. Digite DDD + numero, por exemplo 31999999999.", { intent: conversation.lastIntent, quickReplies: [] });
    }
    conversation.pendingTicket.phone = digitsOnly(text);
    if (conversation.pendingTicket.order) {
      conversation.step = "WAITING_TICKET_REASON";
      return buildResponse(conversation, `Pedido ${conversation.pendingTicket.order} identificado. Descreva o motivo com pelo menos 10 caracteres.`, { intent: conversation.lastIntent, quickReplies: [] });
    }
    conversation.step = "WAITING_TICKET_ORDER";
    return buildResponse(conversation, "Informe o numero do pedido.", { intent: conversation.lastIntent, quickReplies: [] });
  }

  if (conversation.step === "WAITING_TICKET_ORDER") {
    if (!validateOrder(text)) {
      return buildResponse(conversation, "Pedido invalido. Digite apenas numeros, com pelo menos 3 digitos.", { intent: conversation.lastIntent, quickReplies: [] });
    }
    conversation.pendingTicket.order = /^BM-\d{8}-\d{4}$/i.test(text) ? text.toUpperCase() : digitsOnly(text);
    conversation.step = "WAITING_TICKET_REASON";
    return buildResponse(conversation, "Descreva o motivo com pelo menos 10 caracteres. Se tiver imagem, use o botao de anexar comprovante.", { intent: conversation.lastIntent, quickReplies: [] });
  }

  if (conversation.step === "WAITING_TICKET_REASON") {
    if (!validateReason(text)) {
      return buildResponse(conversation, "Descreva melhor o motivo. Use pelo menos 10 caracteres.", { intent: conversation.lastIntent, quickReplies: [] });
    }
    conversation.pendingTicket.reason = text;
    conversation.step = "CONFIRMING_TICKET";
    return buildResponse(conversation, complaintSummary(conversation.pendingTicket, typeLabel), {
      intent: conversation.lastIntent,
      quickReplies: [
        { label: "Confirmar", message: "1" },
        { label: "Corrigir", message: "2" }
      ]
    });
  }

  if (conversation.step === "CONFIRMING_TICKET") {
    if (normalize(text) === "1" || normalize(text).includes("confirm")) {
      conversation.pendingTicket.urgency = classifyUrgency(conversation.pendingTicket.reason || "");
      const protocol = saveTicket(db, conversation, type);
      return buildResponse(conversation, `Chamado registrado. Protocolo: ${protocol}.\nA equipe recebeu os dados e podera acompanhar o historico completo pelo painel.`, {
        intent: conversation.lastIntent,
        protocol,
        nextBestAction: "Aguardar retorno da equipe ou enviar novas informacoes nesta conversa.",
        quickReplies: [
          { label: "Encerrar", message: "Encerrar" },
          { label: "Menu", message: "menu" }
        ]
      });
    }

    if (normalize(text) === "2" || normalize(text).includes("corrigir")) {
      conversation.step = "CHOOSING_CORRECTION";
      return buildResponse(conversation, correctionMenu(), {
        intent: conversation.lastIntent,
        quickReplies: [
          { label: "Nome", message: "1" },
          { label: "Telefone", message: "2" },
          { label: "Pedido", message: "3" },
          { label: "Motivo", message: "4" }
        ]
      });
    }

    return buildResponse(conversation, "Digite 1 para confirmar ou 2 para corrigir.", {
      intent: conversation.lastIntent,
      quickReplies: [
        { label: "Confirmar", message: "1" },
        { label: "Corrigir", message: "2" }
      ]
    });
  }

  if (conversation.step === "CHOOSING_CORRECTION") {
    const correction = { "1": "name", "2": "phone", "3": "order", "4": "reason" }[normalize(text)];

    if (!correction) {
      return buildResponse(conversation, correctionMenu(), { intent: conversation.lastIntent });
    }

    conversation.correctionField = correction;
    conversation.step = "WAITING_CORRECTION_VALUE";
    return buildResponse(conversation, "Digite o novo valor.", { intent: conversation.lastIntent, quickReplies: [] });
  }

  if (conversation.step === "WAITING_CORRECTION_VALUE") {
    const field = conversation.correctionField;
    const validators = { name: validateName, phone: validatePhone, order: validateOrder, reason: validateReason };

    if (!validators[field](text)) {
      return buildResponse(conversation, "Valor invalido. Digite novamente.", { intent: conversation.lastIntent, quickReplies: [] });
    }

    if (field === "phone") {
      conversation.pendingTicket[field] = digitsOnly(text);
    } else if (field === "order") {
      conversation.pendingTicket[field] = /^BM-\d{8}-\d{4}$/i.test(text) ? text.toUpperCase() : digitsOnly(text);
    } else {
      conversation.pendingTicket[field] = text;
    }
    conversation.correctionField = null;
    conversation.step = "CONFIRMING_TICKET";
    return buildResponse(conversation, complaintSummary(conversation.pendingTicket, typeLabel), {
      intent: conversation.lastIntent,
      quickReplies: [
        { label: "Confirmar", message: "1" },
        { label: "Corrigir", message: "2" }
      ]
    });
  }

  return null;
}

function handleStep(conversation, userMessage, db) {
  const text = userMessage.trim();

  if (["WAITING_TICKET_NAME", "WAITING_TICKET_PHONE", "WAITING_TICKET_ORDER", "WAITING_TICKET_REASON", "CONFIRMING_TICKET", "CHOOSING_CORRECTION", "WAITING_CORRECTION_VALUE"].includes(conversation.step)) {
    return handleTicketStep(conversation, userMessage, db, conversation.pendingTicket?.type || conversation.pendingType || "complaint");
  }

  if (conversation.step === "WAITING_ORDER_TRACKING") {
    const orderNumber = text.match(/\d+/)?.[0];
    const order = orderNumber ? findOrder(orderNumber) : null;
    conversation.step = "MENU";
    conversation.status = "aguardando cliente";

    if (!order) {
      return buildResponse(conversation, "Nao encontrei esse pedido. Confira o numero ou fale com um atendente.", { intent: "RASTREIO_PEDIDO" });
    }

    return buildResponse(conversation, `Pedido ${order.number}: ${order.status}. ${order.tracking}.`, { intent: "RASTREIO_PEDIDO" });
  }

  if (conversation.step === "WAITING_CATALOG_QUERY") {
    const categoryText = formatCatalog(text);
    const products = searchProducts(text);
    conversation.step = "MENU";

    if (!products.length && categoryText.startsWith("Nao encontrei")) {
      return buildResponse(conversation, "Nao encontrei produto com esse nome. Tente outro termo ou escolha uma categoria.", { intent: "BUSCA_PRODUTO" });
    }

    if (!products.length) {
      return buildResponse(conversation, categoryText, { intent: "CATALOGO", catalog: true });
    }

    const first = products[0];
    conversation.lastProductId = first.id;
    return buildResponse(conversation, `Encontrei:\n${products.map(product => `${product.id} - ${product.name}: ${money(product.price)} - ${product.stock} em estoque`).join("\n")}\n\nDigite o codigo do produto para ver detalhes.`, {
      intent: "BUSCA_PRODUTO",
      quickReplies: products.slice(0, 3).map(product => ({ label: product.id, message: product.id }))
    });
  }

  if (conversation.step === "WAITING_RATING") {
    const rating = validateRating(text);

    if (!rating) {
      return buildResponse(conversation, "Digite uma nota de 1 a 5 para finalizar.", {
        intent: "AVALIACAO",
        quickReplies: ["1", "2", "3", "4", "5"].map(value => ({ label: value, message: value }))
      });
    }

    db.ratings.push({ userId: conversation.userId, rating, createdAt: new Date().toISOString() });
    conversation.step = "MENU";
    conversation.status = "finalizado";
    return buildResponse(conversation, `Obrigado pela avaliacao ${rating}/5. Atendimento finalizado.`, {
      intent: "AVALIACAO",
      quickReplies: [{ label: "Novo atendimento", message: "menu" }]
    });
  }

  if (conversation.step === "WAITING_STAFF") {
    if (normalize(text) === "menu" || normalize(text).includes("voltar")) {
      conversation.step = "MENU";
      conversation.status = "aguardando cliente";
      return buildResponse(conversation, menuReply(), { intent: "MENU", quickReplies: defaultQuickReplies() });
    }

    if (normalize(text).includes("encerrar") || normalize(text).includes("finalizar")) {
      conversation.step = "WAITING_RATING";
      return buildResponse(conversation, "Antes de encerrar, avalie este atendimento de 1 a 5.", {
        intent: "ENCERRAR",
        quickReplies: ["1", "2", "3", "4", "5"].map(value => ({ label: value, message: value }))
      });
    }

    return buildResponse(conversation, "Sua mensagem foi adicionada ao atendimento. A equipe consegue acompanhar o historico completo no painel.", {
      intent: "FILA_ATENDIMENTO",
      protocol: conversation.handoffProtocol || null,
      quickReplies: [
        { label: "Encerrar", message: "Encerrar" },
        { label: "Menu", message: "menu" }
      ]
    });
  }

  return null;
}

function answerByIntent(conversation, userMessage, db) {
  const intent = detectIntent(userMessage);
  conversation.lastIntent = intent;
  const business = getBusinessStatus();
  const supportAnswer = answerSupportIntent(intent);

  if (intent !== "DESCONHECIDO") {
    conversation.failedAttempts = 0;
  }

  if (supportAnswer) {
    conversation.step = "MENU";
    conversation.status = "aguardando cliente";
    return buildResponse(conversation, supportAnswer.message, {
      intent,
      nextBestAction: "Escolha uma opcao rapida ou descreva o que aconteceu.",
      quickReplies: supportAnswer.quickReplies || quickSupportReplies()
    });
  }

  switch (intent) {
    case "RECLAMACAO":
      conversation.pendingType = "complaint";
      conversation.step = "WAITING_TICKET_NAME";
      conversation.status = "aguardando cliente";
      return buildResponse(conversation, "Vou registrar sua reclamacao. Primeiro, informe seu nome.", { intent, quickReplies: [] });

    case "TROCA_DEVOLUCAO":
      conversation.pendingType = "return";
      conversation.step = "WAITING_TICKET_NAME";
      conversation.status = "aguardando cliente";
      return buildResponse(conversation, "Vou abrir uma solicitacao de troca/devolucao. Primeiro, informe seu nome.", { intent, quickReplies: [] });

    case "CATALOGO":
      conversation.step = "WAITING_CATALOG_QUERY";
      conversation.status = "aguardando cliente";
      const categoryReplies = listCategories()
        .slice(0, 4)
        .map(category => ({ label: category.name, message: category.name }));
      return buildResponse(conversation, formatCatalog(), {
        intent,
        catalog: true,
        quickReplies: [
          ...categoryReplies,
          { label: "Buscar produto", message: "Quero buscar um produto" }
        ]
      });

    case "BUSCA_PRODUTO": {
      const products = searchProducts(userMessage);
      if (!products.length) {
        conversation.step = "WAITING_CATALOG_QUERY";
        return buildResponse(conversation, "Qual produto voce procura?", { intent, quickReplies: [] });
      }
      const first = products[0];
      conversation.lastProductId = first.id;
      return buildResponse(conversation, `Encontrei ${first.name} - ${money(first.price)} - ${first.stock} em estoque.\nDigite ${first.id} para ver detalhes.`, {
        intent,
        product: first,
        quickReplies: [{ label: first.id, message: first.id }, { label: "Adicionar", message: `quero esse produto ${first.id}` }]
      });
    }

    case "PRODUTO_DETALHE": {
      const code = productCodeFromMessage(userMessage, conversation);
      const product = findProduct(code);
      if (!product) {
        return buildResponse(conversation, "Nao encontrei esse produto.", { intent });
      }
      conversation.lastProductId = product.id;
      return buildResponse(conversation, productDetails(product), {
        intent,
        product,
        quickReplies: [
          { label: "Quero esse produto", message: `quero esse produto ${product.id}` },
          { label: "Ver carrinho", message: "carrinho" }
        ]
      });
    }

    case "CARRINHO": {
      const code = productCodeFromMessage(userMessage, conversation);
      const shouldAdd = normalize(userMessage).includes("quero esse produto");
      const product = shouldAdd ? findProduct(code) : null;
      let cart = getCart(db, conversation.userId);

      if (product) {
        cart = addToCart(db, conversation.userId, product, 1);
      }

      return buildResponse(conversation, `${product ? "Produto adicionado ao carrinho.\n" : ""}${formatCart(cart)}`, {
        intent,
        cart,
        quickReplies: [
          { label: "Ver catalogo", message: "Ver catalogo de produtos" },
          { label: "Finalizar", message: "Falar com atendente" }
        ]
      });
    }

    case "RASTREIO_PEDIDO":
      conversation.step = "WAITING_ORDER_TRACKING";
      conversation.status = "aguardando cliente";
      return buildResponse(conversation, "Informe o numero do pedido para consultar o rastreio.", { intent, quickReplies: [] });

    case "FORMAS_PAGAMENTO":
      conversation.step = "MENU";
      return buildResponse(conversation, "Aceitamos Pix, cartao de credito, cartao de debito e boleto. Parcelamento em ate 3x sem juros. Nunca envie dados completos do cartao pelo chat.", { intent });

    case "HORARIO_FUNCIONAMENTO":
      conversation.step = "MENU";
      return buildResponse(conversation, `${business.hours}. Status agora: ${business.label}.`, { intent });

    case "ENDERECO":
      conversation.step = "MENU";
      return buildResponse(conversation, "Endereco: Avenida Principal, 1000, Centro. Retirada na loja disponivel em horario comercial.", { intent });

    case "FALAR_COM_ATENDENTE":
      const protocol = createHandoff(conversation, "cliente_solicitou_atendente");
      return buildResponse(conversation, `${business.open ? storeProfile.escalation.slaOpen : storeProfile.escalation.slaClosed}\nProtocolo de atendimento: ${protocol}.`, {
        intent,
        protocol,
        nextBestAction: "Envie detalhes adicionais enquanto aguarda a equipe.",
        quickReplies: [
          { label: "Encerrar", message: "Encerrar" },
          { label: "Menu", message: "menu" }
        ]
      });

    case "ENCERRAR":
      conversation.step = "WAITING_RATING";
      return buildResponse(conversation, "Antes de encerrar, avalie este atendimento de 1 a 5.", {
        intent,
        quickReplies: ["1", "2", "3", "4", "5"].map(value => ({ label: value, message: value }))
      });

    default:
      conversation.failedAttempts += 1;
      if (conversation.failedAttempts >= 2) {
        const protocol = createHandoff(conversation, "fallback_baixa_confianca");
        return buildResponse(conversation, `Nao consegui entender com seguranca. Vou encaminhar para um atendente.\nProtocolo de atendimento: ${protocol}.`, {
          intent: "FALLBACK_ATENDENTE",
          protocol,
          quickReplies: [
            { label: "Encerrar", message: "Encerrar" },
            { label: "Menu", message: "menu" }
          ]
        });
      }
      conversation.step = "MENU";
      return buildResponse(conversation, menuReply(), { intent: "MENU" });
  }
}

function updateConversation(userId, userMessage, attachmentName = null) {
  const db = readDb();
  const conversation = getConversation(db, userId);
  const customer = db.customers[userId];

  if (conversation.status === "finalizado" && normalize(userMessage) !== "menu") {
    conversation.status = "aguardando cliente";
    conversation.step = "MENU";
    conversation.failedAttempts = 0;
  }

  if (!conversation.greetedReturningCustomer && customer?.name) {
    conversation.greetedReturningCustomer = true;
    pushMessage(conversation, "bot", `Oi ${customer.name}, quer continuar seu ultimo atendimento?`);
  }

  if (attachmentName) {
    conversation.pendingAttachmentName = attachmentName;
  }

  pushMessage(conversation, "user", userMessage || "[anexo enviado]", { attachmentName });

  const response = handleStoreOrderMessage(conversation, userMessage) || handleStoreOrderAction(conversation, userMessage) || handleStep(conversation, userMessage, db) || answerByIntent(conversation, userMessage, db);
  response.customer = customer || null;

  conversation.updatedAt = new Date().toISOString();
  db.conversations[userId] = conversation;
  writeDb(db);
  return response;
}

module.exports = { updateConversation, getCart, formatCart };
