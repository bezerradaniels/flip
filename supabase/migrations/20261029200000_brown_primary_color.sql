-- Troca a cor principal da loja do verde para o marrom. O app aplica
-- store_settings.primary_color em --brand, então sem isso os botões continuariam
-- verdes. Só altera lojas que ainda estão no verde padrão antigo.

alter table public.store_settings alter column primary_color set default '#7a4a22';

update public.store_settings
set primary_color = '#7a4a22'
where lower(primary_color) = '#176b46';
