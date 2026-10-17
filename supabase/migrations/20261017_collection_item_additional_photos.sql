-- Migration: 20261017_collection_item_additional_photos.sql
-- Description: Adds additional_photos array column to collection_items for multi-photo gallery support.

ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS additional_photos TEXT[] DEFAULT '{}'::text[];
