alter table public.product_variants
  add column attributes jsonb not null default '{}'::jsonb,
  add constraint product_variants_attributes_object_check
    check (jsonb_typeof(attributes) = 'object');

comment on column public.product_variants.attributes is
  'Structured values used to identify a variation combination, for example {"Cor":"Preto","Tamanho":"P"}.';
