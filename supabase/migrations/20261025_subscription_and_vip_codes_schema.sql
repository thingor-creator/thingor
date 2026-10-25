-- THINGOR SUBSCRIPTION PLANS, USER SUBSCRIPTIONS & VIP/PROMO CODES SYSTEM
-- Migration: 20261025_subscription_and_vip_codes_schema.sql
-- Description: Creates subscription plans, user subscriptions, promo/VIP codes,
-- redemptions, audit logs, atomic storage reservations, entitlement calculation,
-- secure redemption RPCs, and admin code management with 2-mode revocation.

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

-- 6. STORAGE RESERVATIONS TABLE (Atomic concurrency & quota guard)
CREATE TABLE IF NOT EXISTS public.storage_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  reserved_bytes BIGINT NOT NULL CHECK (reserved_bytes > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed', 'released')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_reservations_user ON public.storage_reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_storage_reservations_expires ON public.storage_reservations(expires_at) WHERE status = 'pending';

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

-- Storage Reservations: Users can view and manage own reservations
DROP POLICY IF EXISTS "Users can view own storage reservations" ON public.storage_reservations;
CREATE POLICY "Users can view own storage reservations"
  ON public.storage_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own storage reservations" ON public.storage_reservations;
CREATE POLICY "Users can insert own storage reservations"
  ON public.storage_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own storage reservations" ON public.storage_reservations;
CREATE POLICY "Users can update own storage reservations"
  ON public.storage_reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- 10. HELPER FUNCTION: GET USER EFFECTIVE ENTITLEMENT
CREATE OR REPLACE FUNCTION public.get_user_effective_entitlement(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_active_redemption RECORD;
  v_sub RECORD;
  v_plan RECORD;
  v_effective_plan_id TEXT := 'free';
  v_is_vip BOOLEAN := false;
  v_vip_expires_at TIMESTAMPTZ := NULL;
BEGIN
  -- 1. Check for active, non-expired, non-revoked VIP / promo code redemption
  SELECT r.id, r.expires_at, p.type, p.target_plan_id
  INTO v_active_redemption
  FROM public.promo_code_redemptions r
  JOIN public.promo_codes p ON p.id = r.promo_code_id
  WHERE r.user_id = p_user_id
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
    WHERE user_id = p_user_id AND status = 'active';

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

-- 13. ADMIN RPC: REVOKE PROMO CODE (Immediate vs Graceful)
CREATE OR REPLACE FUNCTION public.admin_revoke_promo_code(
  p_promo_code_id UUID,
  p_mode TEXT DEFAULT 'immediate', -- 'immediate' OR 'graceful'
  p_reason TEXT DEFAULT NULL
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
    -- B. Graceful: allow active redemptions to expire naturally at their expires_at
    INSERT INTO public.promo_code_audit_logs (
      admin_id, promo_code_id, action, metadata
    ) VALUES (
      v_admin_id, p_promo_code_id, 'revoke_code_graceful',
      jsonb_build_object('reason', p_reason)
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
