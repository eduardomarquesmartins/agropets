import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useBannerStore = create(
  (set, get) => ({
      banners: [],
      isLoading: false,
      
      fetchBanners: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('position');

          if (error) throw error;
          
          if (data) {
            const mapped = data.map(b => ({
              ...b,
              buttonText: b.button_text
            }));
            set({ banners: mapped });
          }
        } catch (err) {
          console.error('Erro ao buscar banners no Supabase:', err);
        } finally {
          set({ isLoading: false });
        }
      },
      
      addBanner: async (banner) => {
        const id = crypto.randomUUID();
        const dataForDb = { 
          id,
          title: banner.title,
          subtitle: banner.subtitle,
          img: banner.img,
          link: banner.link,
          button_text: banner.buttonText,
          status: banner.status || 'active',
          position: banner.position !== undefined ? banner.position : (get().banners.length > 0 ? Math.max(...get().banners.map(b => b.position || 0)) + 1 : 1)
        };

        try {
          const { error } = await supabase.from('banners').insert([dataForDb]);
          if (error) throw error;

          set((state) => ({ banners: [...state.banners, { ...banner, id }] }));
        } catch (err) {
          console.error('Erro ao adicionar banner no Supabase:', err);
        }
      },
      
      updateBanner: async (id, updatedBanner) => {
        const dataForDb = {
          title: updatedBanner.title,
          subtitle: updatedBanner.subtitle,
          img: updatedBanner.img,
          link: updatedBanner.link,
          button_text: updatedBanner.buttonText,
          status: updatedBanner.status,
          position: updatedBanner.position
        };

        try {
          const { error } = await supabase.from('banners').update(dataForDb).eq('id', id);
          if (error) throw error;

          set((state) => ({
            banners: state.banners.map((b) => (b.id === id ? { ...b, ...updatedBanner, buttonText: updatedBanner.buttonText || b.buttonText } : b))
          }));
        } catch (err) {
          console.error('Erro ao atualizar banner no Supabase:', err);
        }
      },
      
      deleteBanner: async (id) => {
        try {
          const { error } = await supabase.from('banners').delete().eq('id', id);
          if (error) throw error;

          set((state) => ({
            banners: state.banners.filter((b) => b.id !== id)
          }));
        } catch (err) {
          console.error('Erro ao deletar banner no Supabase:', err);
        }
      },
      
      toggleBannerStatus: async (id) => {
        const { banners } = get();
        const banner = banners.find(b => b.id === id);
        if (!banner) return;

        const newStatus = banner.status === 'active' ? 'inactive' : 'active';
        try {
          const { error } = await supabase.from('banners').update({ status: newStatus }).eq('id', id);
          if (error) throw error;

          set({ banners: banners.map((b) => (b.id === id ? { ...b, status: newStatus } : b)) });
        } catch (err) {
          console.error('Erro ao alternar status do banner no Supabase:', err);
        }
      },

      moveBanner: async (id, direction) => {
        const { banners } = get();
        const index = banners.findIndex(b => b.id === id);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= banners.length) return;

        const currentBanner = { ...banners[index] };
        const adjacentBanner = { ...banners[newIndex] };

        // Swap positions
        const tempPos = currentBanner.position;
        currentBanner.position = adjacentBanner.position;
        adjacentBanner.position = tempPos;

        // If positions are the same (happens if data is messy), force a gap
        if (currentBanner.position === adjacentBanner.position) {
          if (direction === 'up') {
            currentBanner.position -= 1;
          } else {
            currentBanner.position += 1;
          }
        }

        try {
          // Update both in DB
          const updates = [
            supabase.from('banners').update({ position: currentBanner.position }).eq('id', currentBanner.id),
            supabase.from('banners').update({ position: adjacentBanner.position }).eq('id', adjacentBanner.id)
          ];
          
          await Promise.all(updates);

          // Update local state
          const newBanners = [...banners];
          newBanners[index] = currentBanner;
          newBanners[newIndex] = adjacentBanner;
          
          // Re-sort locally
          newBanners.sort((a, b) => a.position - b.position);
          
          set({ banners: newBanners });
        } catch (err) {
          console.error('Erro ao reordenar banners:', err);
        }
      },

      reorderBanners: async (newBanners) => {
        // Update positions based on array index
        const updatedBanners = newBanners.map((b, index) => ({
          ...b,
          position: index + 1
        }));

        try {
          // Prepare batch updates
          const updates = updatedBanners.map(b => 
            supabase.from('banners').update({ position: b.position }).eq('id', b.id)
          );
          
          await Promise.all(updates);
          set({ banners: updatedBanners });
        } catch (err) {
          console.error('Erro ao reordenar todos os banners:', err);
        }
      }
    })
);
