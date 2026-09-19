import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { renderHeadTags } from './head.js'
import { buildPageMeta } from './site.js'

// Mantém título, descrição, canonical e dados estruturados em dia quando o
// visitante navega entre páginas. A primeira página já vem pronta do build.
export default function SeoManager() {
  const { pathname } = useLocation()
  const { settings, products, categories, loading } = useStore()

  useEffect(() => {
    if (loading) return
    const meta = buildPageMeta(pathname, { settings, products, categories })
    document.title = meta.title
    document.head.querySelectorAll('[data-seo]').forEach((element) => element.remove())
    document.head.insertAdjacentHTML('beforeend', renderHeadTags(meta))
  }, [pathname, settings, products, categories, loading])

  return null
}
