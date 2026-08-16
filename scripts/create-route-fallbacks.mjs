import { copyFile, mkdir } from 'node:fs/promises'

const outputDirectory = new URL('../dist/', import.meta.url)
const indexFile = new URL('index.html', outputDirectory)

// Rotas fixas ganham um index físico para funcionar em hospedagens que
// ignoram o fallback de SPA configurado por .htaccess.
for (const route of ['admin', 'pedido', 'sobre']) {
  const routeDirectory = new URL(`${route}/`, outputDirectory)
  await mkdir(routeDirectory, { recursive: true })
  await copyFile(indexFile, new URL('index.html', routeDirectory))
}

// A página personalizada de erro mantém URLs dinâmicas, como /produto/:slug,
// carregando a aplicação quando o provedor suporta 404.html.
await copyFile(indexFile, new URL('404.html', outputDirectory))

