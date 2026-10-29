-- Controle de estoque no pedido: trava as linhas, valida o estoque do produto
-- (antes só o da variação era validado) e decrementa ao registrar o pedido.
-- stock NULL = estoque não controlado (nunca bloqueia nem decrementa).
-- A devolução de estoque ao cancelar fica no trigger orders_sync_stock
-- (migration 20261029094945_restore_stock_on_cancel.sql).

create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_method text,
  p_payment_method text,
  p_coupon_code text,
  p_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2);
  v_coupon public.coupons%rowtype;
  v_order_id uuid;
  v_normalized_items jsonb := '[]'::jsonb;
begin
  if char_length(trim(p_customer_name)) not between 2 and 120 then raise exception 'Nome inválido.'; end if;
  if char_length(trim(p_customer_phone)) not between 8 and 30 then raise exception 'WhatsApp inválido.'; end if;
  if p_customer_email is not null and char_length(p_customer_email) > 254 then raise exception 'E-mail inválido.'; end if;
  if p_note is not null and char_length(p_note) > 1000 then raise exception 'Observação muito longa.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Pedido sem itens válidos.'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'productId')::uuid;
    v_variant_id := nullif(v_item ->> 'variantId', '')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity not between 1 and 100 then raise exception 'Quantidade inválida.'; end if;

    select * into v_product from public.products where id = v_product_id and is_active for update;
    if not found then raise exception 'Um produto não está mais disponível.'; end if;

    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id = v_variant_id and product_id = v_product_id and is_active for update;
      if not found then raise exception 'Uma variação não está mais disponível.'; end if;
      if v_variant.stock is not null and v_variant.stock < v_quantity then raise exception 'Quantidade indisponível para %.', v_product.name; end if;
      v_unit_price := coalesce(v_variant.price_override, v_product.price);
      if v_variant.stock is not null then update public.product_variants set stock = stock - v_quantity where id = v_variant.id; end if;
    else
      if v_product.stock is not null and v_product.stock < v_quantity then raise exception 'Quantidade indisponível para %.', v_product.name; end if;
      if v_product.stock is not null then update public.products set stock = stock - v_quantity where id = v_product.id; end if;
      v_variant.id := null;
      v_variant.name := null;
      v_unit_price := v_product.price;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    v_normalized_items := v_normalized_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'variantId', v_variant.id,
      'name', v_product.name,
      'variantName', v_variant.name,
      'unitPrice', v_unit_price,
      'quantity', v_quantity
    ));
  end loop;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon from public.coupons
    where lower(code) = lower(trim(p_coupon_code))
      and is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now());
    if not found then raise exception 'Cupom inválido ou expirado.'; end if;
    if v_coupon.type = 'percentage' then
      v_discount := round(v_subtotal * v_coupon.value / 100, 2);
    else
      v_discount := least(v_subtotal, v_coupon.value);
    end if;
  end if;

  v_total := v_subtotal - v_discount;
  insert into public.orders (
    customer_name, customer_phone, customer_email, delivery_method, payment_method,
    note, coupon_code, subtotal, discount, total
  ) values (
    trim(p_customer_name), trim(p_customer_phone), nullif(trim(p_customer_email), ''),
    nullif(trim(p_delivery_method), ''), nullif(trim(p_payment_method), ''), nullif(trim(p_note), ''),
    nullif(upper(trim(p_coupon_code)), ''), v_subtotal, v_discount, v_total
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, unit_price, quantity)
  select v_order_id, (item ->> 'productId')::uuid, nullif(item ->> 'variantId', '')::uuid,
    item ->> 'name', nullif(item ->> 'variantName', ''), (item ->> 'unitPrice')::numeric, (item ->> 'quantity')::integer
  from jsonb_array_elements(v_normalized_items) item;

  return jsonb_build_object(
    'orderId', v_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_total,
    'items', v_normalized_items
  );
end;
$$;
