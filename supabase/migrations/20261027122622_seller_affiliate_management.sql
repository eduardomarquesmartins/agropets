-- Seller accounts share the existing Auth-backed staff directory, but sellers
-- are intentionally excluded from private.is_staff() and its broad data access.
alter table public.admin_users
  add column if not exists affiliate_code text,
  add column if not exists commission_rate numeric(5,2) not null default 10;

alter table public.admin_users
  drop constraint if exists admin_users_commission_rate_range;
alter table public.admin_users
  add constraint admin_users_commission_rate_range
  check (commission_rate >= 0 and commission_rate <= 100);

create unique index if not exists admin_users_affiliate_code_unique
  on public.admin_users (lower(affiliate_code))
  where affiliate_code is not null;

alter table public.orders
  add column if not exists seller_id uuid references public.admin_users(id) on delete set null,
  add column if not exists seller_name text,
  add column if not exists seller_referral_code text,
  add column if not exists commission_rate numeric(5,2),
  add column if not exists commission_amount numeric(10,2) not null default 0,
  add column if not exists commission_status text not null default 'pending';

alter table public.orders
  drop constraint if exists orders_commission_status_valid;
alter table public.orders
  add constraint orders_commission_status_valid
  check (commission_status in ('pending', 'paid', 'cancelled'));

create index if not exists orders_seller_created_at_idx
  on public.orders (seller_id, created_at desc)
  where seller_id is not null;

create or replace function private.is_seller_for_order(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.id = p_seller_id
      and au.auth_user_id = (select auth.uid())
      and au.role = 'seller'
      and au.status = 'active'
  );
$$;

revoke all on function private.is_seller_for_order(uuid) from public;
grant execute on function private.is_seller_for_order(uuid) to authenticated;

create policy orders_read_seller on public.orders
  for select to authenticated
  using ((select private.is_seller_for_order(seller_id)));

create or replace function private.attribute_order_to_seller()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_seller public.admin_users%rowtype;
  entered_code text;
begin
  entered_code := nullif(upper(trim(coalesce(new.seller_referral_code, ''))), '');

  -- Ignore all seller identity and commission values supplied by the client.
  new.seller_id := null;
  new.seller_name := null;
  new.seller_referral_code := null;
  new.commission_rate := null;
  new.commission_amount := 0;
  new.commission_status := 'pending';

  if entered_code is null then
    return new;
  end if;

  select au.* into selected_seller
  from public.admin_users au
  where upper(au.affiliate_code) = entered_code
    and au.role = 'seller'
    and au.status = 'active'
  limit 1;

  if found then
    new.seller_id := selected_seller.id;
    new.seller_name := selected_seller.name;
    new.seller_referral_code := selected_seller.affiliate_code;
    new.commission_rate := selected_seller.commission_rate;
    new.commission_amount := round(
      greatest(0, coalesce(new.subtotal, 0) - coalesce(new.discount, 0))
        * selected_seller.commission_rate / 100,
      2
    );
    new.commission_status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_attribute_seller_before_insert on public.orders;
create trigger orders_attribute_seller_before_insert
  before insert on public.orders
  for each row execute function private.attribute_order_to_seller();

revoke all on function private.attribute_order_to_seller() from public, anon, authenticated;

create or replace function private.cancel_order_commission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'Cancelado' and old.status is distinct from new.status then
    new.commission_status := 'cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_cancel_commission_after_status_change on public.orders;
create trigger orders_cancel_commission_after_status_change
  before update of status on public.orders
  for each row execute function private.cancel_order_commission();

revoke all on function private.cancel_order_commission() from public, anon, authenticated;
