-- ==========================================================
-- Migration: 20261008_notifications_schema.sql
-- Description: Create Notifications and User Notification Settings tables,
--              add notification toggles to site_settings, and set up RLS.
-- ==========================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('warranty', 'financing', 'repair', 'system')),
  reference_id UUID,
  dedup_key TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_user_dedup_unique UNIQUE (user_id, dedup_key)
);

-- 2. USER NOTIFICATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  warranty_enabled BOOLEAN NOT NULL DEFAULT true,
  financing_enabled BOOLEAN NOT NULL DEFAULT true,
  repair_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  inapp_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SITE SETTINGS NOTIFICATION TOGGLES
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='site_settings' AND column_name='notifications_enabled'
  ) THEN
    ALTER TABLE public.site_settings ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='site_settings' AND column_name='email_notifications_enabled'
  ) THEN
    ALTER TABLE public.site_settings ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- 4. ENABLE RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- 6. RLS POLICIES FOR USER NOTIFICATION SETTINGS
DROP POLICY IF EXISTS "Users can view own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can view own notification settings"
  ON public.user_notification_settings FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can insert own notification settings"
  ON public.user_notification_settings FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification settings" ON public.user_notification_settings;
CREATE POLICY "Users can update own notification settings"
  ON public.user_notification_settings FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications(user_id, is_read);
