import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const usePetStore = create(
  (set, get) => ({
    pets: [],
    isLoading: false,

    fetchPets: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('pets')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data) {
          const mapped = data.map(p => ({
            ...p,
            customerId: p.customer_id
          }));
          set({ pets: mapped });
        }
      } catch (err) {
        console.error('Erro ao buscar pets no Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addPet: async (pet) => {
      const id = crypto.randomUUID();
      const dataForDb = {
        id,
        customer_id: pet.customerId,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight
      };

      try {
        const { error } = await supabase.from('pets').insert([dataForDb]);
        if (error) throw error;

        set((state) => ({ pets: [...state.pets, { ...pet, id }] }));
      } catch (err) {
        console.error('Erro ao adicionar pet no Supabase:', err);
      }
    },

    updatePet: async (id, updatedPet) => {
      const dataForDb = {
        customer_id: updatedPet.customerId,
        name: updatedPet.name,
        type: updatedPet.type,
        breed: updatedPet.breed,
        age: updatedPet.age,
        weight: updatedPet.weight
      };

      try {
        const { error } = await supabase.from('pets').update(dataForDb).eq('id', id);
        if (error) throw error;

        set((state) => ({
          pets: state.pets.map((p) => (p.id === id ? { ...p, ...updatedPet } : p))
        }));
      } catch (err) {
        console.error('Erro ao atualizar pet no Supabase:', err);
      }
    },

    deletePet: async (id) => {
      try {
        const { error } = await supabase.from('pets').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          pets: state.pets.filter((p) => p.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar pet no Supabase:', err);
      }
    },

    getPetsByCustomer: (customerId) => {
      const { pets } = get();
      return pets.filter(p => p.customerId === customerId);
    },
  })
);
