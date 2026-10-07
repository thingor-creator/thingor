-- THINGOR DATABASE SCHEMA & RLS POLICIES

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update user profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Profile trigger on user signup
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
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view default and own categories"
  ON public.categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own custom categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Insert Default Categories
INSERT INTO public.categories (name, user_id, is_custom) VALUES
  ('Electronics', NULL, FALSE),
  ('Tools', NULL, FALSE),
  ('Home', NULL, FALSE),
  ('Garden', NULL, FALSE),
  ('Vehicles', NULL, FALSE),
  ('Sports', NULL, FALSE),
  ('Books', NULL, FALSE),
  ('Collectibles', NULL, FALSE),
  ('Clothing', NULL, FALSE),
  ('Appliances', NULL, FALSE),
  ('Other', NULL, FALSE)
ON CONFLICT DO NOTHING;


-- 3. LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can view own or shared household locations" ON public.locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.locations;

CREATE POLICY "Users can view own or shared household locations"
  ON public.locations FOR SELECT
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT unnest(shared_location_ids) FROM public.households
      WHERE id IN (
        SELECT household_id FROM public.household_members
        WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.location_id = locations.id
        AND (items.ownership_scope = 'household' OR items.household_id IN (
          SELECT household_id FROM public.household_members
          WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
        ))
    )
  );

CREATE POLICY "Users can insert own locations"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own locations"
  ON public.locations FOR UPDATE
  USING (
    auth.uid() = user_id OR
    id IN (
      SELECT unnest(shared_location_ids) FROM public.households
      WHERE id IN (
        SELECT household_id FROM public.household_members
        WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
      )
    )
  );

CREATE POLICY "Users can delete own locations"
  ON public.locations FOR DELETE
  USING (auth.uid() = user_id);


-- 4. ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  photo_url TEXT,
  additional_photos TEXT[] DEFAULT '{}',
  purchase_date DATE,
  purchase_price NUMERIC(10, 2),
  current_value NUMERIC(10, 2),
  store_seller TEXT,
  condition TEXT NOT NULL DEFAULT 'Good',
  ownership_scope TEXT DEFAULT 'private',
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  warranty_start DATE,
  warranty_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
DROP POLICY IF EXISTS "Users can view own or shared household items" ON public.items;
DROP POLICY IF EXISTS "Users can insert own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can update own or household items" ON public.items;
DROP POLICY IF EXISTS "Users can delete own or household items" ON public.items;

CREATE POLICY "Users can view own or shared household items"
  ON public.items FOR SELECT
  USING (
    user_id = auth.uid() OR
    ownership_scope = 'household' OR
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    ) OR
    EXISTS (
      SELECT 1 FROM public.item_shares
      WHERE item_shares.item_id = items.id
        AND item_shares.revoked_at IS NULL
        AND (item_shares.expires_at IS NULL OR item_shares.expires_at > NOW())
    )
  );

CREATE POLICY "Users can insert own or household items"
  ON public.items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    (household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    ))
  );

CREATE POLICY "Users can update own or household items"
  ON public.items FOR UPDATE
  USING (
    user_id = auth.uid() OR
    ownership_scope = 'household' OR
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can delete own or household items"
  ON public.items FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = items.household_id
        AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );


-- 5. ITEM DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.item_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'Other',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Item Documents
ALTER TABLE public.item_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can view own or household item documents" ON public.item_documents;
DROP POLICY IF EXISTS "Users can insert own or household item documents" ON public.item_documents;

CREATE POLICY "Users can view own or household item documents"
  ON public.item_documents FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
        AND (items.ownership_scope = 'household' OR items.household_id IN (
          SELECT household_id FROM public.household_members
          WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
        ))
    )
  );

CREATE POLICY "Users can insert own or household item documents"
  ON public.item_documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.items
      WHERE items.id = item_documents.item_id
        AND (items.ownership_scope = 'household' OR items.household_id IN (
          SELECT household_id FROM public.household_members
          WHERE user_id = auth.uid() OR lower(user_email) = lower(auth.jwt()->>'email')
        ))
    )
  );


