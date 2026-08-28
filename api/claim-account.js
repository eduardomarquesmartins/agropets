import { getSupabaseServerClient } from './_lib/supabase.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requestWindowMs = 15 * 60 * 1000;
const requestLimit = 5;
const requestLog = new Map();

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const requestKey = (req) => String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
  .split(',')[0]
  .trim();

const isRateLimited = (key, now) => {
  const recent = (requestLog.get(key) || []).filter((timestamp) => now - timestamp < requestWindowMs);
  if (recent.length >= requestLimit) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
};

const invalidClaim = (res) => res.status(400).json({ error: 'Não foi possível confirmar os dados informados.' });

export const createClaimAccountHandler = ({ getClient = getSupabaseServerClient, now = () => Date.now() } = {}) => async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (isRateLimited(requestKey(req), now())) return res.status(429).json({ error: 'Tente novamente em alguns minutos.' });

  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!emailRegex.test(email) || phone.length < 10 || password.length < 12) return invalidClaim(res);

  try {
    const client = getClient();
    const { data: customer, error: customerError } = await client.from('customers').select('id, phone').ilike('email', email).is('auth_user_id', null).maybeSingle();
    if (customerError) throw customerError;
    if (!customer || normalizePhone(customer.phone) !== phone) return invalidClaim(res);

    const { data: authData, error: authError } = await client.auth.admin.createUser({ email, password, email_confirm: true });
    if (authError || !authData.user) return invalidClaim(res);

    const { data: linkedCustomer, error: linkError } = await client.from('customers').select('id').eq('id', customer.id).eq('auth_user_id', authData.user.id).maybeSingle();
    if (linkError || !linkedCustomer) {
      await client.auth.admin.deleteUser(authData.user.id);
      throw linkError || new Error('Customer profile was not linked after account creation.');
    }
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Account claim API error:', error.message);
    return res.status(500).json({ error: 'Não foi possível ativar a conta agora. Tente novamente.' });
  }
};

export default createClaimAccountHandler();
