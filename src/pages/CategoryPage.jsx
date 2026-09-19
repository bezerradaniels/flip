import { useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { activeCategories, categoryPath, productsInCategory } from '../seo/site.js'
import NotFoundPage from './NotFoundPage.jsx'

export default function CategoryPage() {
  const { slug } = useParams()
  const { settings, products, categories, loading } = useStore()
  const category = activeCategories({ categories }).find((item) => item.slug === slug)

  if (loading && !category) return <main className="internal-page"><ProductGridSkeleton /></main>
  if (!category) return <NotFoundPage />

  const items = productsInCategory({ products }, category)
  return (
    <main className="internal-page category-page">
      <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: category.name, path: categoryPath(category) }]} />
      <header className="section-heading category-page__head">
        <span className="kicker">{settings.name} · Artigos religiosos</span>
        <h1>{category.name}</h1>
        {category.description && <p>{category.description}</p>}
      </header>
      <ProductGrid products={items} />
    </main>
  )
}
