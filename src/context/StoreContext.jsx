import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { demoCategories, demoProducts, demoStore } from '../data/demo.js'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { loadCatalog, validateCoupon } from '../services/catalog.js'
import { calculateCouponDiscount, getDiscountedProductPrice, getProductPrice } from '../utils/format.js'

const StoreContext = createContext(null)
const CART_KEY = 'flip-cart-v1'
const COUPON_KEY = 'flip-coupon-v1'
const CATALOG_KEY = 'flip-catalog-v1'

export function getCartItemKey(product, selectedVariant = null) {
  return `${product.id}:${selectedVariant?.id || 'default'}`
}

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(value)
      ? value.map((item) => ({ ...item, key: item.key || `${item.productId}:${item.variantId || 'default'}` }))
      : []
  } catch {
    return []
  }
}

function readCoupon() {
  try {
    const value = JSON.parse(localStorage.getItem(COUPON_KEY) || 'null')
    return value?.code && ['percentage', 'fixed'].includes(value.type) ? value : null
  } catch {
    return null
  }
}

// Último catálogo carregado do Supabase. Evita mostrar os mockups de demonstração
// enquanto o catálogo real ainda está chegando.
function readCachedCatalog() {
  try {
    const value = JSON.parse(localStorage.getItem(CATALOG_KEY) || 'null')
    return value?.settings && Array.isArray(value.products) && Array.isArray(value.categories) ? value : null
  } catch {
    return null
  }
}

function writeCachedCatalog(catalog) {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog))
  } catch { /* armazenamento indisponível ou cheio */ }
}

function initialCatalog(preloaded) {
  if (preloaded) return { ...preloaded, mode: 'supabase', cached: true }
  if (!isSupabaseConfigured) return { settings: demoStore, products: demoProducts, categories: demoCategories, mode: 'demo', cached: false }
  const cached = readCachedCatalog()
  if (cached) return { ...cached, mode: 'supabase', cached: true }
  return { settings: { ...demoStore, hero_image_url: null }, products: [], categories: [], mode: 'supabase', cached: false }
}

// preloaded: catálogo embutido no HTML gerado no build. Nesse caso a página já
// chega pronta e o React só "hidrata"; carrinho e cupom (que vivem no navegador)
// são lidos depois, para o primeiro render ser igual ao HTML.
export function StoreProvider({ children, preloaded = null }) {
  const [initial] = useState(() => initialCatalog(preloaded))
  const [settings, setSettings] = useState(initial.settings)
  const [products, setProducts] = useState(initial.products)
  const [categories, setCategories] = useState(initial.categories)
  const [mode, setMode] = useState(initial.mode)
  const [loading, setLoading] = useState(!initial.cached)
  const [loadError, setLoadError] = useState(null)
  const [cart, setCart] = useState(() => (preloaded ? [] : readCart()))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [coupon, setCoupon] = useState(() => (preloaded ? null : readCoupon()))
  const [browserStateReady, setBrowserStateReady] = useState(!preloaded)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)

  const refreshCatalog = async () => {
    setLoadError(null)
    try {
      const result = await loadCatalog()
      setSettings(result.settings)
      setProducts(result.products)
      setCategories(result.categories)
      setMode(result.mode)
      if (result.mode === 'supabase') {
        writeCachedCatalog({ settings: result.settings, products: result.products, categories: result.categories })
      }
    } catch (error) {
      // Mantém o que já está na tela (catálogo guardado) em vez de trocar por mockups.
      setLoadError(error.message || 'Não foi possível carregar o catálogo.')
      setSettings((current) => (current.hero_image_url ? current : { ...current, hero_image_url: demoStore.hero_image_url }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refreshCatalog() }, [])
  useEffect(() => {
    if (browserStateReady) return
    setCart(readCart())
    setCoupon(readCoupon())
    setBrowserStateReady(true)
  }, [browserStateReady])
  useEffect(() => {
    if (browserStateReady) localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart, browserStateReady])
  useEffect(() => {
    if (!browserStateReady) return
    if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon))
    else localStorage.removeItem(COUPON_KEY)
  }, [coupon, browserStateReady])
  useEffect(() => {
    if (loading || !browserStateReady || !coupon?.code) return
    if (mode === 'demo') {
      if (coupon.code !== 'FLIP10') setCoupon(null)
      return
    }
    validateCoupon(coupon.code).then(setCoupon).catch(() => setCoupon(null))
  }, [loading, mode, browserStateReady])
  useEffect(() => {
    if (settings.primary_color) document.documentElement.style.setProperty('--brand', settings.primary_color)
  }, [settings.primary_color])

  const addToCart = (product, selectedVariant = product.variants?.[0] || null, amount = 1) => {
    const key = getCartItemKey(product, selectedVariant)
    const item = {
      key,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0]?.url || '',
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.name || null,
      unitPrice: getProductPrice(product, selectedVariant),
      quantity: Math.max(1, Number(amount) || 1),
    }
    setCart((current) => {
      const found = current.find((cartItem) => cartItem.key === key)
      return found
        ? current.map((cartItem) => cartItem.key === key ? { ...cartItem, quantity: cartItem.quantity + item.quantity } : cartItem)
        : [...current, item]
    })
    setDrawerOpen(true)
  }

  const updateCart = (key, delta) => setCart((current) => current.flatMap((item) => {
    if (item.key !== key) return [item]
    const quantity = item.quantity + delta
    return quantity > 0 ? [{ ...item, quantity }] : []
  }))

  const removeFromCart = (key) => setCart((current) => current.filter((item) => item.key !== key))
  const clearCart = () => setCart([])
  const applyCoupon = async (rawCode) => {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!code) throw new Error('Digite um cupom.')
    setCouponLoading(true)
    try {
      const applied = mode === 'demo'
        ? (code === 'FLIP10' ? { code, type: 'percentage', value: 10 } : null)
        : await validateCoupon(code)
      if (!applied) throw new Error('Cupom inválido ou expirado.')
      setCoupon(applied)
      return applied
    } finally {
      setCouponLoading(false)
    }
  }
  const removeCoupon = () => setCoupon(null)
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartSubtotal = cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  const cartDiscount = calculateCouponDiscount(cartSubtotal, coupon)
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount)
  const getDisplayPrice = useCallback((price) => getDiscountedProductPrice(price, coupon), [coupon])

  const value = useMemo(() => ({
    settings, products, categories, mode, loading, loadError, refreshCatalog,
    cart, cartCount, cartSubtotal, cartDiscount, cartTotal, drawerOpen, setDrawerOpen,
    addToCart, updateCart, removeFromCart, clearCart,
    coupon, couponLoading, couponModalOpen, setCouponModalOpen, applyCoupon, removeCoupon, getDisplayPrice,
  }), [settings, products, categories, mode, loading, loadError, cart, cartCount, cartSubtotal, cartDiscount, cartTotal, drawerOpen, coupon, couponLoading, couponModalOpen, getDisplayPrice])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore deve ser usado dentro de StoreProvider.')
  return context
}
