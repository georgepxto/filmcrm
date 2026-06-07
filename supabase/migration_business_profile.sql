-- ── Migration: dados empresariais para user_profiles ─────────────────────────
-- Objetivo: remover CPF/CNPJ/PIX do user_metadata (JWT) e mover para user_profiles
-- Executar no SQL Editor do Supabase (uma vez)

-- 1. Adiciona colunas de dados empresariais em user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS company_name     text,
  ADD COLUMN IF NOT EXISTS document_type   text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS pix_key         text,
  ADD COLUMN IF NOT EXISTS currency        text DEFAULT 'BRL';

-- 2. Migra dados existentes de user_metadata para user_profiles
UPDATE user_profiles up
SET
  company_name     = (au.raw_user_meta_data->>'company_name'),
  document_type    = COALESCE(au.raw_user_meta_data->>'document_type', 'CPF'),
  document_number  = (au.raw_user_meta_data->>'document_number'),
  pix_key          = (au.raw_user_meta_data->>'pix_key'),
  currency         = COALESCE(au.raw_user_meta_data->>'currency', 'BRL')
FROM auth.users au
WHERE up.user_id = au.id;

-- 3. Restrição MIME no bucket de avatares (server-side)
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  file_size_limit    = 5242880  -- 5 MB
WHERE id = 'avatars';

-- 4. Política RLS para usuários lerem e escreverem seus próprios dados empresariais
-- (user_profiles já deve ter políticas, mas garantir que as novas colunas estejam cobertas)
-- Se a política existente for: "users can update own profile" com USING (user_id = auth.uid())
-- então as novas colunas já estarão cobertas automaticamente.
