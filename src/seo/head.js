const escapeAttr = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

export const escapeHtml = escapeAttr

// JSON dentro de <script> não pode conter "</script>" nem "<!--".
export const serializeJson = (value) => JSON.stringify(value)
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll(' ', '\\u2028')
  .replaceAll(' ', '\\u2029')

// Tags do <head> de cada página. Todas levam data-seo para o navegador poder
// trocá-las ao navegar entre páginas sem recarregar.
export function renderHeadTags(meta) {
  const tags = [
    `<meta data-seo name="description" content="${escapeAttr(meta.description)}">`,
    `<meta data-seo name="robots" content="${escapeAttr(meta.robots)}">`,
    meta.canonical && `<link data-seo rel="canonical" href="${escapeAttr(meta.canonical)}">`,
    `<meta data-seo property="og:site_name" content="${escapeAttr(meta.siteName)}">`,
    `<meta data-seo property="og:locale" content="pt_BR">`,
    `<meta data-seo property="og:type" content="${escapeAttr(meta.type)}">`,
    `<meta data-seo property="og:title" content="${escapeAttr(meta.title)}">`,
    `<meta data-seo property="og:description" content="${escapeAttr(meta.description)}">`,
    meta.canonical && `<meta data-seo property="og:url" content="${escapeAttr(meta.canonical)}">`,
    meta.image && `<meta data-seo property="og:image" content="${escapeAttr(meta.image)}">`,
    `<meta data-seo name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}">`,
    meta.product && `<meta data-seo property="product:price:amount" content="${Number(meta.product.price).toFixed(2)}">`,
    meta.product && `<meta data-seo property="product:price:currency" content="BRL">`,
    meta.jsonLd && `<script data-seo type="application/ld+json">${serializeJson(meta.jsonLd)}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}
