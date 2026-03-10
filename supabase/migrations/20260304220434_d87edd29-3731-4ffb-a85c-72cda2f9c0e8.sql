ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Ensure existing templates are active
UPDATE public.templates SET status = 'active' WHERE status IS NULL;