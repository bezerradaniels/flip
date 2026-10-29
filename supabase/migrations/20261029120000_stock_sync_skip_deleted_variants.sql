-- Corrige sync_stock_on_order_status: quando a variação de um item é excluída,
-- order_items.variant_id vira NULL (on delete set null) e o trigger passava a
-- mexer no estoque do produto. Item que tinha variação (variant_name preenchido
-- por create_order) e perdeu a variação agora é ignorado.

create or replace function public.sync_stock_on_order_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item record;
  v_delta integer;
begin
  if (old.status = 'cancelled') = (new.status = 'cancelled') then
    return new;
  end if;

  -- Cancelou: devolve (+). Reabriu: retira de novo (-).
  v_delta := case when new.status = 'cancelled' then 1 else -1 end;

  for v_item in
    select oi.product_id, oi.variant_id, oi.variant_name, oi.quantity, oi.product_name
    from public.order_items oi
    where oi.order_id = new.id
  loop
    if v_item.variant_id is not null then
      update public.product_variants
      set stock = stock + v_delta * v_item.quantity
      where id = v_item.variant_id and stock is not null
        and stock + v_delta * v_item.quantity >= 0;
      if v_delta < 0 and not found and exists (
        select 1 from public.product_variants where id = v_item.variant_id and stock is not null
      ) then
        raise exception 'Estoque insuficiente para reabrir o pedido (%).', v_item.product_name;
      end if;
    elsif v_item.variant_name is null and v_item.product_id is not null then
      update public.products
      set stock = stock + v_delta * v_item.quantity
      where id = v_item.product_id and stock is not null
        and stock + v_delta * v_item.quantity >= 0;
      if v_delta < 0 and not found and exists (
        select 1 from public.products where id = v_item.product_id and stock is not null
      ) then
        raise exception 'Estoque insuficiente para reabrir o pedido (%).', v_item.product_name;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.sync_stock_on_order_status() from public, anon, authenticated;
