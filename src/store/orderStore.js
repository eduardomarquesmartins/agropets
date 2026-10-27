import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { evolutionApi } from '../services/evolutionApi';
import toast from 'react-hot-toast';

export const useOrderStore = create(
  (set, get) => ({
    orders: [],
    isLoading: false,
    error: null,

    setOrders: (orders) => set({ orders }),

    // Usado apenas por admins — busca todos os pedidos
    fetchOrders: async () => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const uniqueOrders = Array.from(new Map((data || []).map(o => [o.id, o])).values());
        set({ orders: uniqueOrders });
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        set({ error: 'Erro ao carregar pedidos.' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Usado por clientes — filtra pelo whatsapp normalizado
    fetchUserOrders: async (authUserId) => {
      if (!authUserId) return [];
      set({ isLoading: true, error: null });

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_auth_id', authUserId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const userOrders = data || [];
        set({ orders: userOrders });
        return userOrders;
      } catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        return [];
      } finally {
        set({ isLoading: false });
      }
    },

    updateOrderStatus: async (orderId, newStatus) => {
      const { orders } = get();
      const order = orders.find(o => o.id === orderId);

      if (!order) return;

      // Atualização otimista
      set({ orders: orders.map(o => o.id === orderId ? {
        ...o,
        status: newStatus,
        ...(newStatus === 'Cancelado' ? { commission_status: 'cancelled' } : {}),
      } : o) });

      try {
        const { error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', orderId);

        if (error) throw error;

        const message = evolutionApi.formatStatusUpdateMessage(order, newStatus);
        const result = await evolutionApi.sendText(order.whatsapp, message);

        if (result.success) {
          toast.success(`Status atualizado! Notificação enviada para ${order.customer_name}.`);
        } else {
          toast.success(`Status atualizado no sistema (Notificação WhatsApp pendente).`);
        }
      } catch (error) {
        console.error('Erro na atualização do pedido:', error);
        toast.error('Erro ao sincronizar status.');
        get().fetchOrders();
      }
    },

    updateOrderPaymentStatus: async (orderId, paymentStatus) => {
      const { orders } = get();
      const order = orders.find((item) => item.id === orderId);
      if (!order || !['pending', 'paid', 'refunded'].includes(paymentStatus)) return;

      set({ orders: orders.map((item) => item.id === orderId ? { ...item, payment_status: paymentStatus } : item) });
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({ payment_status: paymentStatus })
          .eq('id', orderId)
          .select('*')
          .single();
        if (error) throw error;
        set({ orders: get().orders.map((item) => item.id === orderId ? data : item) });
        toast.success(paymentStatus === 'paid' ? 'Pagamento confirmado. Comissão liberada para repasse.' : paymentStatus === 'refunded' ? 'Pagamento marcado como estornado.' : 'Pagamento voltou para pendente.');
      } catch (error) {
        console.error('Erro ao atualizar pagamento do pedido:', error);
        toast.error(error.message?.includes('Only administrators') ? 'Somente administradores podem confirmar ou estornar pagamentos.' : 'Erro ao atualizar o pagamento do pedido.');
        get().fetchOrders();
      }
    },

    deleteOrder: async (orderId) => {
      const { orders } = get();

      // Atualização otimista
      set({ orders: orders.filter(o => o.id !== orderId) });

      try {
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', orderId);

        if (error) throw error;
        toast.success('Pedido removido com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        toast.error('Erro ao excluir pedido no banco de dados.');
        get().fetchOrders();
      }
    }
  })
);

