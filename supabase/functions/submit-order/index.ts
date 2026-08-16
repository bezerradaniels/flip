import { withSupabase } from 'npm:@supabase/server@1.4.1'
import { Resend } from 'npm:resend@4.1.2'

type OrderInput = {
  customerName?: string
  customerPhone?: string
  customerEmail?: string | null
  deliveryMethod?: string | null
  paymentMethod?: string | null
  couponCode?: string | null
  note?: string | null
  items?: Array<{ productId?: string; variantId?: string | null; quantity?: number }>
}

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

function corsHeaders(origin: string | null) {
  const allowedOrigin = !allowedOrigins.length || (origin && allowedOrigins.includes(origin)) ? (origin || '*') : 'null'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return Response.json(body, { status, headers: corsHeaders(origin) })
}

export default {
  fetch: withSupabase({ auth: 'publishable' }, async (req, ctx) => {
    const origin = req.headers.get('origin')
    if (allowedOrigins.length && (!origin || !allowedOrigins.includes(origin))) return json({ error: 'Origem não autorizada.' }, 403, origin)
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
    if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, origin)

    const contentLength = Number(req.headers.get('content-length') || 0)
    if (contentLength > 50_000) return json({ error: 'Pedido muito grande.' }, 413, origin)

    try {
      const payload = await req.json() as OrderInput
      const customerName = payload.customerName?.trim() || ''
      const customerPhone = payload.customerPhone?.trim() || ''
      const items = Array.isArray(payload.items) ? payload.items : []

      if (customerName.length < 2 || customerName.length > 120) return json({ error: 'Informe um nome válido.' }, 400, origin)
      if (customerPhone.length < 8 || customerPhone.length > 30) return json({ error: 'Informe um WhatsApp válido.' }, 400, origin)
      if (!items.length || items.length > 50) return json({ error: 'O pedido precisa ter entre 1 e 50 itens.' }, 400, origin)
      if (items.some((item) => !item.productId || !Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 100)) {
        return json({ error: 'Há itens inválidos no pedido.' }, 400, origin)
      }

      const { data: order, error: orderError } = await ctx.supabaseAdmin.rpc('create_order', {
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_customer_email: payload.customerEmail?.trim() || null,
        p_delivery_method: payload.deliveryMethod?.trim() || null,
        p_payment_method: payload.paymentMethod?.trim() || null,
        p_coupon_code: payload.couponCode?.trim() || null,
        p_note: payload.note?.trim() || null,
        p_items: items,
      })
      if (orderError) return json({ error: orderError.message }, 400, origin)

      let notificationSent = false
      const resendKey = Deno.env.get('RESEND_API_KEY')
      const notificationEmail = Deno.env.get('ORDER_NOTIFICATION_EMAIL')
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
      if (resendKey && notificationEmail && fromEmail) {
        const resend = new Resend(resendKey)
        const itemList = (order.items as Array<{ name: string; quantity: number; variantName?: string | null }>).map((item) => (
          `<li>${item.quantity}x ${escapeHtml(item.name)}${item.variantName ? ` — ${escapeHtml(item.variantName)}` : ''}</li>`
        )).join('')
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [notificationEmail],
          subject: `Novo pedido Flip #${String(order.orderId).slice(0, 8).toUpperCase()}`,
          html: `<h1>Novo pedido</h1><p><b>Cliente:</b> ${escapeHtml(customerName)}<br><b>WhatsApp:</b> ${escapeHtml(customerPhone)}<br><b>Total:</b> R$ ${escapeHtml(order.total)}</p><ul>${itemList}</ul>`,
        })
        notificationSent = !error
        if (error) console.error('Order email failed', error)
      }

      return json({ ...order, notificationSent }, 201, origin)
    } catch (error) {
      console.error('submit-order failed', error)
      return json({ error: 'Não foi possível registrar o pedido.' }, 500, origin)
    }
  }),
}
