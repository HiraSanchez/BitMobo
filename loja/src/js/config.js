let configCache = null;

export async function loadAppConfig() {
  if (configCache) return configCache;

  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("Config indisponivel");

  configCache = await response.json();
  return configCache;
}

export async function getChatbotUrl() {
  const config = await loadAppConfig();
  return (config.chatbotUrl || "").trim();
}

export function isChatbotConfigured(url) {
  return Boolean(url && url !== "#" && !url.startsWith("javascript:"));
}
