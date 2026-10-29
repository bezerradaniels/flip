-- Salvar produto, imagens e variações numa única transação.
-- security invoker: as policies de RLS continuam exigindo role admin.
-- Variações são atualizadas por nome (unique product_id+name), preservando o id
-- usado em links ?variante= e no feed do Google.

create function public.save_product(p_product jsonb, p_images jsonb, p_variants jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_product ->> 'id', '')::uuid;
begin
  if jsonb_typeof(p_images) <> 'array' or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Dados inválidos.';
  end if;

  if v_id is null then
    insert into public.products (
      category_id, name, slug, brand, unit, description, price, cost_price, stock, has_brand,
      has_variations, variation_type, weight_kg, height_cm, length_cm, width_cm, is_featured, is_active, faqs
    )
    select category_id, name, slug, brand, unit, description, price, cost_price, stock, has_brand,
      has_variations, variation_type, weight_kg, height_cm, length_cm, width_cm, is_featured, is_active, faqs
    from jsonb_populate_record(null::public.products, p_product)
    returning id into v_id;
  else
    update public.products p set
      category_id = r.category_id, name = r.name, slug = r.slug, brand = r.brand, unit = r.unit,
      description = r.description, price = r.price, cost_price = r.cost_price, stock = r.stock,
      has_brand = r.has_brand, has_variations = r.has_variations, variation_type = r.variation_type,
      weight_kg = r.weight_kg, height_cm = r.height_cm, length_cm = r.length_cm, width_cm = r.width_cm,
      is_featured = r.is_featured, is_active = r.is_active, faqs = r.faqs
    from jsonb_populate_record(null::public.products, p_product) r
    where p.id = v_id;
    if not found then raise exception 'Produto não encontrado.'; end if;
  end if;

  delete from public.product_images where product_id = v_id;
  insert into public.product_images (product_id, url, storage_path, alt_text, position)
  select v_id, i ->> 'url', nullif(i ->> 'storage_path', ''), i ->> 'alt_text', (ord - 1)::smallint
  from jsonb_array_elements(p_images) with ordinality as t(i, ord);

  delete from public.product_variants
  where product_id = v_id
    and name not in (select v ->> 'name' from jsonb_array_elements(p_variants) v);

  insert into public.product_variants (product_id, name, attributes, price_override, stock, position, is_active)
  select v_id, v ->> 'name', coalesce(v -> 'attributes', '{}'::jsonb),
    (v ->> 'price_override')::numeric, (v ->> 'stock')::integer, (ord - 1)::smallint, true
  from jsonb_array_elements(p_variants) with ordinality as t(v, ord)
  on conflict (product_id, name) do update set
    attributes = excluded.attributes, price_override = excluded.price_override,
    stock = excluded.stock, position = excluded.position, is_active = true;

  return v_id;
end;
$$;

revoke all on function public.save_product(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_product(jsonb, jsonb, jsonb) to authenticated;
