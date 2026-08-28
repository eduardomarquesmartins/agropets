import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useCustomerStore = create(
  (set) => ({
    customers: [],
    isLoading: false,
    error: null,

    fetchCustomers: async () => {
      set({ isLoading: true });
      try {
        const [customersResult, staffResult] = await Promise.all([
          supabase
            .from('customers')
            .select('id, auth_user_id, name, email, phone, cpf, birth_date, location, neighborhood, address, number, cep, complement, pet_type, created_at')
            .order('name'),
          supabase
            .from('admin_users')
            .select('auth_user_id, email'),
        ]);

        if (customersResult.error) throw customersResult.error;
        if (staffResult.error) throw staffResult.error;

        if (customersResult.data) {
          const staffAuthUserIds = new Set((staffResult.data || []).map((staff) => staff.auth_user_id).filter(Boolean));
          const staffEmails = new Set((staffResult.data || []).map((staff) => String(staff.email || '').trim().toLowerCase()).filter(Boolean));
          const customerAccounts = customersResult.data.filter((customer) => (
            !staffAuthUserIds.has(customer.auth_user_id)
            && !staffEmails.has(String(customer.email || '').trim().toLowerCase())
          ));

          const mapped = customerAccounts.map(c => ({
            ...c,
            whatsapp: c.phone,
            birthDate: c.birth_date,
            city: c.location,
            bairro: c.neighborhood,
            endereco: c.address,
            petType: c.pet_type,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=f1f5f9`
          }));
          set({ customers: mapped });
        }
      } catch (err) {
        console.error('Erro ao carregar clientes do Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addCustomer: async (customer) => {
      const id = crypto.randomUUID();
      const dataForDb = {
        id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        cpf: customer.cpf,
        birth_date: customer.birthDate,
        location: customer.location,
        address: customer.address,
        number: customer.number,
        neighborhood: customer.neighborhood,
        cep: customer.cep,
        complement: customer.complement,
        pet_type: customer.petType
      };

      try {
        const { error } = await supabase.from('customers').insert([dataForDb]);
        if (error) throw error;

        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name)}&background=f1f5f9`;
        set((state) => ({ customers: [...state.customers, { ...customer, id, avatar }] }));
      } catch (err) {
        console.error('Erro ao persistir cliente no Supabase:', err);
      }
    },

    updateCustomer: async (id, updatedCustomer) => {
      const dataForDb = {
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        cpf: updatedCustomer.cpf,
        birth_date: updatedCustomer.birthDate,
        location: updatedCustomer.location,
        address: updatedCustomer.address,
        number: updatedCustomer.number,
        neighborhood: updatedCustomer.neighborhood,
        cep: updatedCustomer.cep,
        complement: updatedCustomer.complement,
        pet_type: updatedCustomer.petType
      };

      try {
        const { error } = await supabase.from('customers').update(dataForDb).eq('id', id);
        if (error) throw error;

        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c))
        }));
      } catch (err) {
        console.error('Erro ao atualizar cliente no Supabase:', err);
      }
    },

    deleteCustomer: async (id) => {
      try {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar cliente no Supabase:', err);
      }
    },
  })
);
