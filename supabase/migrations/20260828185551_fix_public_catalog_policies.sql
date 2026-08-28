-- Anonymous catalogue readers must not execute a staff-only helper function.
-- Separate policies keep public reads safe while preserving staff access to drafts.
drop policy if exists products_read on public.products;
drop policy if exists banners_read on public.banners;

create policy products_public_read on public.products
for select to anon
using (status = 'active');

create policy products_authenticated_read on public.products
for select to authenticated
using (status = 'active' or (select private.is_staff()));

create policy banners_public_read on public.banners
for select to anon
using (status = 'active');

create policy banners_authenticated_read on public.banners
for select to authenticated
using (status = 'active' or (select private.is_staff()));
