-- THINGOR DATABASE SCHEMA & RLS POLICIES

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Profile trigger on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
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

CREATE POLICY "Users can manage own locations"
  ON public.locations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


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
  warranty_start DATE,
  warranty_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own items"
  ON public.items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


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

CREATE POLICY "Users can manage own item documents"
  ON public.item_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


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
