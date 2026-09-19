import { demoCategories, demoProducts, demoStore } from '../data/demo.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import { cleanFaqs } from '../utils/faqs.js'
import { optimizeImage } from '../utils/images.js'
import { normalizeProduct, productSelect } from './catalog.js'

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function loadAdminDashboard() {
  if (!isSupabaseConfigured) {
    return { products: demoProducts, categories: demoCategories, settings: demoStore, orders: [], coupons: [] }
  }
  const [productsResult, categoriesResult, settingsResult, ordersResult, couponsResult] = await Promise.all([
    supabase.from('products').select(productSelect).order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('store_settings').select('*').limit(1).maybeSingle(),
    supabase.from('orders').select('*, items:order_items(*)').order('created_at', { ascending: false }).limit(100),
    supabase.from('coupons').select('*').order('created_at', { ascending: false }),
  ])
  const error = productsResult.error || categoriesResult.error || settingsResult.error || ordersResult.error || couponsResult.error
  if (error) throw error
  return {
    products: (productsResult.data || []).map(normalizeProduct),
    categories: categoriesResult.data || [],
    settings: settingsResult.data || demoStore,
    orders: ordersResult.data || [],
    coupons: couponsResult.data || [],
  }
}

const safeFileName = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()

const nullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null
  return Number(value)
}

const nullableInteger = (value) => {
  if (value === '' || value === null || value === undefined) return null
  return Number.parseInt(value, 10)
}

