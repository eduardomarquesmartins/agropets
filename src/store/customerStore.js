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
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, email, phone, cpf, birth_date, location, neighborhood, address, number, cep, complement, pet_type, created_at')
          .order('name');

        if (error) throw error;

        if (data) {
          const mapped = data.map(c => ({
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
