const http = require("http");
const { PORT } = require("./src/config");
const { handleRequest } = require("./src/routes");
const { ensureStore } = require("./src/data/store");

ensureStore();

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Chatbox rodando em http://localhost:${PORT}`);
  console.log(`Painel: http://localhost:${PORT}/login.html`);
  console.log(`Webhook WhatsApp: http://localhost:${PORT}/webhook`);
});
