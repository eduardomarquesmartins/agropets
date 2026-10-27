import { supabase } from '../services/supabase';

const callPayoutsApi = async (method, payload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');

  const response = await fetch('/api/seller-commission-payouts', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro ao consultar repasses.');
  return data;
};

export const fetchSellerCommissionPayouts = async () => {
  const { payouts } = await callPayoutsApi('GET');
  return payouts || [];
};

export const createSellerCommissionPayout = async (payload) => {
  const { payout } = await callPayoutsApi('POST', payload);
  return payout;
};

