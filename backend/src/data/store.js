const fs = require("fs");
const { spawnSync } = require("child_process");
const { DATA_DIR, DB_FILE, CATALOG_FILE, ORDERS_FILE, SQLITE_FILE, LOG_FILE } = require("../config");

function sqliteAvailable() {
  const result = spawnSync("sqlite3", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

const mode = sqliteAvailable() ? "sqlite" : "json-fallback";

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function defaultDb() {
  return {
    conversations: {},
    complaints: [],
    returns: [],
    ratings: [],
    customers: {},
    carts: {},
    staffReplies: []
  };
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    writeJson(DB_FILE, defaultDb());
  }

  const db = { ...defaultDb(), ...readJson(DB_FILE, defaultDb()) };
  writeJson(DB_FILE, db);

  if (!fs.existsSync(CATALOG_FILE)) {
    writeJson(CATALOG_FILE, {
      store: {
        name: "BitMobo",
        tagline: "Componentes para desktop gamer, criadores e estacoes de trabalho",
        currency: "BRL"
      },
      categories: [
        { id: "processadores", name: "Processadores", products: [] },
        { id: "placas-mae", name: "Placas-mae", products: [] },
        { id: "placas-video", name: "Placas de video", products: [] }
      ]
    });
  }

  if (!fs.existsSync(ORDERS_FILE)) {
    writeJson(ORDERS_FILE, {
      orders: [
        { number: "1001", customer: "Cliente Teste", status: "Separando pedido", tracking: "Aguardando coleta da transportadora" },
        { number: "1002", customer: "Cliente Teste", status: "Enviado", tracking: "Saiu para entrega" },
        { number: "1003", customer: "Cliente Teste", status: "Entregue", tracking: "Pedido entregue em 03/05/2026" }
      ]
    });
  }

  if (mode === "sqlite") {
    spawnSync("sqlite3", [SQLITE_FILE, ".databases"], { encoding: "utf8" });
  }
}

function readDb() {
  return { ...defaultDb(), ...readJson(DB_FILE, defaultDb()) };
}

function writeDb(db) {
  writeJson(DB_FILE, { ...defaultDb(), ...db });
}

function readCatalog() {
  return readJson(CATALOG_FILE, { categories: [] });
}

function readOrders() {
  return readJson(ORDERS_FILE, { orders: [] });
}

function logEvent(type, data) {
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify({ type, at: new Date().toISOString(), data }) + "\n");
  } catch (err) {
    console.error("[logEvent]", err.message);
  }
}

function getStorageStatus() {
  return {
    mode,
    sqliteFile: SQLITE_FILE,
    note: mode === "sqlite"
      ? "SQLite disponivel no sistema."
      : "sqlite3 nao esta instalado; usando fallback JSON com a mesma interface de dados."
  };
}

module.exports = {
  ensureStore,
  readDb,
  writeDb,
  readCatalog,
  readOrders,
  logEvent,
  getStorageStatus
};
