import { create } from 'zustand';
import { supabase } from '../services/supabase';

const callAdminUsersApi = async (method, payload) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada.');

  const response = await fetch('/api/admin-users', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar equipe.');
  return data;
};

export const useAdminUserStore = create(
  (set, get) => ({
    adminUsers: [],
    isLoading: false,

    fetchAdminUsers: async () => {
      set({ isLoading: true });
      try {
        // Nunca selecionar a coluna password
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, name, email, role, status, created_at')
          .order('name');

        if (error) throw error;
        set({ adminUsers: data || [] });
      } catch (err) {
        console.error('Erro ao buscar usuários admin no Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addAdminUser: async (user) => {
      try {
        const result = await callAdminUsersApi('POST', user);
        set((state) => ({
          adminUsers: [...state.adminUsers, result.user]
        }));
      } catch (err) {
        console.error('Erro ao adicionar usuário admin no Supabase:', err);
        throw err;
      }
    },

    updateAdminUser: async (id, updatedUser) => {
      try {
        const result = await callAdminUsersApi('PUT', { id, ...updatedUser });
        set((state) => ({
          adminUsers: state.adminUsers.map(u => u.id === id ? result.user : u)
        }));
      } catch (err) {
        console.error('Erro ao atualizar usuário admin no Supabase:', err);
        throw err;
      }
    },

    deleteAdminUser: async (id) => {
      try {
        await callAdminUsersApi('DELETE', { id });
        set((state) => ({
          adminUsers: state.adminUsers.filter(u => u.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar usuário admin no Supabase:', err);
        throw err;
      }
    },

    toggleUserStatus: async (id) => {
      const { adminUsers } = get();
      const user = adminUsers.find(u => u.id === id);
      if (!user) return;

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      try {
        const result = await callAdminUsersApi('PUT', { id, status: newStatus });
        set({ adminUsers: adminUsers.map(u => u.id === id ? result.user : u) });
      } catch (err) {
        console.error('Erro ao alternar status do usuário no Supabase:', err);
        throw err;
      }
    },
  })
);
