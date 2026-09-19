// Gera, depois do build, o HTML pronto de cada página pública (com título,
// descrição, canonical, dados estruturados e o conteúdo visível sem JavaScript),
// além de sitemap.xml, robots.txt e llms.txt.
//
// Buscadores e assistentes de IA passam a ler o conteúdo direto do HTML. Produtos
// cadastrados depois do build continuam funcionando pelo app, mas só entram no
// HTML pronto e no sitemap no próximo build.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
const server = await import(pathToFileURL(fileURLToPath(new URL('dist-ssr/entry-server.js', root))).href)
const { absoluteUrl, activeCategories, categoryPath, policies, policyPath, productPath, productsInCategory, SITE_URL, storeDescription, storeTitle, validFaqs } = server

const template = await readFile(new URL('index.html', dist), 'utf8')
const catalog = await server.loadCatalog()

if (catalog.mode !== 'supabase') {
  throw new Error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env antes do build.')
}

// Só o necessário para o app hidratar a página.
const publicCatalog = { settings: catalog.settings, products: catalog.products, categories: catalog.categories }
const escapeXml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

async function write(path, content) {
  const file = new URL(path, dist)
  await mkdir(dirname(fileURLToPath(file)), { recursive: true })
  await writeFile(file, content)
}

function page({ head, html = '', data = '' }) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', html)
    .replace('<!--app-data-->', data)
}

function prerendered(url) {
  const meta = server.buildPageMeta(url, publicCatalog)
  return page({
    head: `<title>${escapeXml(meta.title)}</title>\n    ${server.renderHeadTags(meta)}`,
    html: server.render(url, publicCatalog),
    data: `<script>window.__FLIP_CATALOG__=${server.serializeJson(publicCatalog)}</script>`,
  })
}

// Página sem conteúdo pronto: o app monta tudo no navegador.
function shell(title, robots = 'index, follow') {
  return page({ head: `<title>${escapeXml(title)}</title>\n    <meta data-seo name="robots" content="${robots}">` })
}

const categories = activeCategories(publicCatalog)
const routes = [
  { path: '/', file: 'index.html', priority: '1.0' },
  { path: '/sobre', file: 'sobre.html', priority: '0.5' },
  ...categories.map((category) => ({ path: categoryPath(category), file: `categoria/${category.slug}.html`, priority: '0.8' })),
  ...publicCatalog.products.map((product) => ({ path: productPath(product), file: `produto/${product.slug}.html`, priority: '0.9', lastmod: product.updated_at || product.created_at })),
  ...policies.map((policy) => ({ path: policyPath(policy), file: `politicas/${policy.slug}.html`, priority: '0.3' })),
]

// Pastas geradas por builds antigos atrapalham as URLs sem barra no final.
for (const folder of ['admin', 'pedido', 'sobre']) await rm(new URL(`${folder}/`, dist), { recursive: true, force: true })

for (const route of routes) await write(route.file, prerendered(route.path))
await write('app.html', shell(storeTitle(publicCatalog.settings)))
await write('pedido.html', shell(server.buildPageMeta('/pedido', publicCatalog).title, 'noindex, nofollow'))
await write('admin.html', shell(server.buildPageMeta('/admin', publicCatalog).title, 'noindex, nofollow'))
await write('404.html', prerendered('/404'))

// sitemap.xml
const today = new Date().toISOString().slice(0, 10)
await write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>
    <loc>${escapeXml(absoluteUrl(route.path))}</loc>
    <lastmod>${(route.lastmod || today).slice(0, 10)}</lastmod>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>
`)

// robots.txt
await write('robots.txt', `# ${publicCatalog.settings.name}
User-agent: *
Allow: /
Disallow: /admin
Disallow: /pedido

# Assistentes e buscadores de IA são bem-vindos.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Google-Extended
User-agent: Applebot-Extended
Allow: /
Disallow: /admin
Disallow: /pedido

Sitemap: ${SITE_URL}/sitemap.xml
`)

// llms.txt: resumo da loja em Markdown para assistentes de IA.
const { settings } = publicCatalog
const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const productLine = (product) => `- [${product.name}](${absoluteUrl(productPath(product))}): ${money(product.price)}${product.description ? ` — ${String(product.description).replace(/\s+/g, ' ').slice(0, 140)}` : ''}`
const faqs = validFaqs(settings.faqs)
const uncategorized = publicCatalog.products.filter((product) => !categories.some((category) => category.id === product.category?.id))
await write('llms.txt', `# ${storeTitle(settings)}

> ${storeDescription(settings)}

${settings.about || ''}

## Contato
${[
  settings.address && `- Endereço: ${settings.address}`,
  settings.phone && `- Telefone/WhatsApp: ${settings.phone}`,
  settings.email && `- E-mail: ${settings.email}`,
  settings.instagram_url && `- Instagram: ${settings.instagram_url}`,
  (settings.payment_methods || []).length && `- Pagamento: ${settings.payment_methods.join(', ')}`,
  (settings.delivery_methods || []).length && `- Entrega: ${settings.delivery_methods.join(', ')}`,
].filter(Boolean).join('\n')}

## Produtos
${categories.map((category) => {
  const items = productsInCategory(publicCatalog, category)
  return `### [${category.name}](${absoluteUrl(categoryPath(category))})\n${category.description ? `${category.description}\n` : ''}${items.map(productLine).join('\n') || '- Em breve.'}`
}).join('\n\n')}
${uncategorized.length ? `\n### Outros\n${uncategorized.map(productLine).join('\n')}\n` : ''}${publicCatalog.products.length ? '' : '\nCatálogo em atualização.\n'}
${faqs.length ? `## Perguntas frequentes\n${faqs.map((item) => `**${item.question}**\n${item.answer}`).join('\n\n')}\n` : ''}
## Políticas
${policies.map((policy) => `- [${policy.title}](${absoluteUrl(policyPath(policy))}): ${policy.summary}`).join('\n')}
- [Sobre a loja](${absoluteUrl('/sobre')})
`)

console.log(`Pré-renderizadas ${routes.length} páginas (${publicCatalog.products.length} produtos, ${categories.length} categorias) + sitemap.xml, robots.txt e llms.txt.`)
