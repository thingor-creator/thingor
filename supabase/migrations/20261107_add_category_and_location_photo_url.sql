-- Add optional photo_url column to categories and locations tables
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS photo_url TEXT;

