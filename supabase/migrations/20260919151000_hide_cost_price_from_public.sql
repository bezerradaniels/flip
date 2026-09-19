-- O preço de custo não deve ser visível para visitantes. Visitantes (anon)
-- passam a ler só as colunas públicas de products; o painel (authenticated,
-- admin) continua com acesso completo.

revoke select on public.products from anon;

grant select (
  id, category_id, name, slug, sku, barcode_type, barcode, brand, unit, condition, description,
  price, stock, purchase_recurrence, has_brand, has_variations, variation_type,
  weight_kg, height_cm, length_cm, width_cm, is_featured, is_active, created_at, updated_at, faqs
) on public.products to anon;
