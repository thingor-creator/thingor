-- Add shopping_cart_enabled column to user_notification_settings table
ALTER TABLE public.user_notification_settings
ADD COLUMN IF NOT EXISTS shopping_cart_enabled BOOLEAN NOT NULL DEFAULT true;
