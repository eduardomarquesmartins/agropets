import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/stringUtils';

const initialCategories = [
  { 
    id: 'cachorros', 
    name: 'Cachorros', 
    img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=300&q=80',
    subCategories: [
      { id: 'racoes', name: 'Rações' },
      { id: 'petiscos', name: 'Petiscos & Ossos' },
      { id: 'brinquedos', name: 'Brinquedos' },
      { id: 'higiene', name: 'Higiene & Beleza' },
      { id: 'acessorios', name: 'Camas & Acessórios' }
    ]
  },
  { 
    id: 'gatos', 
    name: 'Gatos', 
    img: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=80',
    subCategories: [
      { id: 'racoes', name: 'Rações' },
      { id: 'areias', name: 'Areias & Banheiros' },
      { id: 'brinquedos', name: 'Brinquedos' },
      { id: 'arranhadores', name: 'Arranhadores & Camas' },
      { id: 'higiene', name: 'Saúde & Higiene' }
    ]
  },
  { id: 'passaros', name: 'Pássaros', img: '/passaro_cat.png', subCategories: [{ id: 'alimentos', name: 'Alimentos' }] },
  { id: 'peixes', name: 'Peixes', img: '/peixe_hd.png', subCategories: [{ id: 'alimentos', name: 'Alimentos' }] },
  { id: 'agropecuaria', name: 'Agropecuária', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80', subCategories: [{ id: 'nutricao', name: 'Nutrição Animal' }] },
  { id: 'brinquedos', name: 'Brinquedos', img: 'https://images.unsplash.com/photo-1576201836106-cf1758af1c62?auto=format&fit=crop&w=300&q=80', subCategories: [{ id: 'caes-brinq', name: 'Brinquedos para Cães' }] }
];

export const useCategoryStore = create(
  persist(
    (set, get) => ({
      categories: initialCategories,
      isLoading: false,

      fetchCategories: async () => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('position');

          if (error) throw error;

          if (data && data.length > 0) {
            const mapped = data.map(cat => ({
              ...cat,
              subCategories: cat.sub_categories || []
            }));
            set({ categories: mapped });
          }
        } catch (err) {
          console.error('Erro ao buscar categorias no Supabase:', err);
        } finally {
          set({ isLoading: false });
        }
      },
      
      addCategory: async (category) => {
        const id = category.id || slugify(category.name);
        const dataForDb = {
          id,
          name: category.name,
          img: category.img,
          sub_categories: category.subCategories || []
        };

        try {
          const { error } = await supabase.from('categories').insert([dataForDb]);
          if (error) throw error;
          
          set((state) => ({
            categories: [...state.categories, { ...category, id, subCategories: category.subCategories || [] }]
          }));
        } catch (err) {
          console.error('Erro ao adicionar categoria no Supabase:', err);
        }
      },
      
      updateCategory: async (id, updatedCategory) => {
        try {
          const { error } = await supabase
            .from('categories')
            .update({
              name: updatedCategory.name,
              img: updatedCategory.img,
              sub_categories: updatedCategory.subCategories
            })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            categories: state.categories.map((cat) => (cat.id === id ? { ...cat, ...updatedCategory } : cat))
          }));
        } catch (err) {
          console.error('Erro ao atualizar categoria no Supabase:', err);
        }
      },
      
      deleteCategory: async (id) => {
        try {
          const { error } = await supabase.from('categories').delete().eq('id', id);
          if (error) throw error;

          set((state) => ({
            categories: state.categories.filter((cat) => cat.id !== id)
          }));
        } catch (err) {
          console.error('Erro ao deletar categoria no Supabase:', err);
        }
      },
      
      addSubCategory: async (categoryId, subCategory) => {
        const { categories } = get();
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) return;

        const newSub = { 
          id: subCategory.id || slugify(subCategory.name),
          ...subCategory
        };
        const updatedSubs = [...(cat.subCategories || []), newSub];

        try {
          const { error } = await supabase
            .from('categories')
            .update({ sub_categories: updatedSubs })
            .eq('id', categoryId);

          if (error) throw error;

          set((state) => ({
            categories: state.categories.map((c) => 
              c.id === categoryId ? { ...c, subCategories: updatedSubs } : c
            )
          }));
        } catch (err) {
          console.error('Erro ao adicionar subcategoria no Supabase:', err);
        }
      },
      
      // Funções de Update/Delete Sub podem ser implementadas similarmente se necessário
      syncDefaultCategories: async () => {
        const { categories, addCategory } = get();
        const missing = initialCategories.filter(def => !categories.find(c => c.id === def.id));
        
        for (const cat of missing) {
          await addCategory(cat);
        }
      },
    }),
    {
      name: 'agropets-categories',
    }
  )
);
