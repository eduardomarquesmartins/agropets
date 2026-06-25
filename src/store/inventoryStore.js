import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useInventoryStore = create(
  (set) => ({
    logs: [],
    isLoading: false,

    fetchLogs: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('inventory_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped = data.map(log => ({
            ...log,
            productId: log.product_id,
            productName: log.product_name,
            userId: log.user_id
          }));
          set({ logs: mapped });
        }
      } catch (err) {
        console.error('Erro ao carregar logs de estoque do Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addLog: async (log) => {
      const id = crypto.randomUUID();
      const dataForDb = {
        id,
        product_id: log.productId,
        product_name: log.productName,
        type: log.type,
        quantity: log.quantity,
        reason: log.reason,
        user_id: log.userId,
        timestamp: new Date().toISOString()
      };

      try {
        const { error } = await supabase.from('inventory_logs').insert([dataForDb]);
        if (error) throw error;

        set((state) => ({ logs: [{ ...log, id, timestamp: dataForDb.timestamp }, ...state.logs] }));
      } catch (err) {
        console.error('Erro ao persistir log de estoque no Supabase:', err);
      }
    }
  })
);
