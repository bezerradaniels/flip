import { CheckCircle2, TicketPercent, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext.jsx'
import { money } from '../utils/format.js'

export default function CouponModal() {
  const { coupon, couponLoading, couponModalOpen, setCouponModalOpen, applyCoupon, removeCoupon, mode } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!couponModalOpen) return
    setCode(coupon?.code || '')
    setError('')
    const close = (event) => event.key === 'Escape' && setCouponModalOpen(false)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', close)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', close)
    }
  }, [couponModalOpen, coupon?.code, setCouponModalOpen])

  if (!couponModalOpen) return null

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await applyCoupon(code)
      setCouponModalOpen(false)
    } catch (applyError) {
      setError(applyError.message || 'Cupom inválido ou expirado.')
    }
  }

  const description = coupon?.type === 'percentage'
    ? `${coupon.value}% de desconto aplicado aos preços do catálogo.`
    : coupon?.type === 'fixed'
      ? `${money(coupon.value)} de desconto aplicado ao total da sacolinha.`
      : 'Aplique seu cupom para ver os preços dos produtos com desconto.'

  return (
    <div className="coupon-modal-layer">
      <button className="coupon-modal-backdrop" type="button" onClick={() => setCouponModalOpen(false)} aria-label="Fechar cupom" />
      <section className="coupon-modal" role="dialog" aria-modal="true" aria-labelledby="coupon-modal-title">
        <button className="coupon-modal__close" type="button" onClick={() => setCouponModalOpen(false)} aria-label="Fechar"><X /></button>
        <span className="coupon-modal__icon"><TicketPercent /></span>
        <h2 id="coupon-modal-title">Aplicar um desconto</h2>
        <p>{description}</p>
        {coupon && <div className="coupon-modal__active"><CheckCircle2 size={18} /><span>Cupom <b>{coupon.code}</b> ativo</span></div>}
        <form onSubmit={submit}>
          <label><span className="sr-only">Código do cupom</span><TicketPercent size={19} /><input autoFocus maxLength={40} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Insira o cupom aqui" autoComplete="off" /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          {mode === 'demo' && !coupon && <small>Na demonstração, experimente o cupom FLIP10.</small>}
          <button className="button button--primary" disabled={couponLoading}>{couponLoading ? 'Verificando…' : coupon ? 'Atualizar desconto' : 'Aplicar desconto'}</button>
        </form>
        {coupon && <button className="coupon-modal__remove" type="button" onClick={() => { removeCoupon(); setCode('') }}><Trash2 size={16} /> Remover cupom</button>}
      </section>
    </div>
  )
}