export async function saveProduct({ product, imageUrls, variants = [], files }) {
  const record = {
    category_id: product.category_id || null,
    name: product.name.trim(), slug: product.slug.trim(),
    brand: product.brand?.trim() || null,
    unit: product.unit.trim() || 'Unidade',
    description: product.description.trim() || null, price: Number(product.price),
    cost_price: nullableNumber(product.cost_price),
    stock: nullableInteger(product.stock),
    has_brand: Boolean(product.brand?.trim()),
    has_variations: Boolean(product.has_variations),
    variation_type: product.has_variations ? product.variation_type?.trim() || null : null,
    weight_kg: nullableNumber(product.weight_kg),
    height_cm: nullableNumber(product.height_cm),
    length_cm: nullableNumber(product.length_cm),
    width_cm: nullableNumber(product.width_cm),
    is_featured: Boolean(product.is_featured), is_active: Boolean(product.is_active),
    faqs: cleanFaqs(product.faqs),
  }

  const result = product.id
    ? await supabase.from('products').update(record).eq('id', product.id).select('id').single()
    : await supabase.from('products').insert(record).select('id').single()
  if (result.error) throw result.error
  const productId = result.data.id

  const { data: previousImages, error: previousError } = await supabase.from('product_images').select('*').eq('product_id', productId)
  if (previousError) throw previousError

  const normalizedUrls = imageUrls.map((url) => url.trim()).filter(Boolean)
  const removedPaths = (previousImages || []).filter((item) => item.storage_path && !normalizedUrls.includes(item.url)).map((item) => item.storage_path)
  if (removedPaths.length) {
    const { error } = await supabase.storage.from('product-images').remove(removedPaths)
    if (error) throw error
  }

  const uploaded = []
  for (const original of files) {
    const file = await optimizeImage(original, { maxSize: 1600 })
    const path = `${productId}/${crypto.randomUUID()}-${safeFileName(file.name)}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    uploaded.push({ url: data.publicUrl, storage_path: path })
  }

  const imagesToSave = [
    ...normalizedUrls.map((url) => ({ url, storage_path: previousImages?.find((item) => item.url === url)?.storage_path || null })),
    ...uploaded,
  ]
  const { error: deleteImagesError } = await supabase.from('product_images').delete().eq('product_id', productId)
  if (deleteImagesError) throw deleteImagesError
  if (imagesToSave.length) {
    const { error } = await supabase.from('product_images').insert(imagesToSave.map((item, position) => ({
      product_id: productId, url: item.url, storage_path: item.storage_path, alt_text: product.name, position,
    })))
    if (error) throw error
  }

  const { error: deleteVariantsError } = await supabase.from('product_variants').delete().eq('product_id', productId)
  if (deleteVariantsError) throw deleteVariantsError
  const variantsToSave = product.has_variations
    ? variants
        .map((variant) => ({
          name: variant.name?.trim(),
          attributes: Object.fromEntries(Object.entries(variant.attributes || {})
            .map(([type, value]) => [type.trim(), String(value).trim()])
            .filter(([type, value]) => type && value)),
          price_override: nullableNumber(variant.price_override),
          stock: nullableInteger(variant.stock),
        }))
        .filter((variant) => variant.name)
    : []
  if (variantsToSave.length) {
    const { error } = await supabase.from('product_variants').insert(variantsToSave.map((variant, position) => ({
      product_id: productId, ...variant, position,
    })))
    if (error) throw error
  }
  return productId
}

export async function deleteProduct(productId) {
  const { data: images, error: imageError } = await supabase.from('product_images').select('storage_path').eq('product_id', productId)
  if (imageError) throw imageError
  const paths = (images || []).map((item) => item.storage_path).filter(Boolean)
  if (paths.length) {
    const { error } = await supabase.storage.from('product-images').remove(paths)
    if (error) throw error
  }
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}

export async function saveCategory(category) {
  const record = {
    name: category.name.trim(), slug: category.slug.trim(), is_active: category.is_active !== false,
    ...(category.description !== undefined ? { description: category.description?.trim() || null } : {}),
    ...(category.google_product_category !== undefined ? { google_product_category: category.google_product_category?.trim() || null } : {}),
  }
  const result = category.id
    ? await supabase.from('categories').update(record).eq('id', category.id)
    : await supabase.from('categories').insert(record)
  if (result.error) throw result.error
}

export async function deleteCategory(categoryId) {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)
  if (error) throw error
}

export const STORE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const STORE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

// Imagens da loja ficam no mesmo bucket das fotos de produto, na pasta store/.
const storeImagePath = (url) => {
  const marker = '/storage/v1/object/public/product-images/'
  const index = url?.indexOf(marker) ?? -1
  if (index === -1) return null
  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0])
  return path.startsWith('store/') ? path : null
}

export async function uploadStoreImage(original, kind) {
  const file = await optimizeImage(original, { maxSize: kind === 'logo' ? 512 : 2000 })
  const path = `store/${kind}-${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

export async function removeStoreImages(urls) {
  const paths = urls.map(storeImagePath).filter(Boolean)
  if (!paths.length) return
  const { error } = await supabase.storage.from('product-images').remove(paths)
  if (error) console.warn('Não foi possível apagar imagens antigas da loja.', error)
}

export async function saveStoreSettings(settings) {
  const allowedFields = [
    'id', 'name', 'logo_url', 'hero_image_url', 'primary_color', 'whatsapp', 'phone', 'email',
    'address', 'instagram_url', 'about', 'slogan', 'payment_methods', 'delivery_methods',
    'seo_title', 'seo_description', 'faqs',
  ]
  const record = Object.fromEntries(allowedFields.filter((field) => settings[field] !== undefined).map((field) => [field, settings[field]]))
  const { error } = await supabase.from('store_settings').upsert({ ...record, id: settings.id || 1 })
  if (error) throw error
}

export async function saveCoupon(coupon) {
  const record = {
    code: coupon.code.trim().toUpperCase(), type: coupon.type, value: Number(coupon.value),
    starts_at: coupon.starts_at || null, ends_at: coupon.ends_at || null, is_active: coupon.is_active !== false,
  }
  const result = coupon.id
    ? await supabase.from('coupons').update(record).eq('id', coupon.id)
    : await supabase.from('coupons').insert(record)
  if (result.error) throw result.error
}

export async function deleteCoupon(couponId) {
  const { error } = await supabase.from('coupons').delete().eq('id', couponId)
  if (error) throw error
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
  if (error) throw error
}
