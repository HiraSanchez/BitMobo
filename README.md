# BitMobo - Loja + Chatbot Inteligente

Projeto demonstrativo de uma loja de hardware integrada a um chatbot de suporte ao consumidor. A ideia e apresentar uma experiencia completa: o cliente navega pela loja, cria conta, adiciona produtos ao carrinho, finaliza uma compra simulada e pode acionar um assistente virtual para suporte sobre pedidos, produtos, trocas, pagamentos e atendimento humano.

## Visao Geral

O projeto e dividido em dois servicos independentes:

```text
.
|-- backend/          # Backend do chatbot, painel admin e dados locais
|-- public/           # Interface do chatbot e painel do atendente
|-- loja/             # Loja BitMobo (Vite + Express)
|-- tests/            # Testes do motor de intencoes
|-- render.yaml       # Blueprint Render com chatbot e loja
`-- package.json      # Scripts do chatbot
```

## Funcionalidades

### Loja BitMobo

- Catalogo de produtos de hardware.
- Imagens responsivas dos produtos.
- Busca e filtros por categoria.
- Pagina de detalhe do produto.
- Carrinho local.
- Cadastro e login local para demonstracao.
- Checkout bloqueado para usuario nao logado.
- Geracao de pedido simulado no formato `BM-YYYYMMDD-0000`.
- Botao opcional para falar com o assistente sobre o pedido.

### Chatbot

- Atendimento web com fluxo de conversa.
- Deteccao de intencoes.
- Suporte a pedidos gerados pela loja.
- Consulta de catalogo e produtos.
- Carrinho simples interno do chatbot.
- Fluxo de troca/devolucao.
- Fluxo de reclamacao.
- Handoff para atendente humano com protocolo.
- Sincronizacao das respostas do atendente no chat do cliente.
- Avaliacao de atendimento.
- Painel admin para ver conversas, chamados, respostas e metricas.

## Tecnologias

### Chatbot

- Node.js
- HTTP nativo do Node
- HTML, CSS e JavaScript puro
- Persistencia local em JSON

### Loja

- Node.js
- Express
- Vite
- HTML, CSS e JavaScript modular
- Catalogo em JSON
- Imagens em `loja/public/produtos/`

## Requisitos

- Node.js 20 ou superior
- npm

No Windows, se o PowerShell bloquear `npm`, use `npm.cmd`.

## Como Executar Localmente

Voce precisa rodar o chatbot e a loja em terminais separados.

### 1. Rodar O Chatbot

Na raiz do projeto:

```bash
npm install
npm start
```

Abra:

```text
http://localhost:3000
```

Painel do atendente:

```text
http://localhost:3000/login.html
```

Credenciais locais padrao:

```text
Usuario: admin
Senha: 1234
```

### 2. Rodar A Loja

Em outro terminal:

```bash
cd loja
npm install
npm run dev
```

Abra:

```text
http://localhost:5173
```

## Fluxo De Demonstracao

1. Abra a loja em `http://localhost:5173`.
2. Crie uma conta em **Entrar > Cadastre-se**.
3. Faca login.
4. Escolha um produto.
5. Adicione ao carrinho.
6. Va para o checkout.
7. Confirme o pedido.
8. A loja gera um pedido simulado.
9. Clique em **Falar com assistente**.
10. O chatbot recebe o numero do pedido, os itens e o total aproximado.
11. Teste as opcoes:
    - acompanhar pedido;
    - troca/devolucao;
    - atendente humano.

## Imagens Dos Produtos

As imagens ficam em:

```text
loja/public/produtos/
```

O caminho da imagem e configurado em:

```text
loja/src/data/catalog.json
```

Exemplo:

```json
{
  "id": "CPU-R5-5600",
  "name": "AMD Ryzen 5 5600 6-Core 12-Thread",
  "image": "/produtos/AMD Ryzen 5 5600 6-Core 12-Thread.png"
}
```

A loja aceita os campos:

```text
image
imageUrl
thumbnail
```

Atualmente todos os produtos do catalogo possuem imagem vinculada.

## Catalogo

Existem dois arquivos de catalogo:

```text
loja/src/data/catalog.json
backend/data/catalog.json
```

