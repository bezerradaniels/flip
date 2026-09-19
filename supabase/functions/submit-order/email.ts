type EmailItem = {
  name: string
  variantName?: string | null
  unitPrice: number | string
  quantity: number
}

export type OrderEmailData = {
  orderId: string
  createdAt: Date
  customerName: string
  customerPhone: string
  customerEmail?: string | null
  deliveryMethod?: string | null
  paymentMethod?: string | null
  couponCode?: string | null
  note?: string | null
  subtotal: number | string
  discount: number | string
  total: number | string
  items: EmailItem[]
  storeName: string
  primaryColor: string
  logoUrl?: string | null
  adminUrl?: string | null
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const money = (value: number | string) => currency.format(Number(value) || 0)

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Bahia',
})

export const shortOrderId = (orderId: string) => String(orderId).slice(0, 8).toUpperCase()

function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`
  return `https://wa.me/${digits}`
}

function safeColor(color: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#176b46'
}

const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"

function infoRow(label: string, value?: string | null) {
  if (!value) return ''
  return `
    <tr>
      <td style="${font}padding:6px 0;font-size:14px;color:#6b7280;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="${font}padding:6px 0;font-size:14px;color:#111827;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`
}

function totalRow(label: string, value: string, strong = false, color = '#111827') {
  const size = strong ? '18px' : '14px'
  const weight = strong ? '700' : '400'
  return `
    <tr>
      <td style="${font}padding:4px 0;font-size:${size};font-weight:${weight};color:${strong ? '#111827' : '#6b7280'};">${escapeHtml(label)}</td>
      <td align="right" style="${font}padding:4px 0;font-size:${size};font-weight:${weight};color:${color};white-space:nowrap;">${escapeHtml(value)}</td>
    </tr>`
}

export function renderOrderEmail(order: OrderEmailData) {
  const color = safeColor(order.primaryColor)
  const code = shortOrderId(order.orderId)
  const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity), 0)
  const discount = Number(order.discount) || 0

  const header = order.logoUrl
    ? `<img src="${escapeHtml(order.logoUrl)}" alt="${escapeHtml(order.storeName)}" height="40" style="display:block;height:40px;width:auto;border:0;">`
    : `<span style="${font}font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${escapeHtml(order.storeName)}</span>`

  const itemRows = order.items.map((item) => `
    <tr>
      <td style="${font}padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
        <div style="font-size:15px;font-weight:600;color:#111827;">${escapeHtml(item.name)}</div>
        ${item.variantName ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${escapeHtml(item.variantName)}</div>` : ''}
        <div style="font-size:13px;color:#6b7280;margin-top:2px;">${Number(item.quantity)} × ${escapeHtml(money(item.unitPrice))}</div>
      </td>
      <td align="right" style="${font}padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;font-size:15px;font-weight:600;color:#111827;white-space:nowrap;">
        ${escapeHtml(money(Number(item.unitPrice) * Number(item.quantity)))}
      </td>
    </tr>`).join('')

  const adminButton = order.adminUrl ? `
    <td style="padding:0 0 0 8px;">
      <a href="${escapeHtml(order.adminUrl)}" style="${font}display:inline-block;padding:12px 20px;border-radius:8px;border:1px solid ${color};color:${color};font-size:14px;font-weight:600;text-decoration:none;">Ver no painel</a>
    </td>` : ''

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>Novo pedido #${code}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(order.customerName)} fez um pedido de ${escapeHtml(money(order.total))} (${itemCount} ${itemCount === 1 ? 'item' : 'itens'}).</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${color};padding:24px 28px;">${header}</td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;">
            <div style="${font}display:inline-block;padding:4px 10px;border-radius:999px;background:#ecfdf3;color:#067647;font-size:12px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">Novo pedido</div>
            <h1 style="${font}margin:12px 0 4px;font-size:26px;line-height:1.25;color:#111827;">Pedido #${code}</h1>
            <p style="${font}margin:0;font-size:14px;color:#6b7280;">Recebido em ${escapeHtml(dateFormat.format(order.createdAt))}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:10px;">
              <tr>
                <td style="padding:16px 20px;">
                  <div style="${font}font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Cliente</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${infoRow('Nome', order.customerName)}
                    ${infoRow('WhatsApp', order.customerPhone)}
                    ${infoRow('E-mail', order.customerEmail)}
                    ${infoRow('Entrega', order.deliveryMethod)}
                    ${infoRow('Pagamento', order.paymentMethod)}
                    ${infoRow('Cupom', order.couponCode)}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${order.note ? `
        <tr>
          <td style="padding:16px 28px 0;">
            <div style="${font}border-left:3px solid ${color};background:#fffbeb;padding:12px 16px;border-radius:0 8px 8px 0;">
              <div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Observação</div>
              <div style="font-size:14px;color:#111827;white-space:pre-line;">${escapeHtml(order.note)}</div>
            </div>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:24px 28px 0;">
            <div style="${font}font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Itens (${itemCount})</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itemRows}</table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${totalRow('Subtotal', money(order.subtotal))}
              ${discount > 0 ? totalRow('Desconto', `− ${money(discount)}`, false, '#067647') : ''}
              <tr><td colspan="2" style="padding-top:8px;border-top:1px solid #e5e7eb;"></td></tr>
              ${totalRow('Total', money(order.total), true, color)}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <a href="${whatsappUrl(order.customerPhone)}" style="${font}display:inline-block;padding:12px 20px;border-radius:8px;background:#25d366;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Chamar no WhatsApp</a>
                </td>
                ${adminButton}
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="${font}margin:16px 0 0;font-size:12px;color:#9ca3af;">Aviso automático da loja ${escapeHtml(order.storeName)}.</p>
    </td>
  </tr>
</table>
</body>
</html>`

  const text = [
    `Novo pedido #${code} — ${dateFormat.format(order.createdAt)}`,
    '',
    `Cliente: ${order.customerName}`,
    `WhatsApp: ${order.customerPhone}`,
    order.customerEmail ? `E-mail: ${order.customerEmail}` : null,
    order.deliveryMethod ? `Entrega: ${order.deliveryMethod}` : null,
    order.paymentMethod ? `Pagamento: ${order.paymentMethod}` : null,
    order.couponCode ? `Cupom: ${order.couponCode}` : null,
    order.note ? `Observação: ${order.note}` : null,
    '',
    'Itens:',
    ...order.items.map((item) => `- ${item.quantity}x ${item.name}${item.variantName ? ` (${item.variantName})` : ''} — ${money(Number(item.unitPrice) * Number(item.quantity))}`),
    '',
    `Subtotal: ${money(order.subtotal)}`,
    discount > 0 ? `Desconto: -${money(discount)}` : null,
    `Total: ${money(order.total)}`,
    '',
    `WhatsApp do cliente: ${whatsappUrl(order.customerPhone)}`,
    order.adminUrl ? `Painel: ${order.adminUrl}` : null,
  ].filter((line) => line !== null).join('\n')

  return { subject: `Novo pedido #${code} — ${money(order.total)}`, html, text }
}
