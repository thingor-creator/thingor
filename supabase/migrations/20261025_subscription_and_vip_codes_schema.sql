-- THINGOR SUBSCRIPTION PLANS, USER SUBSCRIPTIONS & VIP/PROMO CODES SYSTEM (SECURITY HARDENED)
-- Migration: 20261025_subscription_and_vip_codes_schema.sql
-- Description: Creates subscription plans, user subscriptions, promo/VIP codes,
-- redemptions, audit logs, atomic storage reservations, quota triggers on items/docs/containers/invites,
-- IDOR-protected entitlement calculation, server-side verified reservations, and admin code management.

-- 1. SUBSCRIPTION PLANS TABLE (Lookup / Seed table)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_huf INTEGER NOT NULL DEFAULT 0,
  item_limit INTEGER NOT NULL, -- -1 for unlimited
  doc_limit INTEGER NOT NULL,  -- -1 for unlimited
  storage_limit_bytes BIGINT NOT NULL, -- in bytes: 100 MB = 100,000,000
  container_limit INTEGER NOT NULL, -- -1 for unlimited
  household_invites_limit INTEGER NOT NULL DEFAULT 0, -- Free: 0, Plus: 0, Family: 4 (5 total), Business: 99
  has_vault BOOLEAN NOT NULL DEFAULT false,
  has_insurance_pdf BOOLEAN NOT NULL DEFAULT false,
  max_listings INTEGER NOT NULL DEFAULT 3, -- Free: 3, Plus: 15, Family: 30, Business: -1
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed subscription plans
INSERT INTO public.subscription_plans (
  id, name, price_huf, item_limit, doc_limit, storage_limit_bytes, 
  container_limit, household_invites_limit, has_vault, has_insurance_pdf, max_listings, is_active
) VALUES 
  ('free', 'Free', 0, 50, 5, 100000000, 3, 0, false, false, 3, true),
  ('plus', 'Plus', 1490, 1000, 50, 2000000000, 20, 0, true, true, 15, true),
  ('family', 'Family', 2990, 3000, 150, 5000000000, 50, 4, true, true, 30, true),
  ('business', 'Business', 7990, -1, -1, 10000000000, -1, 99, true, true, -1, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_huf = EXCLUDED.price_huf,
  item_limit = EXCLUDED.item_limit,
  doc_limit = EXCLUDED.doc_limit,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  container_limit = EXCLUDED.container_limit,
  household_invites_limit = EXCLUDED.household_invites_limit,
  has_vault = EXCLUDED.has_vault,
  has_insurance_pdf = EXCLUDED.has_insurance_pdf,
  max_listings = EXCLUDED.max_listings,
  is_active = EXCLUDED.is_active;

-- 2. USER SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'expired')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'free' CHECK (provider IN ('free', 'lemonsqueezy', 'vip', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON public.user_subscriptions(plan_id);

-- 3. PROMO & VIP CODES TABLE
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'vip' CHECK (type IN ('vip', 'promo')),
  target_plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id) DEFAULT 'business',
  duration_days INTEGER, -- NULL = perpetual (lejárat nélküli)
  valid_until TIMESTAMPTZ, -- redemption deadline (NULL = nincs határidő)
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted', 'revoked')),
  campaign_name TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON public.promo_codes(status);

-- 4. PROMO CODE REDEMPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL ha lejárat nélküli
  revoked_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  CONSTRAINT unique_user_promo_code_redemption UNIQUE (promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_redemptions_status ON public.promo_code_redemptions(status);

-- 5. PROMO CODE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.promo_code_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create_code', 'revoke_code_immediate', 'revoke_code_graceful', 'revoke_redemption', 'edit_code')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_code_audit_logs_code ON public.promo_code_audit_logs(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_audit_logs_admin ON public.promo_code_audit_logs(admin_id);

-- 6. STORAGE RESERVATIONS TABLE (Atomic server-side concurrency & quota guard)
CREATE TABLE IF NOT EXISTS public.storage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  reserved_bytes BIGINT NOT NULL CHECK (reserved_bytes > 0),
  actual_bytes BIGINT CHECK (actual_bytes IS NULL OR actual_bytes > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'released')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_reservations_user ON public.storage_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_storage_reservations_expires ON public.storage_reservations(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_storage_reservations_path ON public.storage_reservations(file_path);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_reservations ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- Subscription Plans: Read-only for authenticated, full manage for admins
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
  ON public.subscription_plans FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- User Subscriptions: Users can view own, admins can view and manage all
DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can update subscriptions"
  ON public.user_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Promo Codes: Strictly ADMIN ONLY (Redemption happens via SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Only admins can view promo codes" ON public.promo_codes;
CREATE POLICY "Only admins can view promo codes"
  ON public.promo_codes FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins can insert promo codes" ON public.promo_codes;
CREATE POLICY "Only admins can insert promo codes"
  ON public.promo_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can update promo codes" ON public.promo_codes;
CREATE POLICY "Only admins can update promo codes"
  ON public.promo_codes FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins can delete promo codes" ON public.promo_codes;
CREATE POLICY "Only admins can delete promo codes"
  ON public.promo_codes FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Promo Code Redemptions: Users can see own redemptions, Admins can view and manage
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Users can view own redemptions"
  ON public.promo_code_redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Admins can view all redemptions"
  ON public.promo_code_redemptions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.promo_code_redemptions;
CREATE POLICY "Admins can manage redemptions"
  ON public.promo_code_redemptions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Promo Code Audit Logs: Admin read and insert
DROP POLICY IF EXISTS "Admins can view promo code audit logs" ON public.promo_code_audit_logs;
CREATE POLICY "Admins can view promo code audit logs"
  ON public.promo_code_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert promo code audit logs" ON public.promo_code_audit_logs;
CREATE POLICY "Admins can insert promo code audit logs"
  ON public.promo_code_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Storage Reservations: Users can ONLY READ their own reservations.
-- DIRECT CLIENT INSERT AND UPDATE ARE PROHIBITED (managed exclusively by server RPCs / Edge Function).
DROP POLICY IF EXISTS "Users can view own storage reservations" ON public.storage_reservations;
DROP POLICY IF EXISTS "Users can insert own storage reservations" ON public.storage_reservations;
DROP POLICY IF EXISTS "Users can update own storage reservations" ON public.storage_reservations;

CREATE POLICY "Users can view own storage reservations"
  ON public.storage_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all storage reservations" ON public.storage_reservations;
CREATE POLICY "Admins can view all storage reservations"
  ON public.storage_reservations FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 9. DEFAULT USER SUBSCRIPTION AUTO-PROVISIONING
CREATE OR REPLACE FUNCTION public.handle_user_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, plan_id, status, provider)
  VALUES (NEW.user_id, 'free', 'active', 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_create_default_user_subscription ON public.profiles;
CREATE TRIGGER trg_create_default_user_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_default_subscription();

-- Backfill existing profiles
INSERT INTO public.user_subscriptions (user_id, plan_id, status, provider)
SELECT user_id, 'free', 'active', 'free'
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 10. HELPER FUNCTION: GET USER EFFECTIVE ENTITLEMENT (IDOR & SEARCH_PATH PROTECTED)
CREATE OR REPLACE FUNCTION public.get_user_effective_entitlement(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_id UUID := COALESCE(p_user_id, auth.uid());
  v_active_redemption RECORD;
  v_sub RECORD;
  v_plan RECORD;
  v_effective_plan_id TEXT := 'free';
  v_is_vip BOOLEAN := false;
  v_vip_expires_at TIMESTAMPTZ := NULL;
BEGIN
  -- Strict authentication check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Nem hitelesített kérés.' USING ERRCODE = '42501';
  END IF;

  -- Strict IDOR prevention: only allow querying own entitlements unless caller is platform admin
  IF v_target_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Jogosulatlan hozzáférés más felhasználó kvótáihoz.' USING ERRCODE = '42501';
  END IF;

  -- 1. Check for active, non-expired, non-revoked VIP / promo code redemption
  SELECT r.id, r.expires_at, p.type, p.target_plan_id
  INTO v_active_redemption
  FROM public.promo_code_redemptions r
  JOIN public.promo_codes p ON p.id = r.promo_code_id
  WHERE r.user_id = v_target_id
    AND r.status = 'active'
    AND r.revoked_at IS NULL
    AND (r.expires_at IS NULL OR r.expires_at > now())
  ORDER BY (p.target_plan_id = 'business') DESC, r.redeemed_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_effective_plan_id := v_active_redemption.target_plan_id;
    IF v_active_redemption.type = 'vip' OR v_active_redemption.target_plan_id = 'business' THEN
      v_is_vip := true;
    END IF;
    v_vip_expires_at := v_active_redemption.expires_at;
  ELSE
    -- 2. Check for active paid or free subscription
    SELECT plan_id, status, current_period_end
    INTO v_sub
    FROM public.user_subscriptions
    WHERE user_id = v_target_id AND status = 'active';

    IF FOUND AND v_sub.plan_id IS NOT NULL THEN
      v_effective_plan_id := v_sub.plan_id;
    ELSE
      v_effective_plan_id := 'free';
    END IF;
  END IF;

  -- 3. Fetch plan definition
  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id = v_effective_plan_id;

  IF NOT FOUND THEN
    SELECT * INTO v_plan
    FROM public.subscription_plans
    WHERE id = 'free';
  END IF;

  RETURN jsonb_build_object(
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'is_vip', v_is_vip,
    'vip_expires_at', v_vip_expires_at,
    'item_limit', v_plan.item_limit,
    'doc_limit', v_plan.doc_limit,
    'storage_limit_bytes', v_plan.storage_limit_bytes,
    'container_limit', v_plan.container_limit,
    'household_invites_limit', v_plan.household_invites_limit,
    'has_vault', v_plan.has_vault,
    'has_insurance_pdf', v_plan.has_insurance_pdf,
    'max_listings', v_plan.max_listings
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 11. RPC: REDEEM PROMO CODE (Server-side atomic transaction)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_code TEXT;
  v_promo RECORD;
  v_expires_at TIMESTAMPTZ := NULL;
  v_redemption_id UUID;
  v_entitlement JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nem hitelesített kérés.' USING ERRCODE = '42501';
  END IF;

  v_clean_code := UPPER(TRIM(p_code));
  IF v_clean_code IS NULL OR length(v_clean_code) < 3 THEN
    RAISE EXCEPTION 'Érvénytelen kódformátum.' USING ERRCODE = 'P0001';
  END IF;

  -- Atomic row lock on promo code
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = v_clean_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A megadott kód nem található.' USING ERRCODE = 'P0001';
  END IF;

  -- Check status
  IF v_promo.status = 'revoked' THEN
    RAISE EXCEPTION 'Ez a kód vissza lett vonva.' USING ERRCODE = 'P0001';
  END IF;

  IF v_promo.status = 'exhausted' OR v_promo.used_count >= v_promo.max_uses THEN
    UPDATE public.promo_codes SET status = 'exhausted', updated_at = now() WHERE id = v_promo.id;
    RAISE EXCEPTION 'A kód elérte a maximális beváltási korlátot.' USING ERRCODE = 'P0001';
  END IF;

  IF v_promo.status = 'expired' OR (v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now()) THEN
    UPDATE public.promo_codes SET status = 'expired', updated_at = now() WHERE id = v_promo.id;
    RAISE EXCEPTION 'A kód beváltási határideje lejárt.' USING ERRCODE = 'P0001';
  END IF;

  -- Check if user already redeemed this code
  IF EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Ezt a kódot már korábban beváltottad ezen a fiókon.' USING ERRCODE = 'P0001';
  END IF;

  -- Calculate entitlement expiry
  IF v_promo.duration_days IS NOT NULL AND v_promo.duration_days > 0 THEN
    v_expires_at := now() + (v_promo.duration_days || ' days')::interval;
  ELSE
    v_expires_at := NULL; -- Perpetual
  END IF;

  -- Insert redemption
  INSERT INTO public.promo_code_redemptions (
    promo_code_id, user_id, redeemed_at, expires_at, status
  ) VALUES (
    v_promo.id, v_user_id, now(), v_expires_at, 'active'
  ) RETURNING id INTO v_redemption_id;

  -- Increment use count and update status if exhausted
  UPDATE public.promo_codes
  SET 
    used_count = used_count + 1,
    status = CASE WHEN used_count + 1 >= max_uses THEN 'exhausted' ELSE status END,
    updated_at = now()
  WHERE id = v_promo.id;

  -- Return effective entitlement
  v_entitlement := public.get_user_effective_entitlement(v_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'code_type', v_promo.type,
    'target_plan_id', v_promo.target_plan_id,
    'expires_at', v_expires_at,
    'is_perpetual', (v_expires_at IS NULL),
    'entitlement', v_entitlement
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 12. ADMIN RPC: GENERATE PROMO OR VIP CODE
CREATE OR REPLACE FUNCTION public.admin_generate_promo_code(
  p_code TEXT,
  p_type TEXT DEFAULT 'vip',
  p_target_plan_id TEXT DEFAULT 'business',
  p_duration_days INTEGER DEFAULT NULL,
  p_valid_until TIMESTAMPTZ DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_campaign_name TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_final_code TEXT;
  v_new_id UUID;
BEGIN
  -- Strict server-side admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Csak rendszeradminisztrátor generálhat kódot.' USING ERRCODE = '42501';
  END IF;

  -- Auto-generate crypto code if not provided
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    v_final_code := 'THINGOR-' || UPPER(p_type) || '-' || UPPER(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  ELSE
    v_final_code := UPPER(TRIM(p_code));
  END IF;

  -- Validate target plan
  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = p_target_plan_id) THEN
    RAISE EXCEPTION 'Érvénytelen célcsomag: %', p_target_plan_id USING ERRCODE = 'P0001';
  END IF;

  -- Validate type
  IF p_type NOT IN ('vip', 'promo') THEN
    RAISE EXCEPTION 'Érvénytelen kódtípus: %', p_type USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.promo_codes (
    code, type, target_plan_id, duration_days, valid_until, max_uses,
    status, campaign_name, admin_notes, created_by
  ) VALUES (
    v_final_code, p_type, p_target_plan_id, p_duration_days, p_valid_until,
    COALESCE(p_max_uses, 1), 'active', p_campaign_name, p_admin_notes, v_admin_id
  ) RETURNING id INTO v_new_id;

  -- Log action (do not store raw secret in metadata)
  INSERT INTO public.promo_code_audit_logs (
    admin_id, promo_code_id, action, metadata
  ) VALUES (
    v_admin_id, v_new_id, 'create_code',
    jsonb_build_object(
      'type', p_type,
      'target_plan_id', p_target_plan_id,
      'duration_days', p_duration_days,
      'max_uses', p_max_uses,
      'campaign_name', p_campaign_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'code', v_final_code,
    'type', p_type,
    'target_plan_id', p_target_plan_id,
    'duration_days', p_duration_days,
    'valid_until', p_valid_until,
    'max_uses', p_max_uses
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 13. ADMIN RPC: REVOKE PROMO CODE (Immediate vs Graceful with 30-day perpetual cap)
CREATE OR REPLACE FUNCTION public.admin_revoke_promo_code(
  p_promo_code_id UUID,
  p_mode TEXT DEFAULT 'immediate',
  p_reason TEXT DEFAULT NULL,
  p_grace_period_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_promo RECORD;
  v_affected_redemptions INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Csak rendszeradminisztrátor vonhat vissza kódot.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE id = p_promo_code_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A kód nem található.' USING ERRCODE = 'P0001';
  END IF;

  IF p_mode NOT IN ('immediate', 'graceful') THEN
    RAISE EXCEPTION 'Érvénytelen visszavonási mód: %. Válassz: immediate vagy graceful.', p_mode USING ERRCODE = 'P0001';
  END IF;

  -- Mark promo code as revoked so no new redemptions can occur
  UPDATE public.promo_codes
  SET status = 'revoked', updated_at = now()
  WHERE id = p_promo_code_id;

  IF p_mode = 'immediate' THEN
    -- A. Immediate: revoke all currently active redemptions immediately
    UPDATE public.promo_code_redemptions
    SET 
      status = 'revoked',
      revoked_at = now()
    WHERE promo_code_id = p_promo_code_id
      AND status = 'active';
    GET DIAGNOSTICS v_affected_redemptions = ROW_COUNT;

    -- Audit log
    INSERT INTO public.promo_code_audit_logs (
      admin_id, promo_code_id, action, metadata
    ) VALUES (
      v_admin_id, p_promo_code_id, 'revoke_code_immediate',
      jsonb_build_object('reason', p_reason, 'affected_users', v_affected_redemptions)
    );
  ELSE
    -- B. Graceful: allow active redemptions to expire naturally at their expires_at.
    -- If redemption was perpetual (expires_at IS NULL), set a hard 30-day grace period to prevent indefinite retention.
    UPDATE public.promo_code_redemptions
    SET expires_at = now() + (COALESCE(p_grace_period_days, 30) || ' days')::interval
    WHERE promo_code_id = p_promo_code_id
      AND status = 'active'
      AND expires_at IS NULL;
    GET DIAGNOSTICS v_affected_redemptions = ROW_COUNT;

    INSERT INTO public.promo_code_audit_logs (
      admin_id, promo_code_id, action, metadata
    ) VALUES (
      v_admin_id, p_promo_code_id, 'revoke_code_graceful',
      jsonb_build_object('reason', p_reason, 'perpetual_capped_users', v_affected_redemptions, 'grace_days', p_grace_period_days)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'mode', p_mode,
    'code_id', p_promo_code_id,
    'status', 'revoked',
    'affected_redemptions', v_affected_redemptions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 14. SERVER STORAGE RESERVATION RPCs
DROP FUNCTION IF EXISTS public.reserve_storage_quota(TEXT, BIGINT, UUID);

CREATE OR REPLACE FUNCTION public.reserve_storage_quota(
  p_file_path TEXT,
  p_declared_bytes BIGINT,
  p_household_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_effective_user_id UUID;
  v_entitlement JSONB;
  v_limit_bytes BIGINT;
  v_user_used_bytes BIGINT;
  v_global_used_bytes BIGINT;
  v_new_id UUID;
BEGIN
  -- Strict IDOR prevention: if authenticated user is calling, force user_id to auth.uid()
  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND p_user_id != auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Nem foglalhatsz tárhelykvótát más felhasználó nevében.' USING ERRCODE = '42501';
    END IF;
    v_effective_user_id := auth.uid();
  ELSE
    -- Called by service_role (Edge Function)
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'A felhasználóazonosító (p_user_id) megadása kötelező hitelesítetlen/service_role hívás esetén.' USING ERRCODE = 'P0001';
    END IF;
    v_effective_user_id := p_user_id;
  END IF;

  IF p_declared_bytes IS NULL OR p_declared_bytes <= 0 THEN
    RAISE EXCEPTION 'Érvénytelen fájlméret.' USING ERRCODE = 'P0001';
  END IF;

  -- Advisory lock for concurrency protection on this specific user
  PERFORM pg_advisory_xact_lock(hashtext('storage_quota_' || v_effective_user_id::text));

  -- Get effective entitlement
  v_entitlement := public.get_user_effective_entitlement(v_effective_user_id);
  v_limit_bytes := (v_entitlement->>'storage_limit_bytes')::BIGINT;

  -- 1. Check user storage usage (committed + active pending reservations)
  SELECT COALESCE(sum(
    CASE 
      WHEN status = 'committed' THEN COALESCE(actual_bytes, reserved_bytes)
      WHEN status = 'pending' AND expires_at > now() THEN reserved_bytes
      ELSE 0
    END
  ), 0)
  INTO v_user_used_bytes
  FROM public.storage_reservations
  WHERE user_id = v_effective_user_id;

  IF v_user_used_bytes + p_declared_bytes > v_limit_bytes THEN
    RAISE EXCEPTION 'Tárhelykvóta túllépés: a csomagod kerete (%s MB) nem elegendő.', (v_limit_bytes / 1000000) USING ERRCODE = 'P0001';
  END IF;

  -- 2. Check global capacity limit (10 GB) - VIP users are also bounded by global infrastructure
  SELECT COALESCE(sum(
    CASE 
      WHEN status = 'committed' THEN COALESCE(actual_bytes, reserved_bytes)
      WHEN status = 'pending' AND expires_at > now() THEN reserved_bytes
      ELSE 0
    END
  ), 0)
  INTO v_global_used_bytes
  FROM public.storage_reservations;

  IF v_global_used_bytes + p_declared_bytes > 10000000000 THEN
    RAISE EXCEPTION 'Rendszerszintű kapacitáskorlát: a tárhely jelenleg megtelt, kérjük próbáld később.' USING ERRCODE = 'P0001';
  END IF;

  -- Create pending reservation
  INSERT INTO public.storage_reservations (
    user_id, household_id, file_path, reserved_bytes, status, expires_at
  ) VALUES (
    v_effective_user_id, p_household_id, p_file_path, p_declared_bytes, 'pending', now() + interval '15 minutes'
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_new_id,
    'file_path', p_file_path,
    'reserved_bytes', p_declared_bytes,
    'expires_at', now() + interval '15 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Commit reservation after server verifies physical R2 HeadObject
DROP FUNCTION IF EXISTS public.commit_storage_reservation(UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.commit_storage_reservation(
  p_reservation_id UUID,
  p_actual_bytes BIGINT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM public.storage_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A tárhelyfoglalás nem található: %', p_reservation_id USING ERRCODE = 'P0001';
  END IF;

  -- Verify caller ownership: if authenticated caller, must be owner or admin
  IF v_caller_id IS NOT NULL THEN
    IF v_res.user_id != v_caller_id AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Nincs jogosultságod más felhasználó foglalásának véglegesítésére.' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Called by service_role (Edge Function)
    IF p_user_id IS NOT NULL AND v_res.user_id != p_user_id THEN
      RAISE EXCEPTION 'A megadott felhasználó nem tulajdonosa ennek a foglalásnak.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_res.status = 'committed' THEN
    RETURN jsonb_build_object('success', true, 'already_committed', true);
  END IF;

  UPDATE public.storage_reservations
  SET 
    status = 'committed',
    actual_bytes = p_actual_bytes,
    reserved_bytes = p_actual_bytes,
    expires_at = now() + interval '100 years' -- keep committed row active permanently
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'status', 'committed',
    'actual_bytes', p_actual_bytes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Release reservation if upload fails or is cancelled
DROP FUNCTION IF EXISTS public.release_storage_reservation(UUID);

CREATE OR REPLACE FUNCTION public.release_storage_reservation(
  p_reservation_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_res RECORD;
BEGIN
  SELECT * INTO v_res
  FROM public.storage_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Foglalás nem található');
  END IF;

  -- Verify caller ownership: if authenticated caller, must be owner or admin
  IF v_caller_id IS NOT NULL THEN
    IF v_res.user_id != v_caller_id AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Nincs jogosultságod más felhasználó foglalásának felszabadítására.' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Called by service_role (Edge Function)
    IF p_user_id IS NOT NULL AND v_res.user_id != p_user_id THEN
      RAISE EXCEPTION 'A megadott felhasználó nem tulajdonosa ennek a foglalásnak.' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.storage_reservations
  SET status = 'released', expires_at = now()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true, 'status', 'released', 'reservation_id', p_reservation_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Release storage quota by file path upon deletion
CREATE OR REPLACE FUNCTION public.release_storage_by_path(
  p_file_path TEXT,
  p_owner_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_user_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Determine target user with strict ownership checks
  IF v_caller_id IS NOT NULL THEN
    IF p_owner_id IS NOT NULL AND p_owner_id != v_caller_id THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Nincs jogosultságod más felhasználó kvótájának felszabadítására.' USING ERRCODE = '42501';
      END IF;
      v_target_user_id := p_owner_id;
    ELSE
      v_target_user_id := v_caller_id;
    END IF;
  ELSE
    -- Called by service_role
    IF p_owner_id IS NULL THEN
      RAISE EXCEPTION 'A felhasználóazonosító (p_owner_id) megadása kötelező hitelesítetlen/service_role hívás esetén.' USING ERRCODE = 'P0001';
    END IF;
    v_target_user_id := p_owner_id;
  END IF;

  UPDATE public.storage_reservations
  SET status = 'released', expires_at = now()
  WHERE file_path = p_file_path
    AND user_id = v_target_user_id
    AND status IN ('pending', 'committed');
    
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'file_path', p_file_path,
    'user_id', v_target_user_id,
    'released_count', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Cleanup expired pending reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_storage_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.storage_reservations
  SET status = 'released'
  WHERE status = 'pending' AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 15. SERVER-SIDE RESOURCE QUOTA TRIGGERS

-- A. Items Quota Trigger
CREATE OR REPLACE FUNCTION public.check_items_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_entitlement JSONB;
  v_item_limit INTEGER;
  v_current_count INTEGER;
  v_household_owner_id UUID;
BEGIN
  -- Concurrency advisory lock per user
  PERFORM pg_advisory_xact_lock(hashtext('quota_items_' || NEW.user_id::text));

  -- 1. Private item check
  IF NEW.ownership_scope = 'private' OR NEW.household_id IS NULL THEN
    v_entitlement := public.get_user_effective_entitlement(NEW.user_id);
    v_item_limit := (v_entitlement->>'item_limit')::INTEGER;

    IF v_item_limit != -1 THEN
      SELECT count(*) INTO v_current_count
      FROM public.items
      WHERE user_id = NEW.user_id AND (ownership_scope = 'private' OR household_id IS NULL);

      -- If UPDATE and item was already private, do not block
      IF TG_OP = 'UPDATE' AND (OLD.ownership_scope = 'private' OR OLD.household_id IS NULL) THEN
        RETURN NEW;
      END IF;

      IF v_current_count >= v_item_limit THEN
        RAISE EXCEPTION 'Tárgykvóta túllépés: a csomagod (%s) legfeljebb %s tárgy rögzítését engedélyezi.',
          v_entitlement->>'plan_name', v_item_limit USING ERRCODE = 'P0001';
      END IF;
    END IF;
  ELSE
    -- 2. Household item check (Family/Business shared pool)
    SELECT owner_id INTO v_household_owner_id
    FROM public.households
    WHERE id = NEW.household_id;

    IF v_household_owner_id IS NOT NULL THEN
      v_entitlement := public.get_user_effective_entitlement(v_household_owner_id);
      v_item_limit := (v_entitlement->>'item_limit')::INTEGER;

      IF v_item_limit != -1 THEN
        SELECT count(*) INTO v_current_count
        FROM public.items
        WHERE household_id = NEW.household_id;

        IF TG_OP = 'UPDATE' AND OLD.household_id = NEW.household_id THEN
          RETURN NEW;
        END IF;

        IF v_current_count >= v_item_limit THEN
          RAISE EXCEPTION 'Háztartási tárgykvóta túllépés: a háztartás elérte a megengedett tárgykeretet (%s tárgy).',
            v_item_limit USING ERRCODE = 'P0001';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_items_quota ON public.items;
CREATE TRIGGER trg_enforce_items_quota
  BEFORE INSERT OR UPDATE OF ownership_scope, household_id ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_items_quota();

-- B. Documents & Vault Quota Trigger
CREATE OR REPLACE FUNCTION public.check_item_documents_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_entitlement JSONB;
  v_doc_limit INTEGER;
  v_has_vault BOOLEAN;
  v_current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('quota_docs_' || NEW.user_id::text));

  v_entitlement := public.get_user_effective_entitlement(NEW.user_id);
  v_doc_limit := (v_entitlement->>'doc_limit')::INTEGER;
  v_has_vault := (v_entitlement->>'has_vault')::BOOLEAN;

  -- Vault protection check
  IF NEW.is_vault_protected AND NOT v_has_vault THEN
    RAISE EXCEPTION 'A Széf (Vault) dokumentumvédelem ebben a csomagban (%s) nem érhető el.',
      v_entitlement->>'plan_name' USING ERRCODE = 'P0001';
  END IF;

  -- Document count check
  IF v_doc_limit != -1 THEN
    SELECT count(*) INTO v_current_count
    FROM public.item_documents
    WHERE user_id = NEW.user_id;

    IF v_current_count >= v_doc_limit THEN
      RAISE EXCEPTION 'Dokumentumkvóta túllépés: a csomagod legfeljebb %s dokumentum tárolását engedélyezi.',
        v_doc_limit USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_item_documents_quota ON public.item_documents;
CREATE TRIGGER trg_enforce_item_documents_quota
  BEFORE INSERT ON public.item_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.check_item_documents_quota();

-- C. Storage Containers Quota Trigger
CREATE OR REPLACE FUNCTION public.check_storage_containers_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_entitlement JSONB;
  v_container_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('quota_containers_' || NEW.user_id::text));

  v_entitlement := public.get_user_effective_entitlement(NEW.user_id);
  v_container_limit := (v_entitlement->>'container_limit')::INTEGER;

  IF v_container_limit != -1 THEN
    SELECT count(*) INTO v_current_count
    FROM public.storage_containers
    WHERE user_id = NEW.user_id;

    IF v_current_count >= v_container_limit THEN
      RAISE EXCEPTION 'Tárolókonténer-kvóta túllépés: a csomagod legfeljebb %s tárolóegység létrehozását engedélyezi.',
        v_container_limit USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_storage_containers_quota ON public.storage_containers;
CREATE TRIGGER trg_enforce_storage_containers_quota
  BEFORE INSERT ON public.storage_containers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_storage_containers_quota();

-- D. Household Invites Quota Trigger
CREATE OR REPLACE FUNCTION public.check_household_invites_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_household_owner_id UUID;
  v_entitlement JSONB;
  v_invite_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Lookup household owner
  SELECT owner_id INTO v_household_owner_id
  FROM public.households
  WHERE id = NEW.household_id;

  IF v_household_owner_id IS NULL THEN
    RAISE EXCEPTION 'A megadott háztartás nem található.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('quota_invites_' || v_household_owner_id::text));

  v_entitlement := public.get_user_effective_entitlement(v_household_owner_id);
  v_invite_limit := (v_entitlement->>'household_invites_limit')::INTEGER;

  IF v_invite_limit = 0 THEN
    RAISE EXCEPTION 'A jelenlegi csomagban (Free/Plus) a háztartási megosztás és meghívás nem engedélyezett. Válts Family vagy Business csomagra.' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite_limit != -1 THEN
    -- Count current members (excluding owner) + pending non-expired invites
    SELECT 
      (SELECT count(*) FROM public.household_members WHERE household_id = NEW.household_id AND user_id != v_household_owner_id) +
      (SELECT count(*) FROM public.household_invites WHERE household_id = NEW.household_id AND status = 'pending' AND (expires_at IS NULL OR expires_at > now()))
    INTO v_current_count;

    IF v_current_count >= v_invite_limit THEN
      RAISE EXCEPTION 'Elérted a háztartási tagok és meghívások maximális keretét (összesen %s fő).',
        (v_invite_limit + 1) USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_household_invites_quota ON public.household_invites;
CREATE TRIGGER trg_enforce_household_invites_quota
  BEFORE INSERT ON public.household_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.check_household_invites_quota();

-- 16. EXPLICIT EXECUTE PRIVILEGES (Defense-in-Depth)
REVOKE ALL ON FUNCTION public.get_user_effective_entitlement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_effective_entitlement(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.redeem_promo_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_generate_promo_code(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_generate_promo_code(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_revoke_promo_code(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_promo_code(UUID, TEXT, TEXT, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.reserve_storage_quota(TEXT, BIGINT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_storage_quota(TEXT, BIGINT, UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.commit_storage_reservation(UUID, BIGINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_storage_reservation(UUID, BIGINT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.release_storage_reservation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_storage_reservation(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.release_storage_by_path(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_storage_by_path(TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_storage_reservations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_storage_reservations() TO authenticated, service_role;
