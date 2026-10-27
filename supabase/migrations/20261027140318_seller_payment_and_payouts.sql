alter table public.orders
  add column if not exists payment_status text not null default 'pending',
  add column if not exists commission_paid_at timestamptz,
  add column if not exists commission_payout_id uuid;

alter table public.orders
  drop constraint if exists orders_payment_status_valid,
  add constraint orders_payment_status_valid
    check (payment_status in ('pending', 'paid', 'refunded'));

alter table public.orders
  drop constraint if exists orders_commission_status_valid,
  alter column commission_status set default 'awaiting_payment';

update public.orders
set commission_status = 'awaiting_payment'
where commission_status = 'pending';

alter table public.orders
  add constraint orders_commission_status_valid
    check (commission_status in ('awaiting_payment', 'payable', 'paid', 'cancelled'));

create table if not exists public.seller_commission_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.admin_users(id) on delete restrict,
  seller_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  order_ids uuid[] not null check (cardinality(order_ids) > 0),
  payment_method text not null check (payment_method in ('pix', 'transfer', 'cash', 'other')),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.orders
  add constraint orders_commission_payout_id_fkey
  foreign key (commission_payout_id)
  references public.seller_commission_payouts(id)
  on delete set null;

create index if not exists seller_commission_payouts_seller_created_idx
  on public.seller_commission_payouts (seller_id, created_at desc);

alter table public.seller_commission_payouts enable row level security;

create policy seller_commission_payouts_read_staff
  on public.seller_commission_payouts
  for select to authenticated
  using ((select private.is_staff()));

grant select on public.seller_commission_payouts to authenticated;
grant select, insert, update on public.seller_commission_payouts to service_role;
grant select, update on public.orders to service_role;

create or replace function private.initialize_seller_order_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Checkout only creates a payment request. A staff member must confirm settlement.
  new.payment_status := 'pending';
  new.commission_status := 'awaiting_payment';
  new.commission_paid_at := null;
  new.commission_payout_id := null;
  return new;
end;
$$;

drop trigger if exists orders_initialize_seller_payment_before_insert on public.orders;
create trigger orders_initialize_seller_payment_before_insert
  before insert on public.orders
  for each row execute function private.initialize_seller_order_payment();

revoke all on function private.initialize_seller_order_payment() from public, anon, authenticated;

create or replace function private.sync_seller_commission_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    new.commission_status is distinct from old.commission_status
    or new.commission_paid_at is distinct from old.commission_paid_at
    or new.commission_payout_id is distinct from old.commission_payout_id
  ) and current_setting('app.seller_payout_write', true) is distinct from 'true' then
    raise exception 'Commission status can only be changed by the payment workflow or payout service.';
  end if;

  if new.payment_status is distinct from old.payment_status
    and new.payment_status in ('paid', 'refunded')
    and not (select private.is_admin()) then
    raise exception 'Only administrators can confirm or refund an order payment.';
  end if;

  if new.seller_id is null or old.commission_status in ('cancelled', 'paid') then
    return new;
  end if;

  if new.status = 'Cancelado' or new.payment_status = 'refunded' then
    new.commission_status := 'cancelled';
  elsif new.payment_status = 'paid' then
    new.commission_status := 'payable';
  elsif old.payment_status = 'paid' and new.payment_status = 'pending' then
    new.commission_status := 'awaiting_payment';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_cancel_commission_after_status_change on public.orders;
drop trigger if exists orders_sync_seller_commission_payment on public.orders;
create trigger orders_sync_seller_commission_payment
  before update of status, payment_status, commission_status, commission_paid_at, commission_payout_id on public.orders
  for each row execute function private.sync_seller_commission_payment();

revoke all on function private.sync_seller_commission_payment() from public, anon, authenticated;

create or replace function public.record_seller_commission_payout(
  p_seller_id uuid,
  p_order_ids uuid[],
  p_payment_method text,
  p_reference text default null,
  p_notes text default null,
  p_created_by uuid default null
)
returns public.seller_commission_payouts
language plpgsql
set search_path = ''
security invoker
as $$
declare
  selected_count integer;
  unique_count integer;
  payout_amount numeric(12,2);
  selected_seller_name text;
  payout public.seller_commission_payouts%rowtype;
begin
  if p_seller_id is null or p_order_ids is null or cardinality(p_order_ids) = 0 then
    raise exception 'Select at least one commission order.';
  end if;

  select count(distinct order_id) into unique_count
  from unnest(p_order_ids) as ids(order_id);
  if unique_count <> cardinality(p_order_ids) then
    raise exception 'Duplicate order IDs are not allowed.';
  end if;

  perform 1
  from public.orders
  where id = any(p_order_ids)
    and seller_id = p_seller_id
  for update;

  select count(*), coalesce(sum(commission_amount), 0)
  into selected_count, payout_amount
  from public.orders
  where id = any(p_order_ids)
    and seller_id = p_seller_id
    and payment_status = 'paid'
    and commission_status = 'payable';

  if selected_count <> cardinality(p_order_ids) or payout_amount <= 0 then
    raise exception 'All selected orders must have confirmed payment and payable commissions.';
  end if;

  select name into selected_seller_name
  from public.admin_users
  where id = p_seller_id and role = 'seller';

  if selected_seller_name is null then
    raise exception 'Seller not found.';
  end if;

  insert into public.seller_commission_payouts (
    seller_id, seller_name, amount, order_ids, payment_method, reference, notes, created_by
  ) values (
    p_seller_id, selected_seller_name, payout_amount, p_order_ids,
    p_payment_method, nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), p_created_by
  ) returning * into payout;

  perform set_config('app.seller_payout_write', 'true', true);

  update public.orders
  set commission_status = 'paid',
      commission_paid_at = payout.created_at,
      commission_payout_id = payout.id
  where id = any(p_order_ids)
    and seller_id = p_seller_id;

  return payout;
end;
$$;

revoke all on function public.record_seller_commission_payout(uuid, uuid[], text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_seller_commission_payout(uuid, uuid[], text, text, text, uuid) to service_role;

