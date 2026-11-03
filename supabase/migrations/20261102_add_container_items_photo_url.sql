-- Migration: 20261102_add_container_items_photo_url.sql
-- Description: Add optional photo_url column to public.container_items for bulk/inventory item images
-- Idempotent and safe migration: does not alter existing data, RLS, or other columns.

ALTER TABLE public.container_items
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN public.container_items.photo_url IS 'Optional URL or R2 storage path for the bulk inventory item photo';

