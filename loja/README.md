# BitMobo — Loja (projeto independente)

Loja online de componentes para PC desktop (placas-mae, CPU, RAM, GPU, SSD, fontes, gabinetes e perifericos). **Deploy separado** do chatbot — integracao apenas via URL e API futura.

## Scripts

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Desenvolvimento com Vite (porta 5173) + API local |
| `npm run build` | Gera pasta `dist/` para producao |
| `npm start` | Servidor Node (Render) — arquivos estaticos + `/api/*` |

## Variaveis de ambiente

Copie `.env.example` para `.env`:

```env
PORT=4173
CHATBOT_URL=https://seu-chatbot.onrender.com
STORE_NAME=BitMobo
API_BASE_URL=
```

| Variavel | Uso |
|----------|-----|
| `CHATBOT_URL` | URL do botao **Fale com o assistente** (obrigatoria em producao) |
| `API_BASE_URL` | Quando existir backend real, ex: `https://api.bitmobo.com.br` |
| `STORE_NAME` | Nome exibido no header e rodape |

## Paginas

- `/` — Home
- `/produtos.html` — Catalogo, categorias e busca
- `/produto.html?id=SKU` — Detalhe do produto
- `/carrinho.html` — Carrinho (localStorage)
- `/checkout.html` — Checkout visual
- `/login.html` / `/cadastro.html` — Conta (visual, pronto para API)
- `/suporte.html` — FAQ e link do assistente
- `/sobre.html` — Institucional

## API local (preparada para integracao)

| Rota | Resposta |
|------|----------|
| `GET /api/health` | Status do servico |
| `GET /api/config` | `chatbotUrl`, `storeName`, `apiBaseUrl`, `catalogSource` |
| `GET /api/catalog` | JSON mock em `src/data/catalog.json` ou proxy se `API_BASE_URL` |

O frontend usa `src/js/api.js` — ao apontar `API_BASE_URL`, o catalogo passa a vir do servidor remoto sem alterar as paginas.

## Deploy no Render

1. Crie um **Web Service** com **Root Directory** = `loja` (se o repo for o monorepo).
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Defina `CHATBOT_URL` com a URL publica do outro servico (chatbot).

Ou use o `render.yaml` desta pasta com Blueprint.

## Desenvolvimento local

```bash
cd loja
cp .env.example .env
# Edite CHATBOT_URL=http://localhost:3000
npm install
npm run dev
```

Abra http://localhost:5173

Producao local apos build:

```bash
npm run build
npm start
# http://localhost:4173
```

## Relacao com o chatbot

- **Sem acoplamento de codigo** — projetos separados no mesmo repositorio.
- O chatbot pode manter seu proprio `catalog.json`; quando unificar dados, use `API_BASE_URL` na loja ou exponha `GET /catalog` no backend real.
- Checkout pode abrir o assistente com resumo do carrinho via `CHATBOT_URL?msg=...`
