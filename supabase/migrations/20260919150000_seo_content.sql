-- Conteúdo para SEO, AEO/GEO e Google Shopping.

alter table public.categories
  add column description text check (description is null or char_length(description) <= 2000),
  add column google_product_category text check (google_product_category is null or char_length(google_product_category) <= 250);

comment on column public.categories.description is 'Texto de apresentação da página da categoria.';
comment on column public.categories.google_product_category is 'Categoria da taxonomia do Google usada no feed do Merchant Center.';

alter table public.products
  add column faqs jsonb not null default '[]'::jsonb,
  add constraint products_faqs_array_check check (jsonb_typeof(faqs) = 'array' and jsonb_array_length(faqs) <= 20);

comment on column public.products.faqs is 'Perguntas frequentes do produto: [{"question": "...", "answer": "..."}].';

alter table public.store_settings
  add column seo_title text check (seo_title is null or char_length(seo_title) <= 70),
  add column seo_description text check (seo_description is null or char_length(seo_description) <= 320),
  add column faqs jsonb not null default '[]'::jsonb,
  add constraint store_settings_faqs_array_check check (jsonb_typeof(faqs) = 'array' and jsonb_array_length(faqs) <= 20);

comment on column public.store_settings.seo_title is 'Título principal da página inicial e das buscas.';
comment on column public.store_settings.seo_description is 'Descrição da loja usada na página inicial e nas buscas.';
comment on column public.store_settings.faqs is 'Perguntas frequentes da loja: [{"question": "...", "answer": "..."}].';
