import { create } from 'zustand';
import { supabase } from '../services/supabase';

const mapCustomerFromDb = (data, authUser) => ({
  ...data,
  id: data.id,
  authUserId: authUser.id,
  email: authUser.email || data.email,
  role: 'customer',
  whatsapp: data.phone,
  birthDate: data.birth_date,
  endereco: data.address,
  bairro: data.neighborhood,
  city: data.location,
  isProfileComplete: Boolean(data.cpf),
});

const mapCustomerToDb = (data) => ({
  name: data.name,
  phone: data.whatsapp || data.phone || null,
  cpf: data.cpf || null,
  birth_date: data.birthDate || data.birth_date || null,
  cep: data.cep || null,
  address: data.endereco || data.address || null,
  number: data.number || null,
  neighborhood: data.bairro || data.neighborhood || null,
  location: data.city || data.location || null,
  complement: data.complement || data.complemento || null,
});

const clearAllStores = () => {
  [
    'agropets-orders', 'agropets-customers', 'agropets-admin-users',
    'agropets-financial', 'agropets-inventory', 'agropets-appointments',
    'agropets-pets', 'agropets-medical-records', 'agropets-coupons',
  ].forEach((key) => localStorage.removeItem(key));
};

const loadProfile = async (authUser) => {
  const { data: staff, error: staffError } = await supabase
    .from('admin_users')
    .select('id, name, email, role, status, created_at')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (staffError) throw staffError;
  if (staff) {
    if (staff.status !== 'active') throw new Error('Account inactive');
    return { ...staff, authUserId: authUser.id };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, name, email, phone, cpf, birth_date, cep, address, number, neighborhood, location, complement')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (customerError) throw customerError;
  if (!customer) throw new Error('User profile was not provisioned.');
  return mapCustomerFromDb(customer, authUser);
};

export const useAuthStore = create((set, get) => ({
  user: null,
  isReady: false,

  initialize: async () => {
    if (!supabase) {
      set({ isReady: true });
      return;
    }

    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      set({ user: authUser ? await loadProfile(authUser) : null });
    } catch (error) {
      console.error('Erro ao restaurar a sessão:', error);
      await supabase.auth.signOut();
      set({ user: null });
    } finally {
      set({ isReady: true });
    }
  },

  login: async (email, password) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password,
      });
      if (error || !data.user) return null;

      const user = await loadProfile(data.user);
      set({ user });
      return user;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      await supabase.auth.signOut();
      return null;
    }
  },

  signup: async (userData) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: String(userData.email || '').trim().toLowerCase(),
        password: userData.password,
        options: { data: { name: userData.name } },
      });
      if (error || !data.user) throw error || new Error('Unable to create account.');
      if (!data.session) return { needsEmailConfirmation: true };

      const user = await loadProfile(data.user);
      const updatedUser = await get().updateProfile(userData);
      return updatedUser || user;
    } catch (error) {
      console.error('Erro ao cadastrar usuario:', error);
      return null;
    }
  },

  loginWithGoogle: async (credential) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential });
      if (error || !data.user) throw error || new Error('Google authentication failed.');
      const user = await loadProfile(data.user);
      set({ user });
      return user;
    } catch (error) {
      console.error('Erro ao processar login Google:', error);
      return null;
    }
  },

  updateProfile: async (data) => {
    const currentUser = get().user;
    if (!currentUser || !supabase) return null;

    try {
      if (data.password) {
        const { error } = await supabase.auth.updateUser({ password: data.password });
        if (error) throw error;
      }

      if (currentUser.role === 'customer') {
        const { error } = await supabase
          .from('customers')
          .update(mapCustomerToDb({ ...currentUser, ...data }))
          .eq('auth_user_id', currentUser.authUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_users')
          .update({ name: data.name ?? currentUser.name })
          .eq('auth_user_id', currentUser.authUserId);
        if (error) throw error;
      }

      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) throw error || new Error('Session expired.');
      const user = await loadProfile(authUser);
      set({ user });
      return user;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return null;
    }
  },

  logout: async () => {
    clearAllStores();
    if (supabase) await supabase.auth.signOut();
    set({ user: null });
  },
}));
