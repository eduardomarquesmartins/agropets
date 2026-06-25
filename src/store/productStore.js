import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { slugify } from '../utils/stringUtils';

export const useProductStore = create(
  (set, get) => ({
    products: [],
    isLoading: false,

    fetchProducts: async () => {
      set({ isLoading: true });
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          // Mapear snake_case para camelCase para o frontend
          const mapped = data.map(p => ({
            ...p,
            oldPrice: p.old_price,
            isFeatured: p.is_featured,
            subCategory: p.sub_category,
            maxInstallments: p.max_installments,
            variations: p.variations || []
          }));
          set({ products: mapped });
        } else {
          // Se o Supabase estiver vazio, não carregar mock data
          set({ products: [] });
        }
      } catch (err) {
        console.error('Erro ao carregar produtos do Supabase:', err);
        // Em caso de erro, manter o que estiver no estado (ou vazio se for o primeiro carregamento)
      } finally {
        set({ isLoading: false });
      }
    },
    
    addProduct: async (product) => {
      const slug = product.slug || slugify(product.name);
      const discount = product.oldPrice && product.oldPrice > product.price 
        ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
        : 0;
          
      const newId = product.id || crypto.randomUUID();
      const productForDb = { 
        id: newId,
        name: product.name,
        slug: slug,
        price: parseFloat(product.price) || 0,
        old_price: product.oldPrice ? parseFloat(product.oldPrice) : null,
        discount: discount,
        stock: parseInt(product.stock) || 0,
        status: product.status || 'active',
        is_featured: product.isFeatured || false,
        brand: product.brand,
        img: product.img,
        description: product.description,
        vitamins: product.vitamins,
        composition: product.composition,
        guarantee: product.guarantee,
        weight: product.weight,
        tags: product.tags || [],
        images: product.images || [],
        category: product.category,
        sub_category: product.subCategory,
        sku: product.sku,
        max_installments: product.maxInstallments ? parseInt(product.maxInstallments) : null,
        variations: product.variations || []
      };

      try {
        const { error } = await supabase
          .from('products')
          .insert([productForDb]);

        if (error) throw error;
          
        // Atualiza estado local
        const productForState = { ...product, id: newId, slug, discount };
        set((state) => ({ products: [...state.products, productForState] }));
          
      } catch (err) {
        console.error('Erro ao persistir produto no Supabase:', err);
        throw err;
      }
    },
    
    updateProduct: async (id, updatedProduct) => {
      const { products } = get();
      const existing = products.find(p => p.id === id);
      if (!existing) return;

      const merged = { ...existing, ...updatedProduct };
      const slug = updatedProduct.name && !updatedProduct.slug
        ? slugify(updatedProduct.name)
        : merged.slug;
          
      const discount = merged.oldPrice && merged.oldPrice > merged.price 
        ? Math.round(((merged.oldPrice - merged.price) / merged.oldPrice) * 100) 
        : 0;
          
      const productForDb = {
        name: merged.name,
        slug: slug,
        price: parseFloat(merged.price) || 0,
        old_price: merged.oldPrice ? parseFloat(merged.oldPrice) : null,
        discount: discount,
        stock: parseInt(merged.stock) || 0,
        status: merged.status || 'active',
        is_featured: merged.isFeatured || false,
        brand: merged.brand,
        img: merged.img,
        description: merged.description,
        vitamins: merged.vitamins,
        composition: merged.composition,
        guarantee: merged.guarantee,
        weight: merged.weight,
        tags: merged.tags || [],
        images: merged.images || [],
        category: merged.category,
        sub_category: merged.subCategory,
        sku: merged.sku,
        max_installments: merged.maxInstallments ? parseInt(merged.maxInstallments) : null,
        variations: merged.variations || []
      };

      try {
        const { error } = await supabase
          .from('products')
          .update(productForDb)
          .eq('id', id);

        if (error) throw error;
          
        set({ products: products.map(p => p.id === id ? { ...merged, slug, discount } : p) });
      } catch (err) {
        console.error('Erro ao atualizar produto no Supabase:', err);
        throw err;
      }
    },
    
    deleteProduct: async (id) => {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;
          
        set((state) => ({
          products: state.products.filter((p) => p.id !== id)
        }));
      } catch (err) {
        console.error('Erro ao deletar produto no Supabase:', err);
      }
    },
    
    updateStock: async (id, quantity) => {
      try {
        const { error } = await supabase
          .from('products')
          .update({ stock: quantity })
          .eq('id', id);

        if (error) throw error;

        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, stock: quantity } : p))
        }));
      } catch (err) {
        console.error('Erro ao atualizar estoque no Supabase:', err);
      }
    },

    deductStock: async (id, amount, reason, userId, variationWeight) => {
      const { products, updateStock } = get();
      const product = products.find(p => p.id === id);
      
      if (!product) return false;

      // Se for uma variação específica
      if (variationWeight && product.variations && product.variations.length > 0) {
        const updatedVariations = product.variations.map(v => {
          if (v.weight === variationWeight) {
            return { ...v, stock: Math.max(0, (parseInt(v.stock) || 0) - amount) };
          }
          return v;
        });

        try {
          // Atualiza as variações no Supabase
          const { error } = await supabase
            .from('products')
            .update({ variations: updatedVariations })
            .eq('id', id);

          if (error) throw error;

          // Atualiza estado local
          set((state) => ({
            products: state.products.map((p) => (p.id === id ? { ...p, variations: updatedVariations } : p))
          }));
        } catch (err) {
          console.error('Erro ao atualizar estoque da variação no Supabase:', err);
          return false;
        }
      } else {
        // Dedução padrão do estoque base
        const newStock = Math.max(0, (product.stock || 0) - amount);
        await updateStock(id, newStock);
      }
      
      // Registrar log no Inventário
      try {
        await supabase.from('inventory_logs').insert([{
          product_id: id,
          product_name: variationWeight ? `${product.name} (${variationWeight})` : product.name,
          type: 'exit',
          quantity: amount,
          reason: reason || 'Venda',
          user_id: userId || 'system'
        }]);
      } catch (logErr) {
        console.error('Erro ao registrar log de estoque:', logErr);
      }
      return true;
    },
  })
);