-- 6. STORAGE BUCKET CONFIGURATION & SECURITY
INSERT INTO storage.buckets (id, name, public) 
VALUES ('thingor-assets', 'thingor-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own storage files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thingor-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own storage files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thingor-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own storage files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thingor-assets' AND auth.uid()::text = (storage.foldername(name))[1]);


-- 7. SITE SETTINGS TABLE
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

CREATE POLICY "Anyone can view site_settings"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update site_settings"
  ON public.site_settings FOR UPDATE
  USING (public.is_admin());

INSERT INTO public.site_settings (id, site_name)
VALUES ('default', 'Thingor')
ON CONFLICT (id) DO NOTHING;


-- 8. ITEM SHARES TABLE
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

CREATE POLICY "Users can manage own item shares"
  ON public.item_shares FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can view active valid item shares"
  ON public.item_shares FOR SELECT
  USING (
    revoked_at IS NULL AND
    (expires_at IS NULL OR expires_at > NOW())
  );


-- 9. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());


-- 10. SECURE SHARED ITEM RPC FUNCTION
CREATE OR REPLACE FUNCTION public.get_shared_item(share_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_share RECORD;
  v_item RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_share
  FROM public.item_shares
  WHERE token = share_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_item
  FROM public.items
  WHERE id = v_share.item_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

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


-- 11. HOUSEHOLDS, MEMBERS & INVITES TABLES
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shared_location_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_email)
);

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.household_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR HOUSEHOLDS
DROP POLICY IF EXISTS "Household members can view own household" ON public.households;
CREATE POLICY "Household members can view own household"
  ON public.households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
        AND (household_members.user_id = auth.uid() OR LOWER(household_members.user_email) = LOWER(auth.jwt()->>'email'))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create household" ON public.households;
CREATE POLICY "Authenticated users can create household"
  ON public.households FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Household owners/admins can update household" ON public.households;
CREATE POLICY "Household owners/admins can update household"
  ON public.households FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = households.id
        AND (household_members.user_id = auth.uid() OR LOWER(household_members.user_email) = LOWER(auth.jwt()->>'email'))
        AND household_members.role IN ('owner', 'admin')
    )
  );

-- RLS POLICIES FOR HOUSEHOLD MEMBERS
DROP POLICY IF EXISTS "Members can view household member list" ON public.household_members;
CREATE POLICY "Members can view household member list"
  ON public.household_members FOR SELECT
  USING (
    user_id = auth.uid() OR LOWER(user_email) = LOWER(auth.jwt()->>'email') OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
    )
  );

DROP POLICY IF EXISTS "Users can insert household members" ON public.household_members;
CREATE POLICY "Users can insert household members"
  ON public.household_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update household members" ON public.household_members;
CREATE POLICY "Admins can update household members"
  ON public.household_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Members or admins can delete member" ON public.household_members;
CREATE POLICY "Members or admins can delete member"
  ON public.household_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_members.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );

-- RLS POLICIES FOR HOUSEHOLD INVITES
DROP POLICY IF EXISTS "Users can view pending invites sent to their email or by their household" ON public.household_invites;
CREATE POLICY "Users can view pending invites sent to their email or by their household"
  ON public.household_invites FOR SELECT
  USING (
    LOWER(invited_email) = LOWER(auth.jwt()->>'email') OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_invites.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
    )
  );

DROP POLICY IF EXISTS "Household owners/admins can send invites" ON public.household_invites;
CREATE POLICY "Household owners/admins can send invites"
  ON public.household_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_invites.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Invited users or household admins can update invites" ON public.household_invites;
CREATE POLICY "Invited users or household admins can update invites"
  ON public.household_invites FOR UPDATE
  USING (
    LOWER(invited_email) = LOWER(auth.jwt()->>'email') OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_invites.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete invites" ON public.household_invites;
CREATE POLICY "Admins can delete invites"
  ON public.household_invites FOR DELETE
  USING (
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = household_invites.household_id
        AND (hm.user_id = auth.uid() OR LOWER(hm.user_email) = LOWER(auth.jwt()->>'email'))
        AND hm.role IN ('owner', 'admin')
    )
  );


