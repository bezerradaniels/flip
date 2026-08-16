import { withSupabase } from 'npm:@supabase/server@1.4.1'

type CouponInput = { code?: string }

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
    if (contentLength > 2_000) return json({ error: 'Requisição inválida.' }, 413, origin)

    try {
      const payload = await req.json() as CouponInput
      const code = String(payload.code || '').trim().toUpperCase()
      if (code.length < 2 || code.length > 40) return json({ error: 'Digite um cupom válido.' }, 400, origin)

      const { data: coupon, error } = await ctx.supabaseAdmin
        .from('coupons')
        .select('code, type, value, starts_at, ends_at, is_active')
        .eq('code', code)
        .maybeSingle()

      if (error) {
        console.error('validate-coupon query failed', error)
        return json({ error: 'Não foi possível validar o cupom.' }, 500, origin)
      }

      const now = Date.now()
      const isValid = coupon?.is_active
        && (!coupon.starts_at || new Date(coupon.starts_at).getTime() <= now)
        && (!coupon.ends_at || new Date(coupon.ends_at).getTime() >= now)

      if (!isValid) return json({ error: 'Cupom inválido ou expirado.' }, 404, origin)

      return json({ coupon: { code: coupon.code, type: coupon.type, value: Number(coupon.value) } }, 200, origin)
    } catch (error) {
      console.error('validate-coupon failed', error)
      return json({ error: 'Não foi possível validar o cupom.' }, 500, origin)
    }
  }),
}
