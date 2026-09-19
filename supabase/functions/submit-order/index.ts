import { withSupabase } from 'npm:@supabase/server@1.4.1'
import { Resend } from 'npm:resend@4.1.2'
import { renderOrderEmail } from './email.ts'

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
      const notificationEmails = (Deno.env.get('ORDER_NOTIFICATION_EMAIL') || '')
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean)
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
      if (resendKey && notificationEmails.length && fromEmail) {
        try {
          const { data: settings } = await ctx.supabaseAdmin
            .from('store_settings')
            .select('name, primary_color, logo_url')
            .maybeSingle()
          const email = renderOrderEmail({
            orderId: order.orderId,
            createdAt: new Date(),
            customerName,
            customerPhone,
            customerEmail: payload.customerEmail?.trim() || null,
            deliveryMethod: payload.deliveryMethod?.trim() || null,
            paymentMethod: payload.paymentMethod?.trim() || null,
            couponCode: payload.couponCode?.trim().toUpperCase() || null,
            note: payload.note?.trim() || null,
            subtotal: order.subtotal,
            discount: order.discount,
            total: order.total,
            items: order.items,
            storeName: settings?.name || 'Flip',
            primaryColor: settings?.primary_color || '#176b46',
            logoUrl: settings?.logo_url || null,
            adminUrl: origin ? `${origin}/admin` : null,
          })
          const { error } = await new Resend(resendKey).emails.send({
            from: fromEmail,
            to: notificationEmails,
            replyTo: payload.customerEmail?.trim() || undefined,
            ...email,
          })
          notificationSent = !error
          if (error) console.error('Order email failed', error)
        } catch (error) {
          console.error('Order email failed', error)
        }
      }

      return json({ ...order, notificationSent }, 201, origin)
    } catch (error) {
      console.error('submit-order failed', error)
      return json({ error: 'Não foi possível registrar o pedido.' }, 500, origin)
    }
  }),
}
