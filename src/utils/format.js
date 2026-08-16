export const money = (value = 0) => Number(value).toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export const slugify = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export const getProductPrice = (product, selectedVariant = null) => {
  const override = selectedVariant?.price_override
  return override === null || override === undefined ? Number(product?.price || 0) : Number(override)
}

const currencyValue = (value) => Math.round((Number(value) || 0) * 100) / 100

export function calculateCouponDiscount(amount, coupon) {
  const subtotal = Math.max(0, currencyValue(amount))
  const value = Math.max(0, currencyValue(coupon?.value))
  if (!coupon || !value || !subtotal) return 0
  if (coupon.type === 'percentage') return currencyValue(subtotal * Math.min(value, 100) / 100)
  if (coupon.type === 'fixed') return Math.min(subtotal, value)
  return 0
}

export function getDiscountedProductPrice(price, coupon) {
  const basePrice = Math.max(0, currencyValue(price))
  if (coupon?.type !== 'percentage') return basePrice
  return currencyValue(basePrice - calculateCouponDiscount(basePrice, coupon))
}

export const onlyDigits = (value = '') => String(value).replace(/\D/g, '')

export function buildWhatsAppUrl(whatsapp, order) {
  const lines = order.items.map((item) => (
    `• ${item.quantity}x ${item.name}${item.variantName ? ` (${item.variantName})` : ''} — ${money(item.unitPrice * item.quantity)}`
  ))
  const message = [
    `Olá, ${order.storeName || 'Flip'}! Quero enviar este pedido${order.orderId ? ` #${String(order.orderId).slice(0, 8).toUpperCase()}` : ''}:`,
    '',
    ...lines,
    '',
    order.discount > 0 ? `Desconto: -${money(order.discount)}` : null,
    `Total: ${money(order.total)}`,
    '',
    `Nome: ${order.customerName}`,
    `WhatsApp: ${order.customerPhone}`,
    order.deliveryMethod ? `Entrega: ${order.deliveryMethod}` : null,
    order.paymentMethod ? `Pagamento: ${order.paymentMethod}` : null,
    order.note ? `Observação: ${order.note}` : null,
  ].filter((line) => line !== null).join('\n')

  return `https://wa.me/${onlyDigits(whatsapp)}?text=${encodeURIComponent(message)}`
}
