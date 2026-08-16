import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import { money } from '../utils/format.js'

export default function CartDrawer() {
  const { cart, cartCount, cartSubtotal, cartDiscount, cartTotal, coupon, getDisplayPrice, drawerOpen, setDrawerOpen, updateCart, removeFromCart } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!drawerOpen) return undefined
    const close = (event) => event.key === 'Escape' && setDrawerOpen(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', close)
    }
  }, [drawerOpen, setDrawerOpen])

  return (
    <div className={`drawer-layer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen} inert={!drawerOpen ? '' : undefined}>
      <button className="drawer-backdrop" type="button" aria-label="Fechar sacolinha" onClick={() => setDrawerOpen(false)} />
      <aside className="cart-drawer" aria-label="Sua sacolinha">
        <div className="cart-drawer__head">
          <div><span className="eyebrow">Seu pedido</span><h2>{cartCount ? `${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Sacolinha vazia'}</h2></div>
          <button className="icon-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar"><X /></button>
        </div>
        {cart.length === 0 ? (
          <div className="cart-empty"><ShoppingBag size={36} /><h3>Escolha sem pressa</h3><p>Os produtos adicionados aparecerão aqui.</p></div>
        ) : (
          <>
            <div className="cart-list">
              {cart.map((item) => (
                <div className="cart-item" key={item.key}>
                  <img src={item.image} alt="" />
                  <div className="cart-item__info">
                    <strong>{item.name}</strong>
                    {item.variantName && <small>{item.variantName}</small>}
                    <div className="quantity-control">
                      <button type="button" onClick={() => updateCart(item.key, -1)} aria-label="Diminuir quantidade"><Minus size={14} /></button>
                      <b>{item.quantity}</b>
                      <button type="button" onClick={() => updateCart(item.key, 1)} aria-label="Aumentar quantidade"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="cart-item__end">
                    <button type="button" onClick={() => removeFromCart(item.key)} aria-label={`Remover ${item.name}`}><Trash2 size={15} /></button>
                    <strong>{money(getDisplayPrice(item.unitPrice * item.quantity))}</strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-drawer__footer">
              <div className="cart-drawer__totals">
                {coupon && <span><small>Subtotal</small><b>{money(cartSubtotal)}</b></span>}
                {cartDiscount > 0 && <span className="discount-line"><small>Desconto · {coupon.code}</small><b>-{money(cartDiscount)}</b></span>}
                <span className="cart-drawer__total"><small>Total</small><strong>{money(cartTotal)}</strong></span>
              </div>
              <button className="button button--primary button--full" type="button" onClick={() => { setDrawerOpen(false); navigate('/pedido') }}>Preparar pedido</button>
              <small>Pagamento e entrega serão combinados pelo WhatsApp.</small>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
