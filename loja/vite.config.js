import { defineConfig, loadEnv } from "vite";
import { resolve } from "path";
import { createApiMiddleware } from "./server/routes.js";

const pages = [
  "index",
  "produtos",
  "produto",
  "carrinho",
  "checkout",
  "login",
  "cadastro",
  "suporte",
  "sobre"
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    root: ".",
    publicDir: "public",
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: Object.fromEntries(
          pages.map(name => [name, resolve(__dirname, `${name}.html`)])
        )
      }
    },
    plugins: [
      {
        name: "bitmobo-api-dev",
        configureServer(server) {
          const mergedEnv = { ...process.env, ...env };
          server.middlewares.use(createApiMiddleware(mergedEnv));
        }
      }
    ],
    server: {
      port: 5173,
      strictPort: true,
      open: "/"
    }
  };
});
