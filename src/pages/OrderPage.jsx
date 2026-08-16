import { ArrowLeft, CheckCircle2, ChevronDown, CreditCard, MessageCircle, PackageCheck, Send, TicketPercent, Truck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FormField from '../components/FormField.jsx'
import { useStore } from '../context/StoreContext.jsx'
import { submitOrder } from '../services/catalog.js'
import { buildWhatsAppUrl, money } from '../utils/format.js'

const CUSTOMER_KEY = 'flip-customer-v1'

function savedCustomer() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || '{}') } catch { return {} }
}

function StepCard({ number, icon: Icon, title, children }) {
  return (
    <section className="order-card">
      <div className="order-card__title"><span>{number}</span><Icon size={20} /><h2>{title}</h2><ChevronDown size={18} /></div>
      <div className="order-card__content">{children}</div>
    </section>
  )
}

function ChoiceGroup({ label, value, options, onChange }) {
  return (
    <div className="field choice-field">
      <span>{label}</span>
      <div className="choice-grid" role="radiogroup" aria-label={label}>
        {(options || []).map((option) => (
          <label className={value === option ? 'is-selected' : ''} key={option}>
            <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} required />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function OrderPage() {
  const {
    cart, cartSubtotal, cartDiscount, cartTotal, settings, mode, coupon, couponLoading,
    applyCoupon, removeCoupon, getDisplayPrice, clearCart,
  } = useStore()
  const saved = savedCustomer()
  const [form, setForm] = useState({
    name: saved.name || '', phone: saved.phone || '', email: saved.email || '',
    deliveryMethod: settings.delivery_methods?.[0] || '', paymentMethod: settings.payment_methods?.[0] || '',
    coupon: coupon?.code || '', note: '', saveCustomer: Boolean(saved.name),
  })
  const [couponMessage, setCouponMessage] = useState(coupon ? `Cupom ${coupon.code} aplicado.` : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm((current) => ({
      ...current,
      deliveryMethod: settings.delivery_methods?.includes(current.deliveryMethod) ? current.deliveryMethod : settings.delivery_methods?.[0] || '',
      paymentMethod: settings.payment_methods?.includes(current.paymentMethod) ? current.paymentMethod : settings.payment_methods?.[0] || '',
    }))
  }, [settings.delivery_methods, settings.payment_methods])
  useEffect(() => {
    setForm((current) => ({ ...current, coupon: coupon?.code || current.coupon }))
    setCouponMessage(coupon ? `Cupom ${coupon.code} aplicado.` : '')
  }, [coupon])

  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const choose = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))
  const handleApplyCoupon = async () => {
    const code = form.coupon.trim().toUpperCase()
    setCouponMessage('')
    try {
      const applied = await applyCoupon(code)
      setCouponMessage(`Cupom ${applied.code} aplicado.`)
    } catch (couponError) {
      setCouponMessage(couponError.message || 'Cupom inválido ou expirado.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!cart.length) return setError('Sua sacolinha está vazia.')
    if (!form.name.trim() || !form.phone.trim()) return setError('Preencha seu nome e WhatsApp.')
    if (!form.deliveryMethod || !form.paymentMethod) return setError('Escolha entrega e forma de pagamento.')
    setSubmitting(true)
    try {
      if (form.saveCustomer) localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: form.name, phone: form.phone, email: form.email }))
      else localStorage.removeItem(CUSTOMER_KEY)

      let registered = null
      if (mode === 'supabase') {
        registered = await submitOrder({
          customerName: form.name.trim(), customerPhone: form.phone.trim(), customerEmail: form.email.trim() || null,
          deliveryMethod: form.deliveryMethod, paymentMethod: form.paymentMethod,
          couponCode: coupon?.code || null, note: form.note.trim() || null,
          items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
        })
      }

      const order = registered || {
        orderId: null, subtotal: cartSubtotal, discount: cartDiscount, total: cartTotal,
        items: cart.map((item) => ({ ...item })),
      }
      const url = buildWhatsAppUrl(settings.whatsapp, {
        ...order,
        storeName: settings.name,
        customerName: form.name,
        customerPhone: form.phone,
        deliveryMethod: form.deliveryMethod,
        paymentMethod: form.paymentMethod,
        note: form.note,
      })
      clearCart()
      removeCoupon()
      window.location.assign(url)
    } catch (submitError) {
      setError(submitError.message || 'Não foi possível enviar o pedido.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="order-page internal-page">
      <div className="page-toolbar"><Link to="/"><ArrowLeft size={18} /> Continuar escolhendo</Link></div>
      <div className="section-heading"><span className="kicker">Última etapa</span><h1>Preparar pedido</h1><p>Revise suas escolhas e envie tudo para a Flip pelo WhatsApp.</p></div>
      <form className="order-layout" onSubmit={handleSubmit}>
        <div className="order-steps">
          <StepCard number="1" icon={UserRound} title="Seus dados">
            <div className="form-grid">
              <FormField label="Nome completo"><input value={form.name} onChange={change('name')} placeholder="Como podemos te chamar?" autoComplete="name" required /></FormField>
              <FormField label="Celular / WhatsApp"><input value={form.phone} onChange={change('phone')} placeholder="(77) 99999-9999" autoComplete="tel" required /></FormField>
              <FormField label="E-mail" optional><input value={form.email} onChange={change('email')} type="email" placeholder="voce@email.com" autoComplete="email" /></FormField>
            </div>
          </StepCard>
          <StepCard number="2" icon={Truck} title="Como deseja receber?">
            <ChoiceGroup label="Forma de entrega" value={form.deliveryMethod} options={settings.delivery_methods} onChange={choose('deliveryMethod')} />
          </StepCard>
          <StepCard number="3" icon={CreditCard} title="Forma de pagamento">
            <ChoiceGroup label="Pagamento combinado" value={form.paymentMethod} options={settings.payment_methods} onChange={choose('paymentMethod')} />
            <p className="form-hint">Nenhuma cobrança acontece neste site. A forma final será confirmada no atendimento.</p>
          </StepCard>
          <label className="save-customer"><input type="checkbox" checked={form.saveCustomer} onChange={change('saveCustomer')} /><span><i>{form.saveCustomer && <CheckCircle2 size={14} />}</i> Guardar meus dados neste aparelho</span></label>
        </div>

        <aside className="order-sidebar">
          <section className="order-card order-summary">
            <div className="order-card__title"><PackageCheck size={22} /><h2>Seu pedido</h2></div>
            <div className="order-items">
              {cart.map((item) => (
                <div key={item.key}><img src={item.image} alt="" /><span><b>{item.name}</b><small>{item.quantity}x{item.variantName ? ` ${item.variantName}` : ''}</small></span><strong>{money(getDisplayPrice(item.unitPrice * item.quantity))}</strong></div>
              ))}
              {!cart.length && <p>Sua sacolinha está vazia.</p>}
            </div>
            <div className="order-totals">
              <span>Subtotal <b>{money(cartSubtotal)}</b></span>
              {cartDiscount > 0 && <span className="discount-line">Desconto {coupon?.code && `· ${coupon.code}`} <b>-{money(cartDiscount)}</b></span>}
              <strong>Total <b>{money(cartTotal)}</b></strong>
            </div>
          </section>
          <section className="order-card coupon-card">
            <div className="order-card__title"><TicketPercent size={21} /><h2>Aplicar cupom</h2></div>
            <div className="coupon-row"><input value={form.coupon} onChange={change('coupon')} placeholder="Digite o código" /><button type="button" onClick={handleApplyCoupon} disabled={couponLoading}>{couponLoading ? 'Verificando…' : 'Aplicar'}</button></div>
            {couponMessage && <small>{couponMessage}</small>}
            {coupon && <button className="coupon-card__remove" type="button" onClick={() => { removeCoupon(); setForm((current) => ({ ...current, coupon: '' })) }}>Remover cupom</button>}
          </section>
          <section className="order-card">
            <FormField label="Adicionar um comentário" optional><textarea value={form.note} onChange={change('note')} placeholder="Cor, horário, referência de entrega…" /></FormField>
          </section>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button--primary button--full order-submit" type="submit" disabled={submitting || !cart.length}>
            {submitting ? 'Registrando pedido…' : <><Send size={18} /> Enviar pedido pelo WhatsApp</>}
          </button>
          <p className="order-secure"><MessageCircle size={15} /> Você será direcionado para o WhatsApp da {settings.name}.</p>
        </aside>
      </form>
    </main>
  )
}
