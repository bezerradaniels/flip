import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import CartDrawer from '../components/CartDrawer.jsx'
import CouponModal from '../components/CouponModal.jsx'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import WhatsAppFloat from '../components/WhatsAppFloat.jsx'
import AboutPage from '../pages/AboutPage.jsx'
import CategoryPage from '../pages/CategoryPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import OrderPage from '../pages/OrderPage.jsx'
import PolicyPage from '../pages/PolicyPage.jsx'
import ProductPage from '../pages/ProductPage.jsx'
import SeoManager from '../seo/SeoManager.jsx'

// O painel só é baixado por quem acessa /admin.
const AdminPage = lazy(() => import('../pages/AdminPage.jsx'))

function StoreLayout({ children }) {
  const { pathname } = useLocation()
  const showWhatsAppFloat = !pathname.startsWith('/produto/') && pathname !== '/pedido'

  return (
    <>
      <Header />
      {children}
      <Footer />
      <CartDrawer />
      <CouponModal />
      {showWhatsAppFloat && <WhatsAppFloat />}
    </>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <SeoManager />
      <Routes>
        <Route path="/" element={<StoreLayout><HomePage /></StoreLayout>} />
        <Route path="/produto/:slug" element={<StoreLayout><ProductPage /></StoreLayout>} />
        <Route path="/categoria/:slug" element={<StoreLayout><CategoryPage /></StoreLayout>} />
        <Route path="/politicas/:slug" element={<StoreLayout><PolicyPage /></StoreLayout>} />
        <Route path="/sobre" element={<StoreLayout><AboutPage /></StoreLayout>} />
        <Route path="/pedido" element={<StoreLayout><OrderPage /></StoreLayout>} />
        <Route path="/admin" element={<Suspense fallback={<div className="page-loading">Carregando painel…</div>}><AdminPage /></Suspense>} />
        <Route path="*" element={<StoreLayout><NotFoundPage /></StoreLayout>} />
      </Routes>
    </>
  )
}
