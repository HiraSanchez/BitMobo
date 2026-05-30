const { normalize } = require("../utils/text");

const intents = {
  FALAR_COM_ATENDENTE: ["atendente", "humano", "pessoa", "equipe", "falar com alguem", "suporte humano", "consultor"],
  RECLAMACAO: ["reclam", "problema", "ruim", "defeito", "quebrado", "danificado", "veio errado", "insatisfeito"],
  CATALOGO: ["catalogo", "comprar", "produto", "preco", "loja", "oferta", "promocao", "gostei", "quero ver"],
  RASTREIO_PEDIDO: ["rastrear", "rastreio", "status do pedido", "acompanhar pedido", "codigo de rastreio", "meu pedido", "chegou"],
  TROCA_DEVOLUCAO: ["troca", "devolucao", "devolver", "cancelar pedido", "arrependi", "reembolso", "estorno"],
  FORMAS_PAGAMENTO: ["pagamento", "pix", "cartao", "boleto", "parcelar", "parcela"],
  HORARIO_FUNCIONAMENTO: ["horario", "abre", "fecha", "funcionamento", "expediente"],
  ENDERECO: ["endereco", "localizacao", "onde fica", "loja fisica", "retirar"],
  ENCERRAR: ["encerrar", "finalizar", "sair", "nao quero", "nada", "obrigado", "obrigada", "tchau"],
  CARRINHO: ["carrinho", "sacola", "total"],
  AVALIACAO: ["avaliar", "nota", "estrela"],
  SAUDACAO: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "hey", "menu", "inicio"],
  ENTREGA_PRAZOS: ["prazo", "frete", "prazo de entrega", "quanto tempo", "retirada", "entregar"],
  GARANTIA: ["garantia", "assistencia", "defeito depois", "conserto"],
  NOTA_FISCAL: ["nota fiscal", "nf", "segunda via", "comprovante fiscal"],
  SEGURANCA_PRIVACIDADE: ["privacidade", "dados", "seguranca", "lgpd"]
};

const priority = [
  "FALAR_COM_ATENDENTE",
  "RECLAMACAO",
  "TROCA_DEVOLUCAO",
  "RASTREIO_PEDIDO",
  "CATALOGO",
  "FORMAS_PAGAMENTO",
  "HORARIO_FUNCIONAMENTO",
  "ENDERECO",
  "ENTREGA_PRAZOS",
  "GARANTIA",
  "NOTA_FISCAL",
  "SEGURANCA_PRIVACIDADE",
  "ENCERRAR",
  "CARRINHO",
  "AVALIACAO",
  "SAUDACAO"
];

function termScore(text, term) {
  if (text === term) return 10;
  if (text.startsWith(`${term} `) || text.endsWith(` ${term}`)) return 6;
  if (text.includes(term)) return term.includes(" ") ? 5 : 3;
  return 0;
}

function detectIntentDetails(message) {
  const text = normalize(message);

  if (/^[1-5]$/.test(text)) {
    const intent = { "1": "RECLAMACAO", "2": "CATALOGO", "3": "RASTREIO_PEDIDO", "4": "TROCA_DEVOLUCAO", "5": "ENCERRAR" }[text];
    return { intent, confidence: 1, matched: text };
  }

  if (text.startsWith("tem ") || text.startsWith("buscar ") || text.startsWith("procuro ") || text.startsWith("quero comprar ")) {
    return { intent: "BUSCA_PRODUTO", confidence: 0.9, matched: text.split(" ")[0] };
  }

  if (text.startsWith("quero esse produto")) {
    return { intent: "CARRINHO", confidence: 1, matched: "quero esse produto" };
  }

  if (/^p\d{3}$/i.test(text) || /^[a-z]{2,5}-[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(text)) {
    return { intent: "PRODUTO_DETALHE", confidence: 1, matched: text };
  }

  let best = { intent: "DESCONHECIDO", score: 0, matched: null };

  for (const intent of priority) {
    for (const term of intents[intent] || []) {
      const score = termScore(text, normalize(term));
      if (score > best.score) {
        best = { intent, score, matched: term };
      }
    }
  }

  if (best.score === 0) {
    return { intent: "DESCONHECIDO", confidence: 0, matched: null };
  }

  return {
    intent: best.intent,
    confidence: Math.min(0.95, best.score / 10),
    matched: best.matched
  };
}

function detectIntent(message) {
  return detectIntentDetails(message).intent;
}

module.exports = { detectIntent, detectIntentDetails };
