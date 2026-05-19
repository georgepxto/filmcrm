-- Adiciona colunas para suportar dias inteiros e múltiplos dias no calendário
alter table public.sessions add column if not exists is_all_day boolean default false;
alter table public.sessions add column if not exists date_end date;
