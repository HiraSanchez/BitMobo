import { getCatalog, getPublicConfig } from "./catalogService.js";

export function registerApiRoutes(app, env = process.env) {
  app.get("/api/config", (_req, res) => {
    res.json(getPublicConfig(env));
  });

  app.get("/api/catalog", async (_req, res) => {
    try {
      res.json(await getCatalog(env));
    } catch (error) {
      console.error("[api/catalog]", error.message);
      res.status(502).json({ error: "Nao foi possivel carregar o catalogo." });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "bitmobo-loja" });
  });
}

export function createApiMiddleware(env = process.env) {
  return async function apiMiddleware(req, res, next) {
    const url = req.url?.split("?")[0];

    if (url === "/api/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, service: "bitmobo-loja" }));
      return;
    }

    if (url === "/api/config") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(getPublicConfig(env)));
      return;
    }

    if (url === "/api/catalog") {
      try {
        const catalog = await getCatalog(env);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(catalog));
      } catch (error) {
        console.error("[api/catalog]", error.message);
        res.statusCode = 502;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Nao foi possivel carregar o catalogo." }));
      }
      return;
    }

    next();
  };
}
