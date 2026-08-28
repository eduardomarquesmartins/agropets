-- ============================================================
-- Agropets - Script de Consolidação V9 (DEFINITIVO)
-- Seguro para rodar em banco existente — usa IF NOT EXISTS
-- ============================================================

-- 0. Extensões
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. CRIAR TABELAS (se não existirem)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood TEXT NOT NULL UNIQUE,
  fee DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  img TEXT,
  position INTEGER DEFAULT 0,
  sub_categories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2),
  discount INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  brand TEXT,
  img TEXT,
  description TEXT,
  vitamins JSONB DEFAULT '[]'::jsonb,
  composition JSONB DEFAULT '[]'::jsonb,
  guarantee JSONB DEFAULT '[]'::jsonb,
  weight TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  category TEXT REFERENCES public.categories(id),
  sub_category TEXT,
  sku TEXT,
  max_installments INTEGER,
  variations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT DEFAULT '',
  phone TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,
  location TEXT,
  address TEXT,
  number TEXT,
  neighborhood TEXT,
  cep TEXT,
  complement TEXT,
  pet_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  expiry DATE,
  active BOOLEAN DEFAULT true,
  once_per_cpf BOOLEAN DEFAULT false,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  minimum_purchase_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (minimum_purchase_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  category TEXT,
  payment_method TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT,
  user_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  cpf TEXT,
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  payment TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  cep TEXT,
  coupon_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT,
  pet_name TEXT,
  pet_type TEXT,
  service TEXT,
  date DATE,
  time TIME,
  status TEXT DEFAULT 'Pendente',
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  subtitle TEXT,
  img TEXT NOT NULL,
  link TEXT,
  button_text TEXT,
  status TEXT DEFAULT 'active',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  breed TEXT,
  age TEXT,
  weight TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  description TEXT,
  vet_name TEXT,
  date TIMESTAMPTZ DEFAULT now(),
  attachments JSONB DEFAULT '[]'::jsonb,
  observations TEXT
);

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. ADICIONAR COLUNAS QUE PODEM FALTAR EM TABELAS EXISTENTES
--    (ADD COLUMN IF NOT EXISTS — seguro, não apaga dados)
-- ============================================================

-- products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_installments INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price DECIMAL(10,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vitamins JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS composition JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS guarantee JSONB DEFAULT '[]'::jsonb;

-- admin_users
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pet_type TEXT;

-- transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_used TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- inventory_logs: user_id deve ser TEXT (código envia 'system' como string)
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS reason TEXT;
-- Converter user_id de UUID para TEXT se necessário
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_logs'
    AND column_name = 'user_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.inventory_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
  END IF;
END $$;

-- appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pet_type TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service TEXT;

-- categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS img TEXT;

-- banners
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS button_text TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS title TEXT;

-- ============================================================
-- 3. RLS — Habilitar proteção por padrão
-- As políticas de acesso são definidas na migração versionada
-- supabase/migrations/20260828181024_harden_auth_and_rls.sql.
-- ============================================================

DO $$
DECLARE tbl RECORD;
BEGIN
  FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 4. DADOS INICIAIS (ON CONFLICT — não sobrescreve dados reais)
-- ============================================================

-- Usuários administrativos devem ser criados no Supabase Auth e vinculados
-- manualmente a public.admin_users depois de aplicar a migração de segurança.
