import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCartItemKey, useStore } from '../context/StoreContext.jsx'
import { getProductPrice, money } from '../utils/format.js'
import ProductImage from './ProductImage.jsx'

export default function ProductCard({ product }) {
  const { cart, coupon, addToCart, updateCart, removeFromCart, getDisplayPrice } = useStore()
  const defaultVariant = product.variants?.[0] || null
  const cartKey = getCartItemKey(product, defaultVariant)
  const cartItem = cart.find((item) => item.key === cartKey)
  const price = getProductPrice(product, defaultVariant)
  const displayedPrice = getDisplayPrice(price)
  const hasCouponDiscount = displayedPrice < price
  const hasOverride = defaultVariant?.price_override !== null && defaultVariant?.price_override !== undefined
  const hasVariants = product.variants?.length > 0

  return (
    <article className="product-card">
      <Link className="product-card__image" to={`/produto/${product.slug}`}>
        {product.is_featured && <span className="product-card__tag">Destaque</span>}
        <ProductImage src={product.images?.[0]?.url} alt={product.images?.[0]?.alt_text || product.name} loading="lazy" />
      </Link>
      <div className="product-card__body">
        <span className="eyebrow">{product.category.name}</span>
        <Link to={`/produto/${product.slug}`}><h3>{product.name}</h3></Link>
        <div className="product-card__price">
          {hasOverride && <small>a partir de</small>}
          {hasCouponDiscount && <del>{money(price)}</del>}
          <strong>{money(displayedPrice)}</strong>
          {hasCouponDiscount && <small className="coupon-price-label">com cupom {coupon.code}</small>}
        </div>
        {hasVariants ? (
          <Link className="button button--card" to={`/produto/${product.slug}`}>
            Mais informações
            <Plus size={14} />
          </Link>
        ) : (
          <>
            {cartItem ? (
              <div className="card-cart-controls">
                <div className="card-stepper">
                  <button type="button" onClick={() => updateCart(cartKey, -1)} aria-label={`Diminuir quantidade de ${product.name}`}><Minus size={16} /></button>
                  <b aria-live="polite" aria-label={`${cartItem.quantity} na sacolinha`}>{cartItem.quantity}</b>
                  <button type="button" onClick={() => updateCart(cartKey, 1)} aria-label={`Aumentar quantidade de ${product.name}`}><Plus size={16} /></button>
                </div>
                <button className="card-cart-remove" type="button" onClick={() => removeFromCart(cartKey)} aria-label={`Remover ${product.name} da sacolinha`}><Trash2 size={16} /></button>
              </div>
            ) : (
              <button className="button button--card" type="button" onClick={() => addToCart(product, defaultVariant)}>
                <ShoppingBag size={16} />
                Adicionar
                <Plus size={14} />
              </button>
            )}
            <Link className="product-card__more" to={`/produto/${product.slug}`}>Mais informações</Link>
          </>
        )}
      </div>
    </article>
  )
}