Eles devem ficar alinhados para que a loja e o chatbot respondam sobre os mesmos produtos.

## Testes E Validacao

### Testar O Chatbot

Na raiz:

```bash
npm test
```

### Build Da Loja

Dentro da pasta `loja`:

```bash
npm run build
```

### Validacoes Ja Realizadas

- Sintaxe dos arquivos JavaScript.
- JSONs principais.
- Testes do motor de intencoes.
- Build da loja.
- Catalogo com 22 produtos.
- 22 produtos com imagem.
- 0 caminhos de imagem quebrados.
- Fluxos principais do chatbot.
- Integracao loja para chatbot via `?msg=`.
- Resposta do atendente aparecendo no chat do cliente.
- Endpoints locais da loja e do chatbot.

## Deploy No Render

O projeto possui um `render.yaml` na raiz com dois Web Services:

- `bitmobo-chatbot`
- `bitmobo-loja`

Voce tambem pode criar os servicos manualmente pelo painel do Render.

### Chatbot No Render

Configuracao:

```text
Root Directory: vazio
Build Command: npm install
Start Command: npm start
```

Variaveis:

```text
NODE_VERSION=20
STORE_NAME=BitMobo
STORE_ASSISTANT_NAME=Assistente BitMobo
STORE_SUPPORT_EMAIL=suporte@bitmobo.com.br
STORE_BUSINESS_HOURS=Segunda a sexta, das 08h as 18h
ADMIN_USER=admin
ADMIN_PASSWORD=crie_uma_senha_forte
ADMIN_SESSION=valor_aleatorio_grande
VERIFY_TOKEN=token_aleatorio
```

### Loja No Render

Configuracao:

```text
Root Directory: loja
Build Command: npm install && npm run build
Start Command: npm start
```

Variaveis:

```text
NODE_VERSION=20
STORE_NAME=BitMobo
STORE_TAGLINE=Hardware para desktops gamer, criadores e estacoes de trabalho
CHATBOT_URL=https://url-publica-do-chatbot.onrender.com
```

Importante:

1. Suba primeiro o chatbot.
2. Copie a URL publica do chatbot.
3. Coloque essa URL em `CHATBOT_URL` no servico da loja.
4. Faca redeploy da loja.

## Rotas Principais

### Chatbot

```text
GET  /
POST /api/chat
POST /api/login
GET  /api/admin
GET  /api/store-profile
GET  /api/messages?userId=USER_ID&after=0
GET  /api/conversations/:userId
POST /api/ticket-status
POST /api/staff-reply
GET  /api/export/tickets.csv
GET  /webhook
POST /webhook
```

### Loja

```text
GET /
GET /produtos.html
GET /produto.html
GET /carrinho.html
GET /checkout.html
GET /login.html
GET /cadastro.html
GET /suporte.html
GET /sobre.html
GET /api/config
GET /api/catalog
GET /api/health
```

## Observacoes Importantes

Este projeto foi preparado para apresentacao e demonstracao academica. Algumas partes sao simuladas de proposito:

- login e cadastro da loja usam `localStorage`;
- pedidos sao simulados no checkout;
- dados do chatbot ficam em JSON local;
- rastreio real de transportadora ainda nao existe;
- pagamento real ainda nao existe;
- webhook do WhatsApp esta preparado, mas nao validado com uma conta Meta real.

Para producao real, os proximos passos seriam:

- banco de dados persistente;
- autenticacao real de usuarios;
- pagamentos;
- estoque real;
- pedidos reais;
- seguranca reforcada no painel admin;
- validacao oficial do webhook WhatsApp;
- API compartilhada entre loja e chatbot.

## Checklist Antes De Apresentar

- Rodar `npm start` na raiz.
- Rodar `npm run dev` dentro de `loja`.
- Abrir a loja em `http://localhost:5173`.
- Abrir o chatbot em `http://localhost:3000`.
- Criar usuario na loja.
- Fazer login.
- Comprar produto.
- Acionar o assistente pelo pedido.
- Abrir painel admin em `http://localhost:3000/login.html`.

## Status

Projeto validado para demonstracao e pronto para deploy demonstrativo no Render.
