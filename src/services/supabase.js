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

/**
 * Faz upload de uma imagem para campanhas de e-mail e retorna uma URL HTTPS pública.
 * E-mails não devem usar imagens em Base64, pois provedores como Gmail as bloqueiam.
 */
export const uploadMarketingImage = async (file) => {
  const client = requireSupabase();
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const maxBytes = 5 * 1024 * 1024;

  if (!file || !allowedTypes.has(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG, WEBP ou GIF.');
  }
  if (file.size > maxBytes) {
    throw new Error('Cada imagem deve ter no máximo 5 MB.');
  }

  const extensionsByMimeType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const nameExtension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : null;
  const extension = extensionsByMimeType[file.type] || nameExtension || 'img';
  const path = `marketing-images/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage
    .from('products')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (error) throw error;

  const { data: { publicUrl } } = client.storage.from('products').getPublicUrl(path);
  return publicUrl;
};
