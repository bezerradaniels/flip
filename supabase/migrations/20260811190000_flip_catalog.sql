create extension if not exists "pgcrypto";

create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Flip',
  logo_url text,
  hero_image_url text,
  primary_color text not null default '#176b46' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  whatsapp text not null,
  phone text,
  email text,
  address text,
  instagram_url text,
  about text,
  slogan text,
  payment_methods text[] not null default '{}',
  delivery_methods text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text unique,
  barcode_type text not null default 'none' check (barcode_type in ('none', 'ean', 'upc', 'isbn', 'custom')),
  barcode text,
  brand text,
  unit text not null default 'Unidade',
  condition text not null default 'Novo',
  description text,
  price numeric(12,2) not null check (price >= 0),
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  stock integer check (stock is null or stock >= 0),
  purchase_recurrence text,
  has_brand boolean not null default true,
  has_variations boolean not null default false,
  variation_type text,
  weight_kg numeric(10,3) check (weight_kg is null or weight_kg >= 0),
  height_cm numeric(10,2) check (height_cm is null or height_cm >= 0),
  length_cm numeric(10,2) check (length_cm is null or length_cm >= 0),
  width_cm numeric(10,2) check (width_cm is null or width_cm >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  storage_path text,
  alt_text text,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  price_override numeric(12,2) check (price_override >= 0),
  stock integer check (stock is null or stock >= 0),
  position smallint not null default 0 check (position >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(trim(code)) between 2 and 40),
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(12,2) not null check (value > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create unique index coupons_code_lower_idx on public.coupons (lower(code));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(trim(customer_phone)) between 8 and 30),
  customer_email text,
  delivery_method text,
  payment_method text,
  note text check (note is null or char_length(note) <= 1000),
  coupon_code text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0 and total = subtotal - discount),
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_name text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 100),
  created_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_active_created_idx on public.products (created_at desc) where is_active;
create index products_featured_idx on public.products (created_at desc) where is_active and is_featured;
create index product_images_product_id_idx on public.product_images (product_id);
create index product_variants_product_id_idx on public.product_variants (product_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger store_settings_updated_at before update on public.store_settings for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public reads store settings"
on public.store_settings for select to anon using (true);

create policy "admins manage store settings"
on public.store_settings for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "public reads active categories"
on public.categories for select to anon using (is_active);

create policy "admins manage categories"
on public.categories for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "public reads active products"
on public.products for select to anon using (is_active);

create policy "admins manage products"
on public.products for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "public reads images from active products"
on public.product_images for select to anon
using (exists (select 1 from public.products where products.id = product_images.product_id and products.is_active));

create policy "admins manage product images"
on public.product_images for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "public reads variants from active products"
on public.product_variants for select to anon
using (is_active and exists (select 1 from public.products where products.id = product_variants.product_id and products.is_active));

create policy "admins manage product variants"
on public.product_variants for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins manage coupons"
on public.coupons for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins read orders"
on public.orders for select to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins update orders"
on public.orders for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins read order items"
on public.order_items for select to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

grant usage on schema public to anon, authenticated, service_role;
grant select on public.store_settings, public.categories, public.products, public.product_images, public.product_variants to anon;
grant select, insert, update, delete on public.store_settings, public.categories, public.products, public.product_images, public.product_variants, public.coupons to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on all tables in schema public to service_role;
revoke all on public.coupons, public.orders, public.order_items from anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admins list product image objects"
on storage.objects for select to authenticated
using (bucket_id = 'product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins upload product image objects"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins update product image objects"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
with check (bucket_id = 'product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins delete product image objects"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

create function public.create_order(
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

    select * into v_product from public.products where id = v_product_id and is_active;
    if not found then raise exception 'Um produto não está mais disponível.'; end if;

    if v_variant_id is not null then
      select * into v_variant from public.product_variants where id = v_variant_id and product_id = v_product_id and is_active;
      if not found then raise exception 'Uma variação não está mais disponível.'; end if;
      if v_variant.stock is not null and v_variant.stock < v_quantity then raise exception 'Quantidade indisponível para %.', v_product.name; end if;
      v_unit_price := coalesce(v_variant.price_override, v_product.price);
    else
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

revoke all on function public.create_order(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, text, text, text, text, jsonb) to service_role;

insert into public.store_settings (
  id, name, slogan, hero_image_url, primary_color, whatsapp, phone, email, address, instagram_url, about, payment_methods, delivery_methods
) values (
  1,
  'Flip',
  'Seu desejo vira arte.',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1600&q=85',
  '#176b46',
  '557798634542',
  '(77) 98634-542',
  'ola@flip.com.br',
  'Bom Jesus da Lapa, Bahia',
  'https://www.instagram.com/flipsolucoesemdesign/',
  'A Flip transforma ideias em produtos personalizados. Criamos brindes, impressos, peças em MDF e lembranças para pessoas, festas e empresas, sempre com atendimento próximo e produção sob medida.',
  array['Pix', 'Cartão de crédito e débito', 'Dinheiro'],
  array['Entrega em domicílio', 'PAC', 'SEDEX', 'Motoboy', 'Retirada', 'Entrega digital']
) on conflict (id) do nothing;
