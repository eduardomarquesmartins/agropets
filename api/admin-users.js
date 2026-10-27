import { getSupabaseServerClient } from './_lib/supabase.js';
import { requireAdminUser } from './_lib/requestAuth.js';
import { randomBytes } from 'node:crypto';

const allowedRoles = new Set(['admin', 'editor', 'vet', 'seller']);
const allowedStatuses = new Set(['active', 'inactive']);
const cleanEmail = (value) => String(value || '').trim().toLowerCase();

const requirePassword = (value) => {
  if (typeof value !== 'string' || value.length < 12) {
    const error = new Error('Password must have at least 12 characters.');
    error.statusCode = 400;
    throw error;
  }
};

const cleanAffiliateCode = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 30);

const defaultAffiliateCode = (name) => {
  const prefix = cleanAffiliateCode(name).replace(/-/g, '').slice(0, 16) || 'VENDEDOR';
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
};

const cleanCommissionRate = (value, fallback = 10) => {
  const rate = Number(value ?? fallback);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    const error = new Error('Commission rate must be between 0 and 100.');
    error.statusCode = 400;
    throw error;
  }
  return rate;
};

export default async function handler(req, res) {
  try {
    await requireAdminUser(req);
    const client = getSupabaseServerClient();

    if (req.method === 'POST') {
      const email = cleanEmail(req.body?.email);
      const name = String(req.body?.name || '').trim();
      const role = String(req.body?.role || 'editor');
      const status = String(req.body?.status || 'active');
      requirePassword(req.body?.password);
      if (!email || !name || !allowedRoles.has(role) || !allowedStatuses.has(status)) {
        return res.status(400).json({ error: 'Invalid team member data.' });
      }

      const { data: authData, error: authError } = await client.auth.admin.createUser({
        email,
        password: req.body.password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (authError || !authData.user) throw authError || new Error('Unable to create auth user.');

      const affiliateCode = role === 'seller'
        ? (cleanAffiliateCode(req.body?.affiliate_code) || defaultAffiliateCode(name))
        : null;
      const commissionRate = role === 'seller' ? cleanCommissionRate(req.body?.commission_rate) : 10;

      const { data, error } = await client
        .from('admin_users')
        .insert({ name, email, role, status, auth_user_id: authData.user.id, affiliate_code: affiliateCode, commission_rate: commissionRate })
        .select('id, name, email, role, status, affiliate_code, commission_rate, created_at')
        .single();
      if (error) {
        await client.auth.admin.deleteUser(authData.user.id);
        throw error;
      }
      return res.status(201).json({ user: data });
    }

    if (req.method === 'PUT') {
      const id = String(req.body?.id || '');
      const { data: existing, error: existingError } = await client
        .from('admin_users')
        .select('id, auth_user_id, role, affiliate_code')
        .eq('id', id)
        .single();
      if (existingError || !existing) return res.status(404).json({ error: 'Team member not found.' });

      if (req.body.password) {
        requirePassword(req.body.password);
        const { error } = await client.auth.admin.updateUserById(existing.auth_user_id, { password: req.body.password });
        if (error) throw error;
      }

      const update = {};
      if (req.body.name !== undefined) update.name = String(req.body.name).trim();
      if (req.body.role !== undefined && allowedRoles.has(req.body.role)) update.role = req.body.role;
      if (req.body.status !== undefined && allowedStatuses.has(req.body.status)) update.status = req.body.status;
      const nextRole = update.role || existing.role;
      if (nextRole === 'seller' && req.body.affiliate_code !== undefined) {
        const affiliateCode = cleanAffiliateCode(req.body.affiliate_code);
        if (affiliateCode.length < 3) return res.status(400).json({ error: 'O código do vendedor deve ter ao menos 3 caracteres.' });
        update.affiliate_code = affiliateCode;
      } else if (nextRole === 'seller' && !existing.affiliate_code) {
        update.affiliate_code = defaultAffiliateCode(req.body.name || 'Vendedor');
      }
      if (nextRole === 'seller' && req.body.commission_rate !== undefined) {
        update.commission_rate = cleanCommissionRate(req.body.commission_rate);
      }
      const { data, error } = await client
        .from('admin_users')
        .update(update)
        .eq('id', id)
        .select('id, name, email, role, status, affiliate_code, commission_rate, created_at')
        .single();
      if (error) throw error;
      return res.status(200).json({ user: data });
    }

    if (req.method === 'DELETE') {
      const id = String(req.body?.id || '');
      const { data, error } = await client
        .from('admin_users')
        .select('auth_user_id, role')
        .eq('id', id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Team member not found.' });
      if (data.role === 'seller') return res.status(409).json({ error: 'Desative o vendedor para manter o histórico de vendas e comissões.' });
      const { error: deleteProfileError } = await client.from('admin_users').delete().eq('id', id);
      if (deleteProfileError) throw deleteProfileError;
      const { error: deleteAuthError } = await client.auth.admin.deleteUser(data.auth_user_id);
      if (deleteAuthError) throw deleteAuthError;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin user API error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Internal server error' });
  }
}
