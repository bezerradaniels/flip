import { ArrowLeft, Check, ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, Share2, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import FaqList from '../components/FaqList.jsx'
import { ProductGrid } from '../components/ProductGrid.jsx'
import { getCartItemKey, useStore } from '../context/StoreContext.jsx'
import { categoryPath, productPath } from '../seo/site.js'
import { getProductPrice, money, onlyDigits } from '../utils/format.js'
import { findVariantForSelection, getVariantAttributes, getVariationGroups, hasStructuredVariants } from '../utils/variants.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function ProductPage() {
  const { slug } = useParams()
  const { products, settings, loading, addToCart, cart, coupon, getDisplayPrice } = useStore()
  const product = products.find((item) => item.slug === slug || item.id === slug)
  const [imageIndex, setImageIndex] = useState(0)
  const [searchParams] = useSearchParams()
  // ?variante=<id> vem dos links do Google Shopping e abre a variação anunciada.
  const [selectedVariantId, setSelectedVariantId] = useState(() => searchParams.get('variante'))
  const [quantity, setQuantity] = useState(1)

  const selectedVariant = product?.variants?.find((item) => item.id === selectedVariantId) || product?.variants?.[0] || null
  const related = useMemo(() => products.filter((item) => item.id !== product?.id && item.category.id === product?.category.id).slice(0, 4), [products, product])
  const variationGroups = useMemo(() => getVariationGroups(product), [product])

  if (loading) return <main className="internal-page"><div className="page-loading">Carregando produto…</div></main>
  if (!product) return <NotFoundPage />

  const images = product.images.length ? product.images : [{ id: 'placeholder', url: '', alt_text: product.name }]
  const price = getProductPrice(product, selectedVariant)
  const displayedPrice = getDisplayPrice(price)
  const hasCouponDiscount = displayedPrice < price
  const selectedCartKey = getCartItemKey(product, selectedVariant)
  const structuredVariants = hasStructuredVariants(product.variants)
  const cartHasVariant = cart.some((item) => item.key === selectedCartKey)
  const askText = encodeURIComponent(`Olá, ${settings.name}! Tenho interesse em ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''}.`)
  const share = async () => {
    const payload = { title: product.name, text: `Confira ${product.name} na ${settings.name}`, url: window.location.href }
    if (navigator.share) await navigator.share(payload)
    else await navigator.clipboard?.writeText(window.location.href)
  }
  const selectAttribute = (type, value) => {
    const nextVariant = findVariantForSelection(product.variants, selectedVariant, type, value)
    setSelectedVariantId(nextVariant?.id || null)
  }

  return (
    <main className="internal-page product-page">
      <Breadcrumbs items={[
        { name: 'Início', path: '/' },
        ...(product.category.id ? [{ name: product.category.name, path: categoryPath(product.category) }] : []),
        { name: product.name, path: productPath(product) },
      ]} />
      <div className="page-toolbar">
        <Link to="/"><ArrowLeft size={18} /> Voltar ao catálogo</Link>
        <button type="button" onClick={share}><Share2 size={17} /> Compartilhar</button>
      </div>
      <section className="product-detail">
        <div className="product-gallery">
          <div className="product-gallery__main">
            {images[imageIndex].url ? <img src={images[imageIndex].url} alt={images[imageIndex].alt_text || product.name} /> : <span>Sem imagem</span>}
            {images.length > 1 && (
              <>
                <button type="button" className="gallery-prev" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} aria-label="Imagem anterior"><ChevronLeft /></button>
                <button type="button" className="gallery-next" onClick={() => setImageIndex((imageIndex + 1) % images.length)} aria-label="Próxima imagem"><ChevronRight /></button>
              </>
            )}
          </div>
          <div className="product-gallery__thumbs">
            {images.map((item, index) => <button className={index === imageIndex ? 'is-active' : ''} type="button" key={item.id || item.url} onClick={() => setImageIndex(index)}><img src={item.url} alt="" /></button>)}
          </div>
          <div className="product-description">
            <h2>Descrição</h2>
            <p>{product.description || 'Mais informações em breve.'}</p>
          </div>
          <FaqList faqs={product.faqs} title="Dúvidas sobre este produto" />
        </div>

        <div className="product-detail__info">
          <div className="product-detail__summary">
            <span className="eyebrow">{product.category.name}</span>
            <h1>{product.name}</h1>
          </div>
          <div className="product-meta">
            <span><small>Marca</small><b>{product.brand || settings.name}</b></span>
            <span><small>Unidade</small><b>{product.unit}</b></span>
          </div>
          {product.variants.length > 0 && (structuredVariants ? (
            <div className="product-options product-options--structured">
              {variationGroups.map((group) => <div className="product-option-group" key={group.type}>
                <b>{group.type}</b>
                <div className="category-chips category-chips--left">
                  {group.values.map((value) => {
                    const active = getVariantAttributes(selectedVariant)[group.type] === value
                    const available = product.variants.some((variant) => getVariantAttributes(variant)[group.type] === value && variant.stock !== 0)
                    return <button className={active ? 'is-active' : ''} disabled={!available} type="button" key={value} onClick={() => selectAttribute(group.type, value)}>{value}</button>
                  })}
                </div>
              </div>)}
              <small className="selected-combination">Combinação selecionada: <b>{selectedVariant?.name}</b></small>
            </div>
          ) : (
            <div className="product-options">
              <b>Escolha a variação</b>
              <div className="category-chips category-chips--left">
                {product.variants.map((item) => <button className={selectedVariant?.id === item.id ? 'is-active' : ''} disabled={item.stock === 0} type="button" key={item.id} onClick={() => setSelectedVariantId(item.id)}>{item.name}</button>)}
              </div>
            </div>
          ))}

          <div className="product-buy-row">
            <div className="product-detail__price-block">
              {hasCouponDiscount && <del>{money(price)}</del>}
              <strong className="product-detail__price">{money(displayedPrice)}</strong>
              {hasCouponDiscount && <small>com cupom {coupon.code}</small>}
            </div>
            <div className="quantity-control quantity-control--large">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade"><Minus size={17} /></button>
              <b>{quantity}</b>
              <button type="button" onClick={() => setQuantity(quantity + 1)} aria-label="Aumentar quantidade"><Plus size={17} /></button>
            </div>
          </div>
          {selectedVariant?.stock === 0 && <p className="stock-warning">Esta variação está indisponível.</p>}

          <div className="product-actions">
            <button className={`button button--primary button--grow ${cartHasVariant ? 'is-added' : ''}`} disabled={selectedVariant?.stock === 0} type="button" onClick={() => addToCart(product, selectedVariant, quantity)}>
              {cartHasVariant ? <Check size={18} /> : <ShoppingBag size={18} />} {cartHasVariant ? 'Adicionar mais' : 'Adicionar à sacolinha'}
            </button>
          </div>
          <a className="button button--outline button--full" href={`https://wa.me/${onlyDigits(settings.whatsapp)}?text=${askText}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Perguntar pelo WhatsApp</a>
        </div>
      </section>

      {related.length > 0 && (
        <section className="related-section">
          <div className="section-heading"><span className="kicker">Continue descobrindo</span><h2>Você também pode gostar</h2></div>
          <ProductGrid products={related} />
        </section>
      )}
    </main>
  )
}
