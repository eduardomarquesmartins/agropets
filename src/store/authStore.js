import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { supabase } from '../services/supabase';
import { hashPassword, verifyPassword } from '../utils/passwordUtils';

const mapCustomerFromDb = (data) => {
  if (!data) return null;

  return {
    ...data,
    role: 'customer',
    whatsapp: data.phone,
    birthDate: data.birth_date,
    endereco: data.address,
    bairro: data.neighborhood,
    city: data.location,
    isProfileComplete: !!data.cpf,
  };
};

const mapCustomerToDb = (data) => {
  const dbData = {
    name: data.name,
    email: data.email,
    phone: data.whatsapp || data.phone,
    cpf: data.cpf,
    birth_date: data.birthDate || data.birth_date,
    cep: data.cep,
    address: data.endereco || data.address,
    number: data.number,
    neighborhood: data.bairro || data.neighborhood,
    location: data.city || data.location,
    complement: data.complement,
  };

  if (data.password) {
    dbData.password = data.password;
  }

  return dbData;
};

const clearAllStores = () => {
  const storeKeys = [
    'agropets-orders',
    'agropets-customers',
    'agropets-admin-users',
    'agropets-financial',
    'agropets-inventory',
    'agropets-appointments',
    'agropets-pets',
    'agropets-medical-records',
    'agropets-coupons',
  ];

  storeKeys.forEach((key) => localStorage.removeItem(key));
};

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        if (!supabase) return null;
        try {
          const cleanEmail = String(email || '').trim().toLowerCase();
          
          // 1. Tentar Admin
          const { data: admin, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (adminError) throw adminError;

          if (admin) {
            const isValid = await verifyPassword(password, admin.password);
            if (isValid) {
              if (admin.status !== 'active') throw new Error('Account inactive');
              const { password: _p, ...user } = admin;
              set({ user });
              return user;
            }
          }

          // 2. Tentar Cliente
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (customerError) throw customerError;

          if (customer) {
            const isValid = await verifyPassword(password, customer.password);
            if (isValid) {
              const user = mapCustomerFromDb(customer);
              set({ user });
              return user;
            }
          }

          return null;
        } catch (error) {
          console.error('Erro ao fazer login:', error);
          return null;
        }
      },
      signup: async (userData) => {
        if (!supabase) {
          console.error('Supabase nao configurado para cadastrar usuario.');
          return null;
        }

        try {
          const hashedPassword = await hashPassword(userData.password);
          const dbUser = mapCustomerToDb({ ...userData, password: hashedPassword });

          const { data, error } = await supabase
            .from('customers')
            .insert([dbUser])
            .select('id, name, email, phone, cpf, birth_date, cep, address, number, neighborhood, location, complement')
            .single();

          if (error) throw error;

          const registeredUser = mapCustomerFromDb(data);
          set({ user: registeredUser });
          return registeredUser;
        } catch (error) {
          console.error('Erro ao cadastrar usuario:', error);
          return null;
        }
      },
      loginWithGoogle: async (credential) => {
        if (!supabase) {
          console.error('Supabase nao configurado para login Google.');
          return null;
        }

        try {
          const decoded = jwtDecode(credential);
          const email = decoded.email;

          const { data: existingUser, error } = await supabase
            .from('customers')
            .select('id, name, email, phone, cpf, birth_date, cep, address, number, neighborhood, location, complement')
            .eq('email', email)
            .maybeSingle();

          if (error) throw error;

          if (existingUser) {
            const user = mapCustomerFromDb(existingUser);
            set({ user });
            return user;
          }

          const googleUser = {
            name: decoded.name || (decoded.given_name ? `${decoded.given_name} ${decoded.family_name || ''}`.trim() : decoded.email.split('@')[0]),
            email: decoded.email,
            role: 'customer',
            isProfileComplete: false,
          };

          set({ user: googleUser });
          return googleUser;
        } catch (error) {
          console.error('Erro ao processar login Google:', error);
          return null;
        }
      },
      updateProfile: async (data) => {
        const currentUser = useAuthStore.getState().user;

        if (!currentUser || !currentUser.email || !supabase) {
          return null;
        }

        try {
          if (currentUser.role === 'customer') {
            const dbData = mapCustomerToDb({
              ...currentUser,
              ...data,
              isProfileComplete: true,
            });

            if (data.password) {
              dbData.password = await hashPassword(data.password);
            }

            const { error } = await supabase
              .from('customers')
              .upsert(dbData, { onConflict: 'email' });

            if (error) throw error;

            const updatedUser = mapCustomerFromDb({
              ...currentUser,
              ...dbData,
              role: 'customer',
            });

            set({ user: updatedUser });
            return updatedUser;
          }

          const adminData = {
            name: data.name ?? currentUser.name,
            email: data.email ?? currentUser.email,
          };

          if (data.password) {
            adminData.password = await hashPassword(data.password);
          }

          const { error } = await supabase
            .from('admin_users')
            .update(adminData)
            .eq('id', currentUser.id);

          if (error) throw error;

          const updatedUser = {
            ...currentUser,
            ...adminData,
          };

          delete updatedUser.password;
          set({ user: updatedUser });
          return updatedUser;
        } catch (error) {
          console.error('Erro ao atualizar perfil:', error);
          return null;
        }
      },
      logout: () => {
        clearAllStores();
        set({ user: null });
      },
    }),
    {
      name: 'agropets-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
