import { policies } from '../content/policies.js'

export const SITE_URL = (import.meta.env?.VITE_SITE_URL || 'https://flipartigosreligiosos.com.br').replace(/\/$/, '')
export const DEFAULT_GOOGLE_CATEGORY = 'Religious & Ceremonial > Religious Items'
export const RETURN_DAYS = 7

export const absoluteUrl = (path = '/') => {
  if (!path) return SITE_URL
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export const productPath = (product) => `/produto/${product.slug}`
export const categoryPath = (category) => `/categoria/${category.slug}`
export const policyPath = (policy) => `/politicas/${policy.slug}`

export const plainText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim()

export function truncate(value = '', length = 160) {
  const text = plainText(value)
  if (text.length <= length) return text
  const cut = text.slice(0, length - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > length * 0.6 ? cut.lastIndexOf(' ') : cut.length)}…`
}

export const cityFromAddress = (address = '') => plainText(address).split(',')[0]?.trim() || ''
export const regionFromAddress = (address = '') => plainText(address).split(',')[1]?.trim() || ''

export const validFaqs = (faqs) => (Array.isArray(faqs) ? faqs : [])
  .map((item) => ({ question: plainText(item?.question), answer: plainText(item?.answer) }))
  .filter((item) => item.question && item.answer)

export const activeCategories = (catalog) => (catalog.categories || []).filter((category) => category.is_active !== false)

export const productsInCategory = (catalog, category) => (catalog.products || [])
  .filter((product) => product.category?.id === category.id)

export const storeTitle = (settings) => plainText(settings.seo_title) || `${settings.name} Artigos Religiosos`
export const storeDescription = (settings) => plainText(settings.seo_description) || truncate(settings.about, 160)

function productPrice(product) {
  const prices = (product.variants?.length ? product.variants : [null])
    .map((variant) => (variant?.price_override ?? product.price))
    .map(Number)
    .filter((value) => Number.isFinite(value))
  return { low: Math.min(...prices), high: Math.max(...prices) }
}

const inStock = (stock) => stock === null || stock === undefined || Number(stock) > 0

export function productAvailability(product) {
  if (product.variants?.length) return product.variants.some((variant) => inStock(variant.stock))
  return inStock(product.stock)
}

// Schema.org ---------------------------------------------------------------

export function storeSchema(settings) {
  const sameAs = [settings.instagram_url].filter(Boolean)
  return {
    '@type': 'Store',
    '@id': `${SITE_URL}/#loja`,
    name: settings.name,
    description: storeDescription(settings),
    url: `${SITE_URL}/`,
    image: settings.hero_image_url ? absoluteUrl(settings.hero_image_url) : undefined,
    logo: settings.logo_url ? absoluteUrl(settings.logo_url) : undefined,
    telephone: settings.phone || undefined,
    email: settings.email || undefined,
    address: settings.address ? {
      '@type': 'PostalAddress',
      addressLocality: cityFromAddress(settings.address),
      addressRegion: regionFromAddress(settings.address) || undefined,
      addressCountry: 'BR',
    } : undefined,
    paymentAccepted: (settings.payment_methods || []).join(', ') || undefined,
    currenciesAccepted: 'BRL',
    sameAs: sameAs.length ? sameAs : undefined,
  }
}

const websiteSchema = (settings) => ({
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#site`,
  url: `${SITE_URL}/`,
  name: settings.name,
  inLanguage: 'pt-BR',
  publisher: { '@id': `${SITE_URL}/#loja` },
})

const breadcrumbSchema = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

const faqSchema = (faqs) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
})

const returnPolicySchema = () => ({
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'BR',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: RETURN_DAYS,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  merchantReturnLink: absoluteUrl('/politicas/trocas-e-devolucoes'),
})

export function productSchema(product, settings) {
  const url = absoluteUrl(productPath(product))
  const { low, high } = productPrice(product)
  const availability = productAvailability(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const offerBase = {
    priceCurrency: 'BRL',
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    url,
    seller: { '@id': `${SITE_URL}/#loja` },
    hasMerchantReturnPolicy: returnPolicySchema(),
  }
  return {
    '@type': 'Product',
    '@id': `${url}#produto`,
    name: product.name,
    description: plainText(product.description) || `${product.name} — ${product.category?.name || 'artigo religioso'} da ${settings.name}.`,
    url,
    image: (product.images || []).map((image) => absoluteUrl(image.url)).filter(Boolean),
    sku: product.id,
    category: product.category?.name || undefined,
    brand: { '@type': 'Brand', name: product.brand || settings.name },
    weight: product.weight_kg ? { '@type': 'QuantitativeValue', value: product.weight_kg, unitCode: 'KGM' } : undefined,
    offers: low === high
      ? { '@type': 'Offer', ...offerBase, price: low.toFixed(2) }
      : { '@type': 'AggregateOffer', ...offerBase, lowPrice: low.toFixed(2), highPrice: high.toFixed(2), offerCount: product.variants.length },
  }
}

// Metadados por página -----------------------------------------------------

const withStore = (settings, nodes) => ({
  '@context': 'https://schema.org',
  '@graph': [storeSchema(settings), websiteSchema(settings), ...nodes].map(removeEmpty),
})

function removeEmpty(value) {
  if (Array.isArray(value)) return value.map(removeEmpty)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, removeEmpty(item)]))
}

