import { demoCategories, demoProducts, demoStore } from '../data/demo.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const productSelect = `
  id, slug, name, sku, barcode_type, barcode, brand, unit, condition, description, price, cost_price, stock,
  purchase_recurrence, has_brand, has_variations, variation_type, weight_kg, height_cm, length_cm, width_cm,
  is_featured, is_active, created_at,
  category:categories(id, name, slug, is_active),
  images:product_images(id, url, storage_path, alt_text, position),
  variants:product_variants(id, name, attributes, price_override, stock, position, is_active)
`

export function normalizeProduct(product) {
  const category = Array.isArray(product.category) ? product.category[0] : product.category
  return {
    ...product,
    price: Number(product.price),
    cost_price: product.cost_price === null || product.cost_price === undefined ? null : Number(product.cost_price),
    weight_kg: product.weight_kg === null || product.weight_kg === undefined ? null : Number(product.weight_kg),
    height_cm: product.height_cm === null || product.height_cm === undefined ? null : Number(product.height_cm),
    length_cm: product.length_cm === null || product.length_cm === undefined ? null : Number(product.length_cm),
    width_cm: product.width_cm === null || product.width_cm === undefined ? null : Number(product.width_cm),
    category: category || { id: null, name: 'Sem categoria', slug: 'sem-categoria' },
    images: [...(product.images || [])].sort((a, b) => a.position - b.position),
    variants: (product.variants || []).filter((item) => item.is_active !== false).sort((a, b) => (a.position || 0) - (b.position || 0)),
  }
}

export async function loadCatalog() {
  if (!isSupabaseConfigured) {
    return { settings: demoStore, products: demoProducts, categories: demoCategories, mode: 'demo' }
  }

  const [settingsResult, productsResult, categoriesResult] = await Promise.all([
    supabase.from('store_settings').select('*').limit(1).maybeSingle(),
    supabase.from('products').select(productSelect).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name, slug, is_active').eq('is_active', true).order('name'),
  ])

  const error = settingsResult.error || productsResult.error || categoriesResult.error
  if (error) throw error

  const remoteSettings = settingsResult.data
  const settings = remoteSettings
    ? {
        ...demoStore,
        ...remoteSettings,
        logo_url: remoteSettings.logo_url || demoStore.logo_url,
        custom_logo_url: remoteSettings.logo_url || '',
      }
    : demoStore

  return {
    settings,
    products: (productsResult.data || []).map(normalizeProduct),
    categories: categoriesResult.data || [],
    mode: 'supabase',
  }
}

export async function submitOrder(payload) {
  if (!supabase) throw new Error('O Supabase ainda não está configurado.')
  const { data, error } = await supabase.functions.invoke('submit-order', { body: payload })
  if (error) throw new Error(error.message || 'Não foi possível registrar o pedido.')
  if (data?.error) throw new Error(data.error)
  return data
}

export async function validateCoupon(code) {
  if (!supabase) throw new Error('O Supabase ainda não está configurado.')
  const { data, error } = await supabase.functions.invoke('validate-coupon', { body: { code } })
  if (error) {
    let message = 'Cupom inválido ou expirado.'
    if (error.context instanceof Response) {
      try { message = (await error.context.json())?.error || message } catch { /* resposta sem JSON */ }
    }
    throw new Error(message)
  }
  if (data?.error || !data?.coupon) throw new Error(data?.error || 'Cupom inválido ou expirado.')
  return { ...data.coupon, value: Number(data.coupon.value) }
}

export { productSelect }
