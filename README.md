# Flip — catálogo com pedidos por WhatsApp

Catálogo responsivo em Vite + React. Produtos, variações, cupons, configurações e pedidos ficam no Supabase; o atendimento e a combinação de pagamento/entrega continuam no WhatsApp, sem checkout online.

## O que está implementado

- Catálogo responsivo com busca, categorias e ordenação.
- Detalhe do produto com galeria, variações, quantidade e relacionados.
- Sacolinha persistente no navegador.
- Pedido em etapas, cupom, entrega, pagamento, observação e resumo.
- Registro seguro do pedido antes do redirecionamento ao WhatsApp.
- Painel administrativo com Auth e papel `app_metadata.role = admin`.
- CRUD de produtos, imagens, variações, categorias, cupons e dados da empresa.
- Acompanhamento e atualização do status dos pedidos.
- Storage público para exibição de fotos, com escrita restrita a administradores.
- Catálogo demonstrativo automático quando o Supabase não está configurado.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sem preencher o `.env.local`, a aplicação abre em modo de demonstração. O painel em `/admin` também fica disponível para aprovação visual, mas com alterações desabilitadas.

Validação completa do frontend:

```bash
npm run check
```

## Conectar o Supabase

1. Crie um projeto Supabase.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`.
3. Instale/atualize a Supabase CLI e confira os comandos disponíveis com `supabase --help`.
4. Vincule o projeto e aplique `supabase/migrations/20260811190000_flip_catalog.sql`.
5. Crie um usuário administrativo no Auth e defina `app_metadata.role` como `admin` pelo Dashboard ou por um ambiente administrativo confiável.
6. Copie `supabase/.env.example` para um arquivo local ignorado pelo Git e preencha os secrets.
7. Publique a Edge Function `submit-order` com `verify_jwt = false`; a própria função valida a publishable key com `@supabase/server`.

A migration já cria:

- tabelas, constraints e índices;
- permissões explícitas para a Data API;
- RLS para público e administradores;
- bucket público `product-images` e políticas de escrita;
- função transacional `create_order`, acessível somente por `service_role`;
- configurações iniciais da Flip.

## Secrets da Edge Function

```dotenv
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Flip <pedidos@seu-dominio.com>
ORDER_NOTIFICATION_EMAIL=pedidos@seu-dominio.com
ALLOWED_ORIGINS=http://localhost:5173,https://seu-dominio.com
```

O domínio usado em `RESEND_FROM_EMAIL` precisa estar verificado no Resend. Nunca exponha secret key, service role ou `RESEND_API_KEY` em variáveis `VITE_*`.

## Fluxo do pedido

1. O navegador envia apenas IDs e quantidades para `submit-order`.
2. A função consulta produtos e variações ativos no banco.
3. Preços, estoque disponível e cupom são validados no servidor.
4. `orders` e `order_items` são gravados em uma única transação.
5. A notificação por e-mail é enviada quando o Resend está configurado.
6. A aplicação monta a mensagem com os valores retornados pelo servidor e abre o WhatsApp.

Assim, preço, desconto e total enviados pelo navegador nunca são tratados como fonte de verdade.

## Estrutura principal

```text
src/
  app/          rotas e layout
  components/   componentes compartilhados
  context/      catálogo e sacolinha
  data/         conteúdo demonstrativo
  pages/        catálogo, produto, pedido, sobre e admin
  services/     consultas públicas e operações administrativas
  utils/        formatação e mensagem do WhatsApp
supabase/
  functions/submit-order/
  migrations/
```

## Antes de publicar

- Cadastre produtos e imagens reais pelo painel.
- Revise WhatsApp, e-mail, endereço, pagamentos e entregas em **Admin → Empresa**.
- Configure `ALLOWED_ORIGINS` somente com os domínios autorizados.
- Teste RLS com usuários anônimo, autenticado comum e administrador.
- Execute os Security/Performance Advisors do Supabase.
- Rode `npm audit` e `npm run check`.
- Configure fallback de SPA no provedor de hospedagem para que `/produto/*`, `/pedido`, `/sobre` e `/admin` retornem `index.html`.

## Publicação em hospedagem estática ou cPanel

Gere o site de produção com:

```bash
npm run build
```

Publique **o conteúdo da pasta `dist`**, e não os arquivos da raiz do projeto. Em uma hospedagem com `public_html`, o arquivo correto deve ficar em `public_html/index.html`, acompanhado pelas pastas e arquivos gerados dentro de `dist`.

Uma verificação rápida: o `index.html` publicado deve carregar `/assets/index-*.js`. Se ele ainda carregar `/src/main.jsx`, o servidor recebeu o código-fonte e a página ficará em branco.

O build inclui um `.htaccess` para que as rotas internas do React retornem ao `index.html` em servidores Apache compatíveis. Também gera `admin/index.html`, `pedido/index.html`, `sobre/index.html` e `404.html`, garantindo as rotas principais em hospedagens que ignoram o `.htaccess`.
# flip
