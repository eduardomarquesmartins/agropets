-- Enforces coupon purchase thresholds on the server, not only in the checkout UI.
alter table public.coupons
  add column if not exists minimum_purchase_amount decimal(10,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'coupons_minimum_purchase_amount_nonnegative'
      and conrelid = 'public.coupons'::regclass
  ) then
    alter table public.coupons
      add constraint coupons_minimum_purchase_amount_nonnegative
      check (minimum_purchase_amount >= 0);
  end if;
end;
$$;

create or replace function public.redeem_coupon_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  coupon_row public.coupons%rowtype;
  coupon_discount numeric;
begin
  select * into order_row
  from public.orders
  where id = p_order_id and customer_auth_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if order_row.coupon_used is null or order_row.coupon_redeemed_at is not null then
    return;
  end if;

  select * into coupon_row
  from public.coupons
  where code = order_row.coupon_used and active = true
  for update;

  if not found or (coupon_row.expiry is not null and coupon_row.expiry < current_date) then
    raise exception 'Coupon is no longer valid';
  end if;
  if coupon_row.max_uses is not null and coupon_row.used_count >= coupon_row.max_uses then
    raise exception 'Coupon usage limit reached';
  end if;
  if order_row.subtotal < coupon_row.minimum_purchase_amount then
    raise exception 'Minimum purchase amount not reached';
  end if;
  if coupon_row.once_per_cpf and order_row.cpf is not null and exists (
    select 1 from public.orders
    where id <> order_row.id
      and cpf = order_row.cpf
      and coupon_used = coupon_row.code
      and coupon_redeemed_at is not null
  ) then
    raise exception 'Coupon already used for this CPF';
  end if;

  coupon_discount := case
    when coupon_row.type = 'percentage' then order_row.subtotal * coupon_row.value / 100
    else coupon_row.value
  end;
  coupon_discount := least(order_row.subtotal, greatest(0, coupon_discount));

  update public.coupons set used_count = used_count + 1 where id = coupon_row.id;
  update public.orders
  set coupon_redeemed_at = now(),
      discount = least(subtotal, discount + coupon_discount),
      total = greatest(0, subtotal + delivery_fee - least(subtotal, discount + coupon_discount))
  where id = order_row.id;
end;
$$;

revoke all on function public.redeem_coupon_for_order(uuid) from public;
grant execute on function public.redeem_coupon_for_order(uuid) to authenticated;
