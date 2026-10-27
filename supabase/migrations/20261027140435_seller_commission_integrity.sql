YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíó~Ó¢Ö¥¢ëiºÙbë5create index if not exists orders_commission_payout_id_idx
  on public.orders (commission_payout_id)
  where commission_payout_id is not null;

createï~í¢G§²ÚîÆ­yÕnction private.sync_seller_commission_payment();

revoke all on function private.sync_seller_commission_payment() from public, anon, authenticated;
