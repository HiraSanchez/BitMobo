# Historico do Projeto BitMobo

Este arquivo resume as decisoes e orientacoes principais da conversa com o Codex, para nao depender apenas do historico do chat.

## Objetivo

Criar um projeto profissional com:

- Chatbot inteligente para suporte de uma loja.
- Painel de atendente para acompanhar conversas e chamados.
- Loja online separada chamada BitMobo.
- Deploy publico no Render, acessivel por PC e celular.

## Estrutura Atual

O projeto tem dois servicos:

```text
/
  backend/       Backend do chatbot e painel
  public/        Frontend do chatbot e painel admin
  loja/          Loja BitMobo separada
```

## Chatbot

O chatbot fica na raiz do projeto e roda com:

```bash
npm start
```

Arquivos principais:

```text
backend/server.js
backend/src/routes/index.js
backend/src/services/chatService.js
backend/src/services/intentService.js
backend/src/services/supportService.js
public/index.html
public/app.js
public/styles.css
public/admin.html
public/admin.js
```

## Loja BitMobo

A loja fica em:

```text
loja/
```

Arquivos principais:

```text
loja/index.html
loja/produtos.html
loja/produto.html
loja/carrinho.html
loja/checkout.html
loja/src/js/layout.js
loja/src/js/utils.js
loja/src/data/catalog.json
loja/src/styles/main.css
```

## Imagens Dos Produtos

Coloque as imagens em:

```text
loja/public/produtos/
```

Depois, adicione o caminho no produto dentro de:

```text
loja/src/data/catalog.json
```

Exemplo:

```json
{
  "id": "CPU-R5-5600",
  "name": "AMD Ryzen 5 5600",
  "image": "/produtos/ryzen-5-5600.jpg"
}
```

A loja ja esta preparada para usar automaticamente `image`, `imageUrl` ou `thumbnail`.

## Logo Da Loja

Sugestao de local:

```text
loja/public/logo-bitmobo.png
```

A logo atual ainda aparece como texto `BM` no arquivo:

```text
loja/src/js/layout.js
```

Quando for usar uma imagem real, trocar o bloco da marca nesse arquivo.

## Deploy No Render

Subir dois Web Services.

### 1. Chatbot

Configuracao:

```text
Name: bitmobo-chatbot
Root Directory: vazio
Runtime: Node
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
ADMIN_SESSION=um_texto_grande_aleatorio
VERIFY_TOKEN=um_token_aleatorio
```

Depois de subir, copiar a URL publica do chatbot.

### 2. Loja

Configuracao:

```text
Name: bitmobo-loja
Root Directory: loja
Runtime: Node
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

## Validacoes Feitas

Foram validados:

```bash
npm.cmd test
npm.cmd run build
node --check
```

O build da loja passou e os testes do chatbot passaram.

## Pontos Importantes Antes De Producao Real

Antes de usar com clientes reais:

- Trocar JSON local por banco persistente.
- Limpar dados fake de `backend/data/db.json` e `backend/data/orders.json`.
- Melhorar seguranca do painel admin.
- Validar assinatura/origem do webhook do WhatsApp.
- Integrar login/cadastro da loja com backend real, se forem usados.

