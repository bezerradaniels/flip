update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
where lower(email) = lower('apps@flipsolucoes.com.br');

select id, email, raw_app_meta_data ->> 'role' as role
from auth.users
where lower(email) = lower('apps@flipsolucoes.com.br');
