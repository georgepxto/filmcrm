-- Add Google Event ID to sessions table for 2-way sync
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS google_event_id text DEFAULT '';
