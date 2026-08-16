import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { demoCategories, demoProducts, demoStore } from '../data/demo.js'
import { loadCatalog, validateCoupon } from '../services/catalog.js'
import { calculateCouponDiscount, getDiscountedProductPrice, getProductPrice } from '../utils/format.js'

const StoreContext = createContext(null)
const CART_KEY = 'flip-cart-v1'
const COUPON_KEY = 'flip-coupon-v1'

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

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(demoStore)
  const [products, setProducts] = useState(demoProducts)
  const [categories, setCategories] = useState(demoCategories)
  const [mode, setMode] = useState('demo')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [cart, setCart] = useState(readCart)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [coupon, setCoupon] = useState(readCoupon)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)

  const refreshCatalog = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await loadCatalog()
      setSettings(result.settings)
      setProducts(result.products)
      setCategories(result.categories)
      setMode(result.mode)
    } catch (error) {
      setSettings(demoStore)
      setProducts(demoProducts)
      setCategories(demoCategories)
      setMode('demo')
      setLoadError(error.message || 'Não foi possível carregar o catálogo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refreshCatalog() }, [])
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])
  useEffect(() => {
    if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon))
    else localStorage.removeItem(COUPON_KEY)
  }, [coupon])
  useEffect(() => {
    if (loading || !coupon?.code) return
    if (mode === 'demo') {
      if (coupon.code !== 'FLIP10') setCoupon(null)
      return
    }
    validateCoupon(coupon.code).then(setCoupon).catch(() => setCoupon(null))
  }, [loading, mode])
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
