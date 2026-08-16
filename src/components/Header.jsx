import { Menu, Share2, ShoppingBag, TicketPercent, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import Brand from './Brand.jsx'

export default function Header() {
  const { cartCount, coupon, setCouponModalOpen, setDrawerOpen } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const share = async () => {
    const payload = { title: 'Flip', text: 'Dá uma olhada no catálogo da Flip.', url: window.location.href }
    if (navigator.share) await navigator.share(payload)
    else await navigator.clipboard?.writeText(window.location.href)
  }

  return (
    <header className="site-header">
      <Brand />
      <button
        className="icon-button site-header__menu"
        type="button"
        onClick={() => setMenuOpen((value) => !value)}
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuOpen}
        aria-controls="site-navigation"
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
      <nav id="site-navigation" className={`site-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
        <NavLink to="/" onClick={() => setMenuOpen(false)}>Início</NavLink>
        <NavLink to="/sobre" onClick={() => setMenuOpen(false)}>Sobre nós</NavLink>
        <button type="button" onClick={() => { setMenuOpen(false); share() }}><Share2 size={16} /> Compartilhar</button>
      </nav>
      <div className="site-header__actions">
        <button className={`coupon-trigger ${coupon ? 'is-active' : ''}`} type="button" onClick={() => setCouponModalOpen(true)} aria-label={coupon ? `Cupom ${coupon.code} aplicado. Gerenciar desconto` : 'Aplicar cupom de desconto'}>
          <TicketPercent size={19} />
          <span>{coupon ? coupon.code : 'Cupom'}</span>
          {coupon && <b>✓</b>}
        </button>
        <button className="cart-trigger" type="button" onClick={() => setDrawerOpen(true)} aria-label={`Abrir sacolinha com ${cartCount} itens`}>
          <ShoppingBag size={19} />
          <span>Sacolinha</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </div>
    </header>
  )
}
