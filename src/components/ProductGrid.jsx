import ProductCard from './ProductCard.jsx'

export function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <div className="empty-state">
        <span>¯\_(ツ)_/¯</span>
        <h3>Nada por aqui ainda</h3>
        <p>Tente outro termo ou escolha uma categoria diferente.</p>
      </div>
    )
  }
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-label="Carregando produtos">
      {Array.from({ length: count }, (_, index) => (
        <div className="product-card skeleton-card" key={index}>
          <div className="skeleton skeleton--image" />
          <div className="product-card__body"><div className="skeleton" /><div className="skeleton skeleton--wide" /><div className="skeleton skeleton--button" /></div>
        </div>
      ))}
    </div>
  )
}
