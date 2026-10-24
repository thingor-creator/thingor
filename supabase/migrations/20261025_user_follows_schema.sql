-- ==============================================================================
-- THINGOR COMMUNITY PLATFORM — PHASE 1A: USER FOLLOWS SCHEMA & SOCIAL GRAPH
-- Migration: 20261025_user_follows_schema.sql
-- Environment: Staging / Production
-- Target Table: public.user_follows
-- Scope: User follow relationships, counter helpers, and least-privilege RLS
-- ==============================================================================

-- 1. Create the user_follows join table
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id),
  CONSTRAINT user_follows_follower_profile_fkey FOREIGN KEY (follower_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT user_follows_following_profile_fkey FOREIGN KEY (following_id) REFERENCES public.public_profiles(user_id) ON DELETE CASCADE
);

-- 2. Performance indexes for social graph traversals and counts
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- SELECT: Social graph is public; both guests (anon) and authenticated users can view follow relationships.
DROP POLICY IF EXISTS "user_follows_select_policy" ON public.user_follows;
CREATE POLICY "user_follows_select_policy"
  ON public.user_follows FOR SELECT
  USING (true);

-- INSERT: Authenticated users can only follow under their own verified identity.
DROP POLICY IF EXISTS "user_follows_insert_policy" ON public.user_follows;
CREATE POLICY "user_follows_insert_policy"
  ON public.user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- DELETE: Authenticated users can only remove their own follow relationships.
DROP POLICY IF EXISTS "user_follows_delete_policy" ON public.user_follows;
CREATE POLICY "user_follows_delete_policy"
  ON public.user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Note: No UPDATE policy is created. Follow relationships are binary (present or deleted).

-- 5. Explicit Least-Privilege Table Permissions
REVOKE ALL ON TABLE public.user_follows FROM PUBLIC;
REVOKE ALL ON TABLE public.user_follows FROM anon;
REVOKE ALL ON TABLE public.user_follows FROM authenticated;

-- Anon can only view follow relationships (subject to SELECT policy)
GRANT SELECT ON TABLE public.user_follows TO anon;

-- Authenticated can query, create, and delete their own follows
GRANT SELECT, INSERT, DELETE ON TABLE public.user_follows TO authenticated;

-- 6. Server-Side Helper Function: Exact Follow Stats & Relationship Check
-- Computes real-time follower/following counts directly on PostgreSQL engine to prevent client manipulation.
CREATE OR REPLACE FUNCTION public.get_user_follow_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_followers_count BIGINT;
  v_following_count BIGINT;
  v_is_following BOOLEAN := false;
BEGIN
  -- Total users following target_user_id
  SELECT COUNT(*) INTO v_followers_count
  FROM public.user_follows
  WHERE following_id = target_user_id;

  -- Total users target_user_id is following
  SELECT COUNT(*) INTO v_following_count
  FROM public.user_follows
  WHERE follower_id = target_user_id;

  -- Check if the current authenticated caller follows target_user_id
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_follows
      WHERE follower_id = auth.uid() AND following_id = target_user_id
    ) INTO v_is_following;
  END IF;

  RETURN json_build_object(
    'followers_count', v_followers_count,
    'following_count', v_following_count,
    'is_following', v_is_following
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_user_follow_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_follow_stats(UUID) TO anon, authenticated;
