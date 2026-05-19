-- Tornar client_id opcional
ALTER TABLE public.sessions ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar coluna de título para eventos pessoais
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS title text DEFAULT '';
