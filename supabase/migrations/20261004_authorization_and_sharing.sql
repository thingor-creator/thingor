-- THINGOR AUTHORIZATION & ITEM SHARING MIGRATION

-- 1. PROFILES ENHANCEMENT (Role & Status)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted'));

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update profile trigger to default role = 'user', status = 'active'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'user',
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update user profiles" ON public.profiles;
CREATE POLICY "Admins can update user profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());


-- 2. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  site_name TEXT NOT NULL DEFAULT 'Thingor',
  hero_title TEXT NOT NULL DEFAULT 'Személyes leltár, tárgy- és dokumentumkezelő',
  hero_subtitle TEXT DEFAULT 'Rendszerezd, dokumentáld és oszd meg értékeidet biztonságosan.',
  announcement TEXT,
  registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'A rendszer jelenleg karbantartás alatt áll. Kérjük, látogass vissza később.',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view site_settings" ON public.site_settings;
CREATE POLICY "Anyone can view site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update site_settings" ON public.site_settings;
CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert site_settings" ON public.site_settings;
CREATE POLICY "Admins can insert site_settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.is_admin());

INSERT INTO public.site_settings (id, site_name)
VALUES ('default', 'Thingor')
ON CONFLICT (id) DO NOTHING;


-- 3. ITEM SHARES TABLE
CREATE TABLE IF NOT EXISTS public.item_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'view' CHECK (purpose IN ('view', 'sale', 'loan')),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  permissions JSONB NOT NULL DEFAULT '{"include_purchase_date": false, "include_warranty": false, "include_value": false, "include_purchase_price": false, "include_additional_images": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.item_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own item shares" ON public.item_shares;
CREATE POLICY "Users can manage own item shares"
  ON public.item_shares FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Anyone can view active valid item shares" ON public.item_shares;
CREATE POLICY "Anyone can view active valid item shares"
  ON public.item_shares FOR SELECT
  USING (
    revoked_at IS NULL AND
    (expires_at IS NULL OR expires_at > NOW())
  );


-- 4. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());


-- 5. SECURE SHARED ITEM RPC FUNCTION
CREATE OR REPLACE FUNCTION public.get_shared_item(share_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_share RECORD;
  v_item RECORD;
  v_result JSONB;
BEGIN
  -- Fetch share
  SELECT * INTO v_share
  FROM public.item_shares
  WHERE token = share_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fetch item
  SELECT * INTO v_item
  FROM public.items
  WHERE id = v_share.item_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build filtered JSON payload
  v_result := jsonb_build_object(
    'share_id', v_share.id,
    'purpose', v_share.purpose,
    'expires_at', v_share.expires_at,
    'permissions', v_share.permissions,
    'created_at', v_share.created_at,
    'item_id', v_item.id,
    'name', v_item.name,
    'description', v_item.description,
    'condition', v_item.condition,
    'photo_url', v_item.photo_url
  );

  -- Conditionally add fields based on permissions
  IF (v_share.permissions->>'include_additional_images')::boolean = true THEN
    v_result := jsonb_set(v_result, '{additional_photos}', to_jsonb(v_item.additional_photos));
  END IF;

  IF (v_share.permissions->>'include_purchase_date')::boolean = true THEN
    v_result := jsonb_set(v_result, '{purchase_date}', to_jsonb(v_item.purchase_date));
  END IF;

  IF (v_share.permissions->>'include_warranty')::boolean = true THEN
    v_result := jsonb_set(v_result, '{warranty_start}', to_jsonb(v_item.warranty_start));
    v_result := jsonb_set(v_result, '{warranty_end}', to_jsonb(v_item.warranty_end));
  END IF;

  IF (v_share.permissions->>'include_value')::boolean = true THEN
    v_result := jsonb_set(v_result, '{current_value}', to_jsonb(v_item.current_value));
  END IF;

  IF (v_share.permissions->>'include_purchase_price')::boolean = true THEN
    v_result := jsonb_set(v_result, '{purchase_price}', to_jsonb(v_item.purchase_price));
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_shared_item(TEXT) TO anon, authenticated;

-- Allow guest users to read items associated with active valid share links
DROP POLICY IF EXISTS "Anyone can view shared items" ON public.items;
CREATE POLICY "Anyone can view shared items"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.item_shares
      WHERE item_shares.item_id = items.id
        AND item_shares.revoked_at IS NULL
        AND (item_shares.expires_at IS NULL OR item_shares.expires_at > NOW())
    )
  );
