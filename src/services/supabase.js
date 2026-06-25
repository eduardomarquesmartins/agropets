import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error('Supabase URL ou Key nao encontradas no arquivo .env');
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase nao esta configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

/**
 * Faz o upload de uma imagem de produto para o bucket 'products'
 * @param {File} file
 * @returns {Promise<string>} URL publica da imagem
 */
export const uploadProductImage = async (file) => {
  const client = requireSupabase();
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `product-images/${fileName}`;

  const { error } = await client.storage
    .from('products')
    .upload(filePath, file);

  if (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }

  const { data: { publicUrl } } = client.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Faz o upload de uma imagem de banner para o bucket 'products'
 * @param {File} file
 * @returns {Promise<string>} URL publica da imagem
 */
export const uploadBannerImage = async (file) => {
  const client = requireSupabase();
  const fileExt = file.name.split('.').pop().toLowerCase();
  const allowedTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  if (!allowedTypes.includes(fileExt)) {
    throw new Error('Formato nao suportado. Use JPG, PNG, WEBP ou GIF.');
  }

  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `banner-images/${fileName}`;

  const { error } = await client.storage
    .from('products')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error('Erro ao fazer upload do banner:', error);
    throw error;
  }

  const { data: { publicUrl } } = client.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicUrl;
};
