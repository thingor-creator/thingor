-- Migration: 20261018_household_ten_modules_sharing.sql
-- Description: Sets default allowed_modules to include all 10 modules and extends RLS policies for household sharing

-- 1. Update household_members table column default for allowed_modules
ALTER TABLE IF EXISTS "public"."household_members" 
  ALTER COLUMN "allowed_modules" SET DEFAULT '{
    "inventory": true,
    "storage": true,
    "documents": true,
    "repairs": true,
    "financing": true,
    "lending": true,
    "collections": true,
    "pantry": true,
    "vault": true,
    "notes": true
  }'::jsonb;

-- 2. Populate any missing module keys for existing members who have full access or null allowed_modules
ALTER TABLE "public"."household_members" DISABLE TRIGGER trg_prevent_household_role_escalation;

UPDATE "public"."household_members"
SET "allowed_modules" = COALESCE("allowed_modules", '{}'::jsonb) || '{
  "inventory": true,
  "storage": true,
  "documents": true,
  "repairs": true,
  "financing": true,
  "lending": true,
  "collections": true,
  "pantry": true,
  "vault": true,
  "notes": true
}'::jsonb
WHERE "sharing_mode" = 'all' OR "sharing_mode" IS NULL OR "allowed_modules" IS NULL;

ALTER TABLE "public"."household_members" ENABLE TRIGGER trg_prevent_household_role_escalation;

-- 3. Extend RLS policies for item_repairs to allow household sharing when 'repairs' module is permitted
DROP POLICY IF EXISTS "item_repairs_household_select_policy" ON "public"."item_repairs";
CREATE POLICY "item_repairs_household_select_policy" ON "public"."item_repairs"
FOR SELECT TO "authenticated"
USING (
  (auth.uid() = user_id)
  OR (EXISTS (
    SELECT 1 FROM "public"."items" i
    JOIN "public"."household_members" hm ON hm.household_id = i.household_id
    WHERE i.id = item_repairs.item_id
      AND hm.user_id = auth.uid()
      AND (COALESCE(hm.sharing_mode, 'all') = 'all' OR (hm.allowed_modules->>'repairs')::boolean IS NOT FALSE)
  ))
);

-- 4. Extend RLS policies for item_financings to allow household sharing when 'financing' module is permitted
DROP POLICY IF EXISTS "item_financings_household_select_policy" ON "public"."item_financings";
CREATE POLICY "item_financings_household_select_policy" ON "public"."item_financings"
FOR SELECT TO "authenticated"
USING (
  (auth.uid() = user_id)
  OR (EXISTS (
    SELECT 1 FROM "public"."items" i
    JOIN "public"."household_members" hm ON hm.household_id = i.household_id
    WHERE i.id = item_financings.item_id
      AND hm.user_id = auth.uid()
      AND (COALESCE(hm.sharing_mode, 'all') = 'all' OR (hm.allowed_modules->>'financing')::boolean IS NOT FALSE)
  ))
);

-- 5. Extend RLS policy for item_loans to enforce 'lending' module permissions
DROP POLICY IF EXISTS "item_loans_select_policy" ON "public"."item_loans";
CREATE POLICY "item_loans_select_policy" ON "public"."item_loans"
FOR SELECT TO "public"
USING (
  (auth.uid() = user_id)
  OR is_admin()
  OR (EXISTS (
    SELECT 1 FROM "public"."items" i
    JOIN "public"."household_members" hm ON hm.household_id = i.household_id
    WHERE i.id = item_loans.item_id
      AND hm.user_id = auth.uid()
      AND (COALESCE(hm.sharing_mode, 'all') = 'all' OR (hm.allowed_modules->>'lending')::boolean IS NOT FALSE)
  ))
);
