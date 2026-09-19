import assert from 'node:assert/strict'
import test from 'node:test'
import { renderHeadTags, serializeJson } from './head.js'
import { buildPageMeta, productSchema, truncate } from './site.js'

const settings = {
  name: 'Flip', seo_title: 'Flip Artigos Religiosos', seo_description: 'Terços e imagens de santos.',
  address: 'Bom Jesus da Lapa, Bahia', phone: '(77) 98634-5421', hero_image_url: '/hero.jpg',
  faqs: [{ question: 'Onde fica?', answer: 'Em Bom Jesus da Lapa.' }, { question: '', answer: 'vazia' }],
}
const category = { id: 'c1', name: 'Terços', slug: 'tercos', is_active: true, description: 'Terços de madeira.' }
const product = {
  id: 'p1', slug: 'terco-madeira', name: 'Terço de madeira', price: 39.9, stock: null, description: 'Terço artesanal.',
  category, images: [{ url: 'https://cdn.exemplo.com/terco.webp' }], faqs: [],
  variants: [{ id: 'v1', price_override: null, stock: 0 }, { id: 'v2', price_override: 49.9, stock: 3 }],
}
const catalog = { settings, products: [product], categories: [category] }

test('página inicial usa o título e a descrição de SEO da loja', () => {
  const meta = buildPageMeta('/', catalog)
  assert.equal(meta.title, 'Flip Artigos Religiosos')
  assert.equal(meta.canonical, 'https://flipartigosreligiosos.com.br/')
  const faq = meta.jsonLd['@graph'].find((node) => node['@type'] === 'FAQPage')
  assert.equal(faq.mainEntity.length, 1)
})

test('produto gera Product com faixa de preço e disponibilidade das variações', () => {
  const schema = productSchema(product, settings)
  assert.equal(schema.offers['@type'], 'AggregateOffer')
  assert.equal(schema.offers.lowPrice, '39.90')
  assert.equal(schema.offers.highPrice, '49.90')
  assert.equal(schema.offers.availability, 'https://schema.org/InStock')
  assert.equal(schema.offers.hasMerchantReturnPolicy.merchantReturnDays, 7)
})

test('produto tem breadcrumb com a categoria e canonical próprio', () => {
  const meta = buildPageMeta('/produto/terco-madeira', catalog)
  assert.equal(meta.canonical, 'https://flipartigosreligiosos.com.br/produto/terco-madeira')
  const crumbs = meta.jsonLd['@graph'].find((node) => node['@type'] === 'BreadcrumbList')
  assert.deepEqual(crumbs.itemListElement.map((item) => item.name), ['Início', 'Terços', 'Terço de madeira'])
})

test('endereços desconhecidos e páginas privadas não são indexados', () => {
  assert.equal(buildPageMeta('/produto/nao-existe', catalog).robots, 'noindex, follow')
  assert.equal(buildPageMeta('/qualquer', catalog).canonical, null)
  assert.equal(buildPageMeta('/admin', catalog).robots, 'noindex, nofollow')
  assert.equal(buildPageMeta('/pedido', catalog).robots, 'noindex, nofollow')
})

test('dados estruturados não quebram o HTML', () => {
  const html = renderHeadTags({ ...buildPageMeta('/', catalog), jsonLd: { name: '</script><script>alert(1)</script>' } })
  assert.equal(html.includes('</script><script>'), false)
  assert.equal(serializeJson('<!--'), '"\\u003c!--"')
})

test('truncate corta em palavra inteira', () => {
  assert.equal(truncate('um dois três quatro cinco', 14), 'um dois três…')
})
