-- Security hardening: Supabase Auth is the only source of identity.
-- Apply only after configuring email and Google providers in Supabase Auth.

create schema if not exists private;
revoke all on schema private from public;

alter table public.customers add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;
alter table public.admin_users add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;
alter table public.orders add column if not exists customer_auth_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists coupon_redeemed_at timestamptz;
alter table public.orders add column if not exists stock_reserved_at timestamptz;

-- Remove the seeded credentials from the legacy custom-auth implementation.
delete from public.admin_users
where email in ('admin@agropets.com.br', 'vet@agropets.com.br');

alter table public.customers drop column if exists password;
alter table public.admin_users drop column if exists password;

-- Never derive authorization from user_metadata. Staff access is bound manually
-- to auth.users.auth_user_id by a service-role/database administrator.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = (select auth.uid())
      and status = 'active'
      and role in ('admin', 'vet', 'editor')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where auth_user_id = (select auth.uid())
      and status = 'active'
      and role = 'admin'
  );
$$;

revoke all on function private.is_staff() from public;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- New customer profiles are created only by the Auth trigger. The trigger does
-- not assign roles, preventing signup metadata from becoming authorization.
create or replace function private.provision_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customers (auth_user_id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (email) do update
    set auth_user_id = excluded.auth_user_id
    where public.customers.auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists agropets_provision_customer_profile on auth.users;
create trigger agropets_provision_customer_profile
  after insert on auth.users
  for each row execute procedure private.provision_customer_profile();

-- Remove every policy created by the legacy "public read/write" script.
do $$
declare policy_record record;
begin
  for policy_record in
    select pol.polname, cls.relname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.polname, policy_record.relname);
  end loop;
end;
$$;

alter table public.settings enable row level security;
alter table public.delivery_fees enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.admin_users enable row level security;
alter table public.customers enable row level security;
alter table public.coupons enable row level security;
alter table public.transactions enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.orders enable row level security;
alter table public.appointments enable row level security;
alter table public.banners enable row level security;
alter table public.pets enable row level security;
alter table public.medical_records enable row level security;
alter table public.product_reviews enable row level security;

-- Public catalogue data. Staff can also see draft/inactive records.
create policy products_read on public.products for select to anon, authenticated
  using (status = 'active' or (select private.is_staff()));
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy banners_read on public.banners for select to anon, authenticated
  using (status = 'active' or (select private.is_staff()));
create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy delivery_fees_read on public.delivery_fees for select to anon, authenticated using (true);
create policy reviews_read on public.product_reviews for select to anon, authenticated using (true);
create policy reviews_create_own on public.product_reviews for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy reviews_edit_own on public.product_reviews for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reviews_delete_own on public.product_reviews for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Customer data is visible only to its owner or staff.
create policy customers_read_own on public.customers for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select private.is_staff()));
create policy customers_update_own on public.customers for update to authenticated
  using (auth_user_id = (select auth.uid()) or (select private.is_staff()))
  with check (auth_user_id = (select auth.uid()) or (select private.is_staff()));
create policy customers_create_staff on public.customers for insert to authenticated
  with check ((select private.is_staff()));
create policy customers_delete_staff on public.customers for delete to authenticated
  using ((select private.is_staff()));

create policy staff_read_users on public.admin_users for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select private.is_admin()));
create policy staff_manage_users on public.admin_users for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy staff_update_own_name on public.admin_users for update to authenticated
  using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));

create policy orders_read_own on public.orders for select to authenticated
  using (customer_auth_id = (select auth.uid()) or (select private.is_staff()));
create policy orders_create_own on public.orders for insert to authenticated
  with check (customer_auth_id = (select auth.uid()));
create policy orders_manage_staff on public.orders for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy orders_delete_staff on public.orders for delete to authenticated
  using ((select private.is_staff()));

create policy pets_read_own on public.pets for select to authenticated
  using ((select private.is_staff()) or exists (
    select 1 from public.customers c
    where c.id = customer_id and c.auth_user_id = (select auth.uid())
  ));
create policy pets_manage_own on public.pets for all to authenticated
  using ((select private.is_staff()) or exists (
    select 1 from public.customers c
    where c.id = customer_id and c.auth_user_id = (select auth.uid())
  ))
  with check ((select private.is_staff()) or exists (
    select 1 from public.customers c
    where c.id = customer_id and c.auth_user_id = (select auth.uid())
  ));

create policy records_read_staff on public.medical_records for select to authenticated
  using ((select private.is_staff()));
