YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíßm¢Ö¥¢ëiºÙbë5import { supabase } from '../services/supabase';

const callPayoutsApi = async (method, payload) => {
  const { data: { session } } = await supabase.aÛm-¢G§²ÚîÆ­yÛ

export const createSellerCommissionPayout = async (payload) => {
  const { payout } = await callPayoutsApi('POST', payload);
  return payout;
};
