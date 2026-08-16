import { Check, Plus, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCartItemKey, useStore } from '../context/StoreContext.jsx'
import { getProductPrice, money } from '../utils/format.js'

export default function ProductCard({ product }) {
  const { cart, coupon, addToCart, getDisplayPrice } = useStore()
  const defaultVariant = product.variants?.[0] || null
  const isAdded = cart.some((item) => item.key === getCartItemKey(product, defaultVariant))
  const price = getProductPrice(product, defaultVariant)
  const displayedPrice = getDisplayPrice(price)
  const hasCouponDiscount = displayedPrice < price
  const hasOverride = defaultVariant?.price_override !== null && defaultVariant?.price_override !== undefined
  const hasVariants = product.variants?.length > 0

  return (
    <article className="product-card">
      <Link className="product-card__image" to={`/produto/${product.slug}`}>
        {product.is_featured && <span className="product-card__tag">Destaque</span>}
        <img src={product.images?.[0]?.url} alt={product.images?.[0]?.alt_text || product.name} loading="lazy" />
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
            <button className={`button button--card ${isAdded ? 'is-added' : ''}`} type="button" onClick={() => addToCart(product, defaultVariant)}>
              {isAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
              {isAdded ? 'Adicionar mais' : 'Adicionar'}
              {!isAdded && <Plus size={14} />}
            </button>
            <Link className="product-card__more" to={`/produto/${product.slug}`}>Mais informações</Link>
          </>
        )}
      </div>
    </article>
  )
}
