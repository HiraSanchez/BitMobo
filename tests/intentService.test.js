const assert = require("assert");
const { detectIntent, detectIntentDetails } = require("../backend/src/services/intentService");
const { answerSupportIntent } = require("../backend/src/services/supportService");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("encaminha pedido explicito de atendente para suporte humano", () => {
  assert.strictEqual(detectIntent("Falar com atendente"), "FALAR_COM_ATENDENTE");
  assert.strictEqual(detectIntent("Quero falar com atendente"), "FALAR_COM_ATENDENTE");
});

test("mantem horario separado de atendente", () => {
  assert.strictEqual(detectIntent("qual o horario de funcionamento?"), "HORARIO_FUNCIONAMENTO");
});

test("detecta rastreio quando cliente fala de acompanhar pedido", () => {
  assert.strictEqual(detectIntent("quero acompanhar meu pedido"), "RASTREIO_PEDIDO");
});

test("detecta topicos de base de conhecimento", () => {
  assert.strictEqual(detectIntent("qual o prazo de entrega?"), "ENTREGA_PRAZOS");
  assert.strictEqual(detectIntent("preciso da segunda via da nota fiscal"), "NOTA_FISCAL");
  assert.strictEqual(detectIntent("como funciona a garantia?"), "GARANTIA");
});

test("retorna detalhes com confianca para auditoria futura", () => {
  const result = detectIntentDetails("meu produto veio quebrado");
  assert.strictEqual(result.intent, "RECLAMACAO");
  assert.ok(result.confidence > 0);
});

test("reconhece codigos reais dos produtos BitMobo", () => {
  assert.strictEqual(detectIntent("CPU-R5-5600"), "PRODUTO_DETALHE");
  assert.strictEqual(detectIntent("GPU-4070S"), "PRODUTO_DETALHE");
});

test("base de conhecimento possui resposta pronta", () => {
  const answer = answerSupportIntent("ENTREGA_PRAZOS");
  assert.ok(answer.message.includes("Prazos e frete"));
  assert.ok(answer.quickReplies.length >= 1);
});
