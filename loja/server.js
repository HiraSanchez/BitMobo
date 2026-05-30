import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { registerApiRoutes } from "./server/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const distDir = path.join(__dirname, "dist");

const app = express();

registerApiRoutes(app);

app.use(express.static(distDir, {
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
      return;
    }

    if (filePath.includes(`${path.sep}assets${path.sep}`)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

app.get("/", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.get("/:page", (req, res, next) => {
  if (req.params.page.includes(".")) {
    next();
    return;
  }

  const file = path.join(distDir, `${req.params.page}.html`);
  if (!fs.existsSync(file)) {
    next();
    return;
  }

  res.sendFile(file);
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || path.extname(req.path)) {
    next();
    return;
  }

  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`BitMobo Loja: http://localhost:${PORT}`);
  console.log(`CHATBOT_URL: ${process.env.CHATBOT_URL || "(nao configurado)"}`);
});
