import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useFinancialStore = create(
  (set) => ({
    transactions: [],
    isLoading: false,

    fetchTransactions: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) throw error;

        const mapped = (data || []).map(t => ({
          ...t,
          date: t.timestamp || t.date
        }));
        set({ transactions: mapped });
      } catch (err) {
        console.error('Erro ao carregar transações do Supabase:', err);
      } finally {
        set({ isLoading: false });
      }
    },

    addTransaction: async (transaction) => {
      const id = crypto.randomUUID();
      const dataForDb = {
        id,
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        description: transaction.description,
        category: transaction.category,
        payment_method: transaction.paymentMethod || transaction.payment_method,
        timestamp: transaction.date || new Date().toISOString()
      };

      try {
        const { error } = await supabase.from('transactions').insert([dataForDb]);
        if (error) throw error;

        set((state) => ({ transactions: [{ ...transaction, id, date: dataForDb.timestamp }, ...state.transactions] }));
      } catch (err) {
        console.error('Erro ao persistir transação no Supabase:', err);
      }
    },

    deleteTransaction: async (id) => {
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) throw error;

        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar transação no Supabase:', err);
      }
    }
  })
);
