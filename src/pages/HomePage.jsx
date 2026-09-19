import { ArrowDownUp, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FaqList from '../components/FaqList.jsx'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { storeDescription, storeTitle } from '../seo/site.js'

export default function HomePage() {
  const { settings, products, categories, loading, loadError, mode } = useStore()
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('todos')
  const [sort, setSort] = useState('recentes')

  const filtered = useMemo(() => {
    const normalizedTerm = term.trim().toLocaleLowerCase('pt-BR')
    const result = products.filter((product) => {
      const matchesCategory = category === 'todos' || product.category.id === category
      const searchable = `${product.name} ${product.category.name} ${product.brand || ''}`.toLocaleLowerCase('pt-BR')
      return matchesCategory && searchable.includes(normalizedTerm)
    })
    return [...result].sort((a, b) => {
      if (sort === 'menor-preco') return a.price - b.price
      if (sort === 'maior-preco') return b.price - a.price
      return 0
    })
  }, [products, category, term, sort])

  const featured = products.filter((product) => product.is_featured).slice(0, 4)
  const heroProducts = (featured.length ? featured : products).slice(0, 4)
  const heroImage = settings.hero_image_url

  return (
    <main>
      <section className="home-hero">
        <div className={`home-hero__visual ${heroImage ? '' : 'is-loading'}`} style={heroImage ? { '--hero-image': `url("${heroImage}")` } : undefined}>
          <div className="hero-products">
            {heroProducts.map((product) => (
              <Link key={product.id} to={`/produto/${product.slug}`} className="hero-product">
                <img src={product.images?.[0]?.url} alt="" />
                <span>{product.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="catalog-section" id="catalogo">
        <header className="home-intro">
          <h1>{storeTitle(settings)}</h1>
          <p>{storeDescription(settings)}</p>
        </header>
        {loadError && <div className="notice"><b>Não foi possível atualizar o catálogo.</b> {products.length ? 'Mostrando a última versão carregada.' : 'Verifique sua conexão e recarregue a página.'}</div>}
        {mode === 'demo' && !loadError && <div className="demo-pill">Prévia visual · mockups, artes e valores meramente ilustrativos</div>}

        <div className="catalog-tools">
          <label className="search-box">
            <span className="sr-only">Buscar no catálogo</span>
            <Search size={19} />
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Buscar no catálogo" />
            {term && <button type="button" onClick={() => setTerm('')}>Limpar</button>}
          </label>
          <label className="sort-box">
            <span className="sr-only">Ordenar produtos</span>
            <ArrowDownUp size={17} />
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar produtos">
              <option value="recentes">Mais recentes</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
            </select>
          </label>
        </div>
        <div className="category-chips" aria-label="Filtrar por categoria">
          <button className={category === 'todos' ? 'is-active' : ''} type="button" onClick={() => setCategory('todos')}>Todos</button>
          {categories.map((item) => <button className={category === item.id ? 'is-active' : ''} type="button" key={item.id} onClick={() => setCategory(item.id)}>{item.name}</button>)}
        </div>

        {loading ? <ProductGridSkeleton /> : <ProductGrid products={filtered} />}
      </section>

      <div className="home-faq">
        <FaqList faqs={settings.faqs} />
      </div>
    </main>
  )
}
