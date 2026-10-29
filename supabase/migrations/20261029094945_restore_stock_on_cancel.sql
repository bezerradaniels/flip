-- Devolve o estoque quando um pedido é cancelado e o retira de novo se o pedido
-- for reaberto. Espelha create_order: item com variação mexe no estoque da
-- variação; sem variação, no do produto. stock NULL (não controlado) é ignorado.

create function public.sync_stock_on_order_status()
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
    select oi.product_id, oi.variant_id, oi.quantity, oi.product_name
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
    elsif v_item.product_id is not null then
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

create trigger orders_sync_stock
after update of status on public.orders
for each row execute function public.sync_stock_on_order_status();
