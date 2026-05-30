import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, "../src/data/catalog.json");

let mockCatalog = null;

function loadMockCatalog() {
  if (!mockCatalog) {
    mockCatalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  }
  return mockCatalog;
}

export function getPublicConfig(env = process.env) {
  const localChatbotUrl = env.RENDER ? "" : "http://localhost:3000";

  return {
    storeName: env.STORE_NAME || "BitMobo",
    storeTagline:
      env.STORE_TAGLINE ||
      "Hardware para desktops gamer, criadores e estacoes de trabalho",
    chatbotUrl: env.CHATBOT_URL || localChatbotUrl,
    apiBaseUrl: env.API_BASE_URL || "",
    catalogSource: env.API_BASE_URL ? "remote" : "mock"
  };
}

export async function getCatalog(env = process.env) {
  const apiBase = (env.API_BASE_URL || "").replace(/\/$/, "");

  if (apiBase) {
    const response = await fetch(`${apiBase}/catalog`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`API remota respondeu ${response.status}`);
    }

    return response.json();
  }

  return loadMockCatalog();
}
