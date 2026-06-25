import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useMedicalRecordStore = create(
  (set, get) => ({
    records: [],
    isLoading: false,

    fetchRecords: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('medical_records')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped = data.map(r => ({
            ...r,
            petId: r.pet_id,
            vetName: r.vet_name
          }));
          set({ records: mapped });
        }
      } catch (err) {
        console.error('Erro ao buscar prontuários no Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addRecord: async (record) => {
      const id = crypto.randomUUID();
      const dataForDb = {
        id,
        pet_id: record.petId,
        description: record.description,
        vet_name: record.vetName,
        date: new Date().toISOString(),
        attachments: record.attachments || [],
        observations: record.observations
      };

      try {
        const { error } = await supabase.from('medical_records').insert([dataForDb]);
        if (error) throw error;

        set((state) => ({ records: [{ ...record, id, date: dataForDb.date }, ...state.records] }));
      } catch (err) {
        console.error('Erro ao adicionar prontuário no Supabase:', err);
      }
    },

    updateRecord: async (id, updated) => {
      const dataForDb = {
        description: updated.description,
        vet_name: updated.vetName,
        attachments: updated.attachments,
        observations: updated.observations
      };

      try {
        const { error } = await supabase.from('medical_records').update(dataForDb).eq('id', id);
        if (error) throw error;

        set((state) => ({
          records: state.records.map(r => r.id === id ? { ...r, ...updated } : r)
        }));
      } catch (err) {
        console.error('Erro ao atualizar prontuário no Supabase:', err);
      }
    },

    deleteRecord: async (id) => {
      try {
        const { error } = await supabase.from('medical_records').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          records: state.records.filter(r => r.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar prontuário no Supabase:', err);
      }
    },

    getRecordsByPet: (petId) => {
      const { records } = get();
      return records.filter(r => r.petId === petId).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  })
);
