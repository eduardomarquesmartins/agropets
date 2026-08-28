import { getSupabaseServerClient } from './supabase.js';

const getBearerToken = (req) => {
  const authorization = String(req.headers?.authorization || '');
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
};

export const requireAuthenticatedUser = async (req) => {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  const { data, error } = await getSupabaseServerClient().auth.getUser(token);
  if (error || !data.user) {
    const authError = new Error('Invalid session');
    authError.statusCode = 401;
    throw authError;
  }
  return data.user;
};

export const requireStaffUser = async (req) => {
  const user = await requireAuthenticatedUser(req);
  const { data, error } = await getSupabaseServerClient()
    .from('admin_users')
    .select('role, status')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !data || data.status !== 'active' || !['admin', 'editor', 'vet'].includes(data.role)) {
    const authError = new Error('Staff access required');
    authError.statusCode = 403;
    throw authError;
  }
  return user;
};

export const requireAdminUser = async (req) => {
  const user = await requireAuthenticatedUser(req);
  const { data, error } = await getSupabaseServerClient()
    .from('admin_users')
    .select('role, status')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (error || !data || data.status !== 'active' || data.role !== 'admin') {
    const authError = new Error('Administrator access required');
    authError.statusCode = 403;
    throw authError;
  }
  return user;
};
