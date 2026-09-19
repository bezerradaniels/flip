// Feed de produtos para o Google Merchant Center (Google Shopping).
// URL pública, lida pelo Merchant Center em "Busca programada":
//   https://<projeto>.supabase.co/functions/v1/merchant-feed
import { createClient } from 'npm:@supabase/supabase-js@2.95.3'

const SITE_URL = (Deno.env.get('SITE_URL') || 'https://flipartigosreligiosos.com.br').replace(/\/$/, '')
const DEFAULT_GOOGLE_CATEGORY = 'Religious & Ceremonial > Religious Items'

type Variant = { id: string; name: string; attributes: Record<string, string> | null; price_override: number | null; stock: number | null; is_active: boolean; position: number }
type Product = {
  id: string; slug: string; name: string; brand: string | null; description: string | null
  price: number; stock: number | null; weight_kg: number | null; height_cm: number | null; length_cm: number | null; width_cm: number | null
  category: { name: string; google_product_category: string | null; is_active: boolean } | null
  images: { url: string; position: number }[]
  variants: Variant[]
}

const escapeXml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
  // Caracteres de controle invalidam o XML.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

const plain = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const price = (value: number) => `${Number(value).toFixed(2)} BRL`
const inStock = (stock: number | null) => stock === null || stock === undefined || Number(stock) > 0
const tag = (name: string, value: unknown) => (value === null || value === undefined || value === '' ? '' : `      <g:${name}>${escapeXml(value)}</g:${name}>\n`)

// Atributos de variação que o Google reconhece.
function variantAttributes(attributes: Record<string, string> | null) {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(attributes || {})) {
    const name = key.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (/^cor(es)?$|colou?r/.test(name)) result.color = value
    else if (/tamanho|medida|size/.test(name)) result.size = value
    else if (/material/.test(name)) result.material = value
    else if (/estampa|padrao|modelo/.test(name)) result.pattern = value
  }
  return result
}

function item(product: Product, storeName: string, variant: Variant | null) {
  const productUrl = `${SITE_URL}/produto/${product.slug}`
  const images = [...product.images].sort((a, b) => a.position - b.position).map((image) => image.url)
  const description = plain(product.description) || `${product.name} — ${product.category?.name || 'artigo religioso'} da ${storeName}.`
  const attributes = variantAttributes(variant?.attributes ?? null)
  const available = variant ? inStock(variant.stock) : inStock(product.stock)
  const weight = product.weight_kg ? `${product.weight_kg} kg` : null

  return `    <item>
${tag('id', variant?.id || product.id)}${variant ? tag('item_group_id', product.id) : ''}${tag('title', (variant ? `${product.name} - ${variant.name}` : product.name).slice(0, 150))}${tag('description', description.slice(0, 5000))}${tag('link', variant ? `${productUrl}?variante=${variant.id}` : productUrl)}${tag('image_link', images[0])}${images.slice(1, 11).map((url) => tag('additional_image_link', url)).join('')}${tag('availability', available ? 'in_stock' : 'out_of_stock')}${tag('price', price(variant?.price_override ?? product.price))}${tag('condition', 'new')}${tag('brand', product.brand || storeName)}${tag('identifier_exists', 'no')}${tag('google_product_category', product.category?.google_product_category || DEFAULT_GOOGLE_CATEGORY)}${tag('product_type', product.category?.name)}${tag('color', attributes.color)}${tag('size', attributes.size)}${tag('material', attributes.material)}${tag('pattern', attributes.pattern)}${tag('shipping_weight', weight)}${tag('shipping_length', product.length_cm ? `${product.length_cm} cm` : null)}${tag('shipping_width', product.width_cm ? `${product.width_cm} cm` : null)}${tag('shipping_height', product.height_cm ? `${product.height_cm} cm` : null)}    </item>`
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Método não permitido.', { status: 405 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } })
  const [settingsResult, productsResult] = await Promise.all([
    supabase.from('store_settings').select('name, seo_description').limit(1).maybeSingle(),
    supabase.from('products')
      .select('id, slug, name, brand, description, price, stock, weight_kg, height_cm, length_cm, width_cm, category:categories(name, google_product_category, is_active), images:product_images(url, position), variants:product_variants(id, name, attributes, price_override, stock, is_active, position)')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ])

  if (settingsResult.error || productsResult.error) {
    console.error('merchant-feed', settingsResult.error || productsResult.error)
    return new Response('Não foi possível gerar o feed.', { status: 500 })
  }

  const storeName = settingsResult.data?.name || 'Flip'
  const products = (productsResult.data || []) as unknown as Product[]
  // O Google recusa itens sem imagem ou sem preço; ficam fora até serem completados.
  const eligible = products.filter((product) => product.images?.length && Number(product.price) > 0)
  const items = eligible.flatMap((product) => {
    const variants = (product.variants || []).filter((variant) => variant.is_active !== false).sort((a, b) => (a.position || 0) - (b.position || 0))
    return variants.length ? variants.map((variant) => item(product, storeName, variant)) : [item(product, storeName, null)]
  })

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeName)}</title>
    <link>${SITE_URL}/</link>
    <description>${escapeXml(plain(settingsResult.data?.seo_description) || `Produtos da ${storeName}`)}</description>
    <!-- ${eligible.length} de ${products.length} produtos ativos (sem imagem ou preço ficam fora) -->
${items.join('\n')}
  </channel>
</rss>
`
  return new Response(req.method === 'HEAD' ? null : xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
