-- ═══════════════════════════════════════════════════════════
-- Migration: Adicionar duração e data de início aos pacotes
-- Execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS duration_months integer DEFAULT 1;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE;
