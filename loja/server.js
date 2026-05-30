import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerApiRoutes } from "./server/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const distDir = path.join(__dirname, "dist");

const app = express();

registerApiRoutes(app);
app.use(express.static(distDir, { extensions: ["html"] }));

app.get("/", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`BitMobo Loja: http://localhost:${PORT}`);
  console.log(`CHATBOT_URL: ${process.env.CHATBOT_URL || "(nao configurado)"}`);
});
