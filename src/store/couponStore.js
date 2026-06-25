import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useCouponStore = create(
  (set, get) => ({
      coupons: [],
      isLoading: false,

      fetchCoupons: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('code');

          if (error) throw error;
          
          if (data) {
            const mapped = data.map(c => ({
              ...c,
              usageCount: c.used_count,
              oncePerCpf: c.once_per_cpf,
              maxUses: c.max_uses
            }));
            set({ coupons: mapped });
          }
        } catch (err) {
          console.error('Erro ao buscar cupons no Supabase:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      addCoupon: async (coupon) => {
        const id = crypto.randomUUID();
        const dataForDb = {
          id,
          code: coupon.code.toUpperCase(),
          type: coupon.type,
          value: parseFloat(coupon.value),
          expiry: coupon.expiry || null,
          active: coupon.active ?? true,
          once_per_cpf: coupon.oncePerCpf ?? false,
          max_uses: coupon.maxUses ? parseInt(coupon.maxUses) : null,
          used_count: 0
        };

        try {
          const { error } = await supabase.from('coupons').insert([dataForDb]);
          if (error) {
            console.error('Erro detalhado cupom:', JSON.stringify(error));
            throw error;
          }

          set((state) => ({
            coupons: [...state.coupons, { ...coupon, id, usageCount: 0, usedByCpfs: [] }]
          }));
        } catch (err) {
          console.error('Erro ao adicionar cupom no Supabase:', err);
        }
      },

      updateCoupon: async (id, updatedCoupon) => {
        const dataForDb = {
          code: updatedCoupon.code?.toUpperCase(),
          type: updatedCoupon.type,
          value: updatedCoupon.value ? parseFloat(updatedCoupon.value) : undefined,
          expiry: updatedCoupon.expiry,
          active: updatedCoupon.active,
          once_per_cpf: updatedCoupon.oncePerCpf,
          max_uses: updatedCoupon.maxUses ? parseInt(updatedCoupon.maxUses) : undefined
        };

        try {
          const { error } = await supabase.from('coupons').update(dataForDb).eq('id', id);
          if (error) throw error;

          set((state) => ({
            coupons: state.coupons.map((c) => (c.id === id ? { ...c, ...updatedCoupon } : c))
          }));
        } catch (err) {
          console.error('Erro ao atualizar cupom no Supabase:', err);
        }
      },

      deleteCoupon: async (id) => {
        try {
          const { error } = await supabase.from('coupons').delete().eq('id', id);
          if (error) throw error;

          set((state) => ({
            coupons: state.coupons.filter((c) => c.id !== id)
          }));
        } catch (err) {
          console.error('Erro ao deletar cupom no Supabase:', err);
        }
      },

      toggleCouponStatus: async (id) => {
        const { coupons } = get();
        const coupon = coupons.find(c => c.id === id);
        if (!coupon) return;
        const newActive = !coupon.active;
        try {
          const { error } = await supabase.from('coupons').update({ active: newActive }).eq('id', id);
          if (error) throw error;
          set({ coupons: coupons.map(c => c.id === id ? { ...c, active: newActive } : c) });
        } catch (err) {
          console.error('Erro ao alternar status do cupom no Supabase:', err);
        }
      },

      validateCoupon: async (code, cpf) => {
        // Busca direto do banco — não depende do estado local (que pode estar vazio para clientes)
        const { data: couponData, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', code.toUpperCase())
          .maybeSingle();

        if (error || !couponData) return { valid: false, message: 'Cupom não encontrado.' };

        const coupon = {
          ...couponData,
          usageCount: couponData.used_count,
          oncePerCpf: couponData.once_per_cpf,
          maxUses: couponData.max_uses
        };

        if (!coupon.active) return { valid: false, message: 'Este cupom está inativo.' };

        const today = new Date().toISOString().split('T')[0];
        if (coupon.expiry && coupon.expiry < today) return { valid: false, message: 'Este cupom está expirado.' };

        if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
          return { valid: false, message: 'Este cupom atingiu o limite de usos.' };
        }

        // Validação de uso único por CPF
        if (coupon.oncePerCpf && cpf) {
          const cleanCpf = cpf.replace(/\D/g, '');
          const { data: usedOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('cpf', cleanCpf)
            .eq('coupon_used', coupon.code)
            .limit(1);

          if (usedOrders && usedOrders.length > 0) {
            return { valid: false, message: 'Você já utilizou este cupom anteriormente.' };
          }
        }

        return { valid: true, coupon };
      },

      redeemCoupon: async (code) => {
        const { coupons } = get();
        const coupon = coupons.find(c => c.code === code.toUpperCase());
        if (!coupon) return;

        try {
          const { error } = await supabase
            .from('coupons')
            .update({ used_count: coupon.usageCount + 1 })
            .eq('id', coupon.id);

          if (error) throw error;

          set((state) => ({
            coupons: state.coupons.map(c => 
              c.id === coupon.id ? { ...c, usageCount: c.usageCount + 1 } : c
            )
          }));
        } catch (err) {
          console.error('Erro ao resgatar cupom no Supabase:', err);
        }
      },
    })
);