create policy records_manage_staff on public.medical_records for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy appointments_read_staff on public.appointments for select to authenticated
  using ((select private.is_staff()));
create policy appointments_create_authenticated on public.appointments for insert to authenticated
  with check (true);
create policy appointments_manage_staff on public.appointments for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy appointments_delete_staff on public.appointments for delete to authenticated
  using ((select private.is_staff()));

-- Operational and financial records are staff-only.
create policy coupons_read_authenticated on public.coupons for select to authenticated using (true);
create policy coupons_manage_staff on public.coupons for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy transactions_staff_only on public.transactions for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy inventory_staff_only on public.inventory_logs for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy products_manage_staff on public.products for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy categories_manage_staff on public.categories for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy banners_manage_staff on public.banners for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy settings_manage_staff on public.settings for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
create policy fees_manage_staff on public.delivery_fees for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Column privileges prevent a malicious select('*') from reading legacy
-- password data even if a future migration accidentally restores the column.
revoke all on public.customers, public.admin_users from anon, authenticated;
grant select, update (name, phone, cpf, birth_date, cep, address, number, neighborhood, location, complement)
  on public.customers to authenticated;
grant insert (id, name, email, role, status), update (name, email, role, status), delete
  on public.admin_users to authenticated;
grant select on public.admin_users to authenticated;

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

create or replace function public.reserve_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  item jsonb;
  product_row public.products%rowtype;
  variation_row jsonb;
  updated_variations jsonb;
  quantity integer;
  available integer;
  unit_price numeric;
  computed_subtotal numeric := 0;
  cash_discount_percentage numeric := 0;
  cash_discount numeric := 0;
begin
  select * into order_row
  from public.orders
  where id = p_order_id and customer_auth_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if order_row.stock_reserved_at is not null then
    return;
  end if;

  for item in select value from jsonb_array_elements(order_row.items)
  loop
    quantity := greatest(1, coalesce((item ->> 'qty')::integer, 0));
    select * into product_row from public.products
      where id = (item ->> 'productId')::uuid
      for update;
    if not found or product_row.status <> 'active' then
      raise exception 'Product is unavailable';
    end if;

    if coalesce(item ->> 'selectedWeight', '') <> '' then
      select v into variation_row
      from jsonb_array_elements(coalesce(product_row.variations, '[]'::jsonb)) as v
      where v ->> 'weight' = item ->> 'selectedWeight'
      limit 1;
      available := coalesce((variation_row ->> 'stock')::integer, 0);
      if variation_row is null or available < quantity then
        raise exception 'Insufficient stock';
      end if;
      unit_price := coalesce(nullif(variation_row ->> 'price', '')::numeric, product_row.price);
      select jsonb_agg(
        case when v ->> 'weight' = item ->> 'selectedWeight'
          then jsonb_set(v, '{stock}', to_jsonb(available - quantity))
          else v
        end
      ) into updated_variations
      from jsonb_array_elements(product_row.variations) as v;
      update public.products set variations = updated_variations where id = product_row.id;
    else
      if product_row.stock < quantity then
        raise exception 'Insufficient stock';
      end if;
      update public.products set stock = stock - quantity where id = product_row.id;
      unit_price := product_row.price;
    end if;

    computed_subtotal := computed_subtotal + unit_price * quantity;

    insert into public.inventory_logs (product_id, product_name, type, quantity, reason, user_id)
    values (product_row.id, product_row.name, 'exit', quantity, 'Venda Online', (select auth.uid())::text);
  end loop;

  select coalesce((value ->> 'cashDiscount')::numeric, 0)
  into cash_discount_percentage
  from public.settings
  where key = 'app_settings';
  cash_discount_percentage := coalesce(cash_discount_percentage, 0);
  if order_row.payment in ('PIX', 'Dinheiro') then
    cash_discount := greatest(0, computed_subtotal * cash_discount_percentage / 100);
  end if;

  update public.orders
  set stock_reserved_at = now(),
      subtotal = computed_subtotal,
      discount = least(computed_subtotal, cash_discount),
      delivery_fee = greatest(0, delivery_fee),
      total = greatest(0, computed_subtotal + greatest(0, delivery_fee) - least(computed_subtotal, cash_discount))
  where id = order_row.id;
end;
$$;

revoke all on function public.reserve_order_stock(uuid) from public;
grant execute on function public.reserve_order_stock(uuid) to authenticated;

-- Link each staff member manually after creating their Supabase Auth user:
-- update public.admin_users set auth_user_id = '<auth.users.id>' where email = '<staff email>';
