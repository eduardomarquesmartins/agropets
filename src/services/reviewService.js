import { supabase } from './supabase';

export const reviewService = {
  /**
   * Busca as avaliações de um produto específico
   * @param {string} productId 
   */
  async getReviewsByProduct(productId) {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      return [];
    }
  },

  /**
   * Envia uma nova avaliação
   * @param {object} reviewData { product_id, user_id, user_name, rating, comment }
   */
  async submitReview(reviewData) {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .insert([reviewData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Calcula a média de avaliações de um produto
   * @param {string} productId 
   */
  async getAverageRating(productId) {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId);

      if (error) throw error;
      
      if (!data || data.length === 0) return { average: 0, count: 0 };

      const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
      const average = sum / data.length;

      return { average, count: data.length };
    } catch (error) {
      console.error('Erro ao calcular média de avaliações:', error);
      return { average: 0, count: 0 };
    }
  }
};
