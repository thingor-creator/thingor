-- ==============================================================================
-- THINGOR DATABASE MIGRATION: 20261025170000_storage_quota_and_entitlement_hardening
-- ==============================================================================
-- Purpose:
--   1. Hardens storage RPCs: strictly restricts EXECUTE privileges to service_role,
--      preventing clients from bypassing R2 size verification or tampering with quotas.
--   2. Enforces input size validation (0 <= p_actual_bytes <= 50MB) and post-commit
--      quota enforcement in commit_storage_reservation.
--   3. Restricts status transitions: only 'pending' reservations can be committed
--      or released; prevents resurrecting expired/released reservations.
--   4. Fixes get_user_effective_entitlement to support service_role execution and
--      allows legitimate household members to record items against the household
--      owner's pool without authorization failure (IDOR protection preserved).
-- ==============================================================================

-- 1. GET_USER_EFFECTIVE_ENTITLEMENT (HARDENED FOR SERVICE_ROLE & HOUSEHOLD MEMBERS)
CREATE OR REPLACE FUNCTION public.get_user_effective_entitlement(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_id UUID := COALESCE(p_user_id, auth.uid());
  v_is_service_role BOOLEAN;
  v_is_household_member BOOLEAN := false;
  v_active_redemption RECORD;
  v_sub RECORD;
  v_plan RECORD;
  v_effective_plan_id TEXT := 'free';
  v_is_vip BOOLEAN := false;
  v_vip_expires_at TIMESTAMPTZ := NULL;
BEGIN
  -- 1. Identify trusted service_role execution from Edge Functions / background workers
  v_is_service_role := (
    coalesce(auth.role(), '') = 'service_role' OR 
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
  );

  -- 2. Verify authentication for non-service_role calls
  IF NOT v_is_service_role AND v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Nem hitelesített kérés.' USING ERRCODE = '42501';
  END IF;

  -- 3. Target resolution: target_id is required
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'A felhasználóazonosító (p_user_id) megadása kötelező.' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Check household membership if querying someone else's entitlement
  IF NOT v_is_service_role AND v_target_id != v_caller_id AND NOT public.is_admin() THEN
    SELECT EXISTS (
      SELECT 1 
      FROM public.household_members hm
      JOIN public.households h ON h.id = hm.household_id
      WHERE hm.user_id = v_caller_id AND h.owner_id = v_target_id
    ) INTO v_is_household_member;

    IF NOT v_is_household_member THEN
      RAISE EXCEPTION 'Jogosulatlan hozzáférés más felhasználó kvótáihoz.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 5. Check active VIP / promo redemption
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
    -- 6. Check active subscription
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

  -- 7. Fetch plan limits
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


-- 2. COMMIT_STORAGE_RESERVATION (HARDENED SIZE VALIDATION & STATUS INTEGRITY)
CREATE OR REPLACE FUNCTION public.commit_storage_reservation(
  p_reservation_id UUID,
  p_actual_bytes BIGINT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_target_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_res RECORD;
  v_entitlement JSONB;
  v_limit_bytes BIGINT;
  v_total_after_commit BIGINT;
BEGIN
  -- Strict caller and ownership validation
  IF v_target_user_id IS NULL THEN
    RAISE EXCEPTION 'A felhasználóazonosító (p_user_id) megadása kötelező.' USING ERRCODE = 'P0001';
  END IF;

  -- Byte size sanity check (0 bytes up to 50 MB)
  IF p_actual_bytes IS NULL OR p_actual_bytes < 0 OR p_actual_bytes > 52428800 THEN
    RAISE EXCEPTION 'Érvénytelen fájlméret (0 és 50 MB közötti érték engedélyezett): %', p_actual_bytes USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_res
  FROM public.storage_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A tárhelyfoglalás nem található: %', p_reservation_id USING ERRCODE = 'P0001';
  END IF;

  -- Verify user ownership
  IF v_res.user_id != v_target_user_id THEN
    RAISE EXCEPTION 'A megadott felhasználó nem tulajdonosa ennek a foglalásnak.' USING ERRCODE = '42501';
  END IF;

  -- Verify authenticated caller if executed within user session
  IF v_caller_id IS NOT NULL AND v_caller_id != v_target_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nincs jogosultságod más felhasználó foglalásának véglegesítésére.' USING ERRCODE = '42501';
  END IF;

  -- Idempotency check: if already committed, return early
  IF v_res.status = 'committed' THEN
    RETURN jsonb_build_object('success', true, 'already_committed', true);
  END IF;

  -- Only pending reservations can be committed! Prevent resurrecting released/expired records
  IF v_res.status != 'pending' THEN
    RAISE EXCEPTION 'A tárhelyfoglalás már nem véglegesíthető, mert állapota: %', v_res.status USING ERRCODE = 'P0001';
  END IF;

  -- Post-upload quota check: verify that actual bytes do not violate quota
  v_entitlement := public.get_user_effective_entitlement(v_target_user_id);
  v_limit_bytes := (v_entitlement->>'storage_limit_bytes')::BIGINT;

  SELECT COALESCE(sum(
    CASE 
      WHEN id = p_reservation_id THEN p_actual_bytes
      WHEN status = 'committed' THEN COALESCE(actual_bytes, reserved_bytes)
      WHEN status = 'pending' AND expires_at > now() THEN reserved_bytes
      ELSE 0
    END
  ), 0)
  INTO v_total_after_commit
  FROM public.storage_reservations
  WHERE user_id = v_target_user_id;

  IF v_total_after_commit > v_limit_bytes THEN
    RAISE EXCEPTION 'A véglegesített fájlméret (% bájt) túllépi a megengedett tárhelykeretet (% MB).',
      p_actual_bytes, (v_limit_bytes / 1000000) USING ERRCODE = 'P0001';
  END IF;

  -- Update reservation record to committed status
  UPDATE public.storage_reservations
  SET 
    status = 'committed',
    actual_bytes = p_actual_bytes,
    reserved_bytes = p_actual_bytes,
    expires_at = now() + interval '100 years'
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'status', 'committed',
    'actual_bytes', p_actual_bytes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 3. RELEASE_STORAGE_RESERVATION (RESTRICTED TO PENDING ONLY)
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

  IF p_user_id IS NOT NULL AND v_res.user_id != p_user_id THEN
    RAISE EXCEPTION 'A megadott felhasználó nem tulajdonosa ennek a foglalásnak.' USING ERRCODE = '42501';
  END IF;

  IF v_caller_id IS NOT NULL AND v_caller_id != v_res.user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nincs jogosultságod más felhasználó foglalásának felszabadítására.' USING ERRCODE = '42501';
  END IF;

  -- Strictly ignore or reject committed records to prevent quota reset of active files
  IF v_res.status != 'pending' THEN
    RETURN jsonb_build_object('success', true, 'message', 'A foglalás nem függőben lévő állapotú, nincs teendő.');
  END IF;

  UPDATE public.storage_reservations
  SET status = 'released', expires_at = now()
  WHERE id = p_reservation_id AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'status', 'released', 'reservation_id', p_reservation_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 4. RELEASE_STORAGE_BY_PATH (STRICT SERVICE_ROLE ACCESS)
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


-- 5. RESERVE_STORAGE_QUOTA (ENSURE DEFENSE-IN-DEPTH)
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
  IF auth.uid() IS NOT NULL THEN
    IF p_user_id IS NOT NULL AND p_user_id != auth.uid() AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Nem foglalhatsz tárhelykvótát más felhasználó nevében.' USING ERRCODE = '42501';
    END IF;
    v_effective_user_id := auth.uid();
  ELSE
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'A felhasználóazonosító (p_user_id) megadása kötelező hitelesítetlen/service_role hívás esetén.' USING ERRCODE = 'P0001';
    END IF;
    v_effective_user_id := p_user_id;
  END IF;

  IF p_declared_bytes IS NULL OR p_declared_bytes <= 0 OR p_declared_bytes > 52428800 THEN
    RAISE EXCEPTION 'Érvénytelen fájlméret (1 bájt és 50 MB közötti érték engedélyezett).' USING ERRCODE = 'P0001';
  END IF;

  -- Advisory lock for concurrency protection on this specific user
  PERFORM pg_advisory_xact_lock(hashtext('storage_quota_' || v_effective_user_id::text));

  -- Get effective entitlement
  v_entitlement := public.get_user_effective_entitlement(v_effective_user_id);
  v_limit_bytes := (v_entitlement->>'storage_limit_bytes')::BIGINT;

  -- Check user storage usage (committed + active pending reservations)
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

  -- Check global capacity limit (10 GB)
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


-- 6. STRICT EXECUTE PRIVILEGES CONFIGURATION
-- Storage internal RPCs: accessible STRICTLY by service_role (Edge Functions)
REVOKE ALL ON FUNCTION public.reserve_storage_quota(TEXT, BIGINT, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_storage_quota(TEXT, BIGINT, UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.commit_storage_reservation(UUID, BIGINT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_storage_reservation(UUID, BIGINT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.release_storage_reservation(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_storage_reservation(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.release_storage_by_path(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_storage_by_path(TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_storage_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_storage_reservations() TO service_role;

-- User profile and coupon RPCs: accessible by authenticated and service_role
REVOKE ALL ON FUNCTION public.get_user_effective_entitlement(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_effective_entitlement(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_promo_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(TEXT) TO authenticated, service_role;

-- Promo code admin functions: strictly revoke PUBLIC and anon
REVOKE ALL ON FUNCTION public.admin_generate_promo_code(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_promo_code(TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, INTEGER, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_revoke_promo_code(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_promo_code(UUID, TEXT, TEXT, INTEGER) TO authenticated, service_role;