const firstImage = (product) => product?.images?.[0]?.url

export function buildPageMeta(pathname, catalog) {
  const { settings } = catalog
  const path = pathname.replace(/\/+$/, '') || '/'
  const base = {
    siteName: settings.name,
    image: absoluteUrl(settings.hero_image_url || settings.logo_url || '/hero-flip-personalizados.jpg'),
    robots: 'index, follow',
    type: 'website',
  }

  if (path === '/') {
    const faqs = validFaqs(settings.faqs)
    return {
      ...base,
      title: storeTitle(settings),
      description: storeDescription(settings),
      canonical: `${SITE_URL}/`,
      jsonLd: withStore(settings, faqs.length ? [faqSchema(faqs)] : []),
    }
  }

  if (path === '/sobre') {
    return {
      ...base,
      title: `Sobre a ${settings.name} | ${storeTitle(settings)}`,
      description: truncate(settings.about || storeDescription(settings)),
      canonical: absoluteUrl('/sobre'),
      jsonLd: withStore(settings, [breadcrumbSchema([{ name: 'Início', path: '/' }, { name: 'Sobre', path: '/sobre' }])]),
    }
  }

  const productMatch = path.match(/^\/produto\/([^/]+)$/)
  if (productMatch) {
    const product = catalog.products.find((item) => item.slug === productMatch[1])
    if (product) {
      const faqs = validFaqs(product.faqs)
      const crumbs = [{ name: 'Início', path: '/' }]
      if (product.category?.slug && product.category.id) crumbs.push({ name: product.category.name, path: categoryPath(product.category) })
      crumbs.push({ name: product.name, path: productPath(product) })
      return {
        ...base,
        type: 'product',
        title: `${product.name} | ${settings.name}`,
        description: truncate(product.description || `${product.name}: ${product.category?.name || 'artigo religioso'} na ${settings.name}. ${storeDescription(settings)}`),
        canonical: absoluteUrl(productPath(product)),
        image: absoluteUrl(firstImage(product) || base.image),
        product,
        jsonLd: withStore(settings, [productSchema(product, settings), breadcrumbSchema(crumbs), ...(faqs.length ? [faqSchema(faqs)] : [])]),
      }
    }
  }

  const categoryMatch = path.match(/^\/categoria\/([^/]+)$/)
  if (categoryMatch) {
    const category = activeCategories(catalog).find((item) => item.slug === categoryMatch[1])
    if (category) {
      const products = productsInCategory(catalog, category)
      return {
        ...base,
        title: `${category.name} | ${settings.name} Artigos Religiosos`,
        description: truncate(category.description || `${category.name} na ${settings.name}: ${products.length} ${products.length === 1 ? 'opção' : 'opções'} de artigos religiosos com envio para todo o Brasil.`),
        canonical: absoluteUrl(categoryPath(category)),
        image: absoluteUrl(firstImage(products[0]) || base.image),
        jsonLd: withStore(settings, [
          {
            '@type': 'CollectionPage',
            name: category.name,
            url: absoluteUrl(categoryPath(category)),
            description: plainText(category.description) || undefined,
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: products.map((product, index) => ({ '@type': 'ListItem', position: index + 1, url: absoluteUrl(productPath(product)), name: product.name })),
            },
          },
          breadcrumbSchema([{ name: 'Início', path: '/' }, { name: category.name, path: categoryPath(category) }]),
        ]),
      }
    }
  }

  const policyMatch = path.match(/^\/politicas\/([^/]+)$/)
  if (policyMatch) {
    const policy = policies.find((item) => item.slug === policyMatch[1])
    if (policy) {
      return {
        ...base,
        title: `${policy.title} | ${settings.name}`,
        description: policy.summary,
        canonical: absoluteUrl(policyPath(policy)),
        jsonLd: withStore(settings, [breadcrumbSchema([{ name: 'Início', path: '/' }, { name: policy.title, path: policyPath(policy) }])]),
      }
    }
  }

  if (path === '/pedido' || path === '/admin') {
    return { ...base, title: path === '/admin' ? `Painel | ${settings.name}` : `Finalizar pedido | ${settings.name}`, description: storeDescription(settings), canonical: absoluteUrl(path), robots: 'noindex, nofollow', jsonLd: null }
  }

  return { ...base, title: `Página não encontrada | ${settings.name}`, description: storeDescription(settings), canonical: null, robots: 'noindex, follow', jsonLd: null, notFound: true }
}
