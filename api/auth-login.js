import { getSupabaseServerClient } from './_lib/supabase.js';
import { hashPasswordServer, needsPasswordUpgrade, verifyPasswordServer } from './_lib/password.js';

const sanitizeEmail = (value) => String(value || '').trim().toLowerCase();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = sanitizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('id, name, email, role, status, password')
      .eq('email', email)
      .maybeSingle();

    if (adminError) {
      throw adminError;
    }

    if (adminData && verifyPasswordServer(password, adminData.password)) {
      if (adminData.status && adminData.status !== 'active') {
        return res.status(403).json({ error: 'Inactive account' });
      }

      if (needsPasswordUpgrade(adminData.password)) {
        await supabase
          .from('admin_users')
          .update({ password: hashPasswordServer(password) })
          .eq('id', adminData.id);
      }

      const { password: _password, ...user } = adminData;
      return res.status(200).json({ userType: 'admin', user });
    }

    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone, cpf, birth_date, cep, address, number, neighborhood, location, complement, password')
      .eq('email', email)
      .maybeSingle();

    if (customerError) {
      throw customerError;
    }

    if (customerData && verifyPasswordServer(password, customerData.password)) {
      if (needsPasswordUpgrade(customerData.password)) {
        await supabase
          .from('customers')
          .update({ password: hashPasswordServer(password) })
          .eq('id', customerData.id);
      }

      const { password: _password, ...user } = customerData;
      return res.status(200).json({ userType: 'customer', user });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Auth login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
