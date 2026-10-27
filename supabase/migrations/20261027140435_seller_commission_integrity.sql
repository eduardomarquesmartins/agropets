create index if not exists orders_commission_payout_id_idx
  on public.orders (commission_payout_id)
  where commission_payout_id is not null;

create index if not exists seller_commission_payouts_created_by_idx
  on public.seller_commission_payouts (created_by)
  where created_by is not null;

create or replace function private.sync_seller_commission_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.seller_id is distinct from old.seller_id
    or new.seller_name is distinct from old.seller_name
    or new.seller_referral_code is distinct from old.seller_referral_code
    or new.commission_rate is distinct from old.commission_rate
    or new.commission_amount is distinct from old.commission_amount then
    raise exception 'Seller attribution and commission amount cannot be changed after order creation.';
  end if;

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

drop trigger if exists orders_sync_seller_commission_payment on public.orders;
create trigger orders_sync_seller_commission_payment
  before update of status, payment_status, seller_id, seller_name,
    seller_referral_code, commission_rate, commission_amount,
    commission_status, commission_paid_at, commission_payout_id
  on public.orders
  for each row execute function private.sync_seller_commission_payment();

revoke all on function private.sync_seller_commission_payment() from public, anon, authenticated;

