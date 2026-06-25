import { create } from 'zustand';
import { supabase } from '../services/supabase';

const initialSettings = {
  storeName: 'Agropets',
  whatsapp: '51986240794',
  email: 'contato@agropets.com.br',
  address: 'Viamão, RS',
  logo: '',
  primaryColor: '#15803d',
  pixKey: '51986240794',
  footerText: 'Agropets - Tudo para o seu pet com o melhor preço da região.',
  lowStockThreshold: 5,
  cashDiscount: 5,
  installmentInterest: 0,
  maxInstallments: 3,
  deliveryMode: 'neighborhood',
  deliveryFeePerKm: 0,
  maintenanceMode: false,
  banners: [
    { id: 1, url: 'https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?auto=format&fit=crop&w=1200&q=80', active: true },
  ]
};

export const useSettingsStore = create(
  (set, get) => ({
      settings: initialSettings,
      isLoading: false,

      fetchSettings: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'app_settings')
            .single();

          if (error && error.code !== 'PGRST116') throw error; // PGRST116 é 'vazio'

          if (data && data.value) {
            set({ settings: { ...initialSettings, ...data.value } });
          }
        } catch (err) {
          console.error('Erro ao buscar configurações no Supabase:', err);
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateSettings: async (newSettings) => {
        const { settings } = get();
        const updated = { ...settings, ...newSettings };
        
        try {
          const { error } = await supabase
            .from('settings')
            .upsert({ key: 'app_settings', value: updated });

          if (error) throw error;
          set({ settings: updated });
        } catch (err) {
          console.error('Erro ao atualizar configurações no Supabase:', err);
        }
      },

      updateBanner: (id, active) => {
        const { settings, updateSettings } = get();
        const newBanners = settings.banners.map(b => b.id === id ? { ...b, active } : b);
        updateSettings({ banners: newBanners });
      },
    })
);
