import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { hashPassword } from '../utils/passwordUtils';

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
      const id = crypto.randomUUID();
      const dataForDb = {
        id,
        name: user.name,
        email: user.email,
        password: user.password ? await hashPassword(user.password) : '',
        role: user.role || 'editor',
        status: 'active'
      };

      try {
        const { error } = await supabase.from('admin_users').insert([dataForDb]);
        if (error) throw error;

        // Não incluir password no estado local
        const { password: _, ...userWithoutPassword } = dataForDb;
        set((state) => ({
          adminUsers: [...state.adminUsers, { ...userWithoutPassword, createdAt: new Date().toISOString() }]
        }));
      } catch (err) {
        console.error('Erro ao adicionar usuário admin no Supabase:', err);
      }
    },

    updateAdminUser: async (id, updatedUser) => {
      const dataForDb = {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status
      };

      if (updatedUser.password && updatedUser.password.trim() !== '') {
        dataForDb.password = await hashPassword(updatedUser.password);
      }

      try {
        const { error } = await supabase.from('admin_users').update(dataForDb).eq('id', id);
        if (error) throw error;

        set((state) => ({
          adminUsers: state.adminUsers.map(u => u.id === id ? { ...u, ...updatedUser } : u)
        }));
      } catch (err) {
        console.error('Erro ao atualizar usuário admin no Supabase:', err);
      }
    },

    deleteAdminUser: async (id) => {
      try {
        const { error } = await supabase.from('admin_users').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          adminUsers: state.adminUsers.filter(u => u.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar usuário admin no Supabase:', err);
      }
    },

    toggleUserStatus: async (id) => {
      const { adminUsers } = get();
      const user = adminUsers.find(u => u.id === id);
      if (!user) return;

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      try {
        const { error } = await supabase.from('admin_users').update({ status: newStatus }).eq('id', id);
        if (error) throw error;

        set({ adminUsers: adminUsers.map(u => u.id === id ? { ...u, status: newStatus } : u) });
      } catch (err) {
        console.error('Erro ao alternar status do usuário no Supabase:', err);
      }
    },
  })
);
