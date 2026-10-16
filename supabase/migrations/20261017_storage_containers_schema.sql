-- ============================================================================
-- Migration: 20261017_storage_containers_schema.sql
-- Description: Thingor Fizikai Tárolórendszer és Készletkezelés Integrációja
-- Alapdokumentum: STORAGE_SYSTEM_PLAN.md v1.4.6
--
-- Főbb komponensek:
--   1. public.storage_containers tábla (fizikai hierarchia, dobozok, polcok)
--   2. public.items.container_id oszlop és hatóköri illesztés
--   3. public.container_items tábla (egyszerű darabszámos készlettételek)
--   4. Tranzakciós integritási és ciklusvédelmi triggerek (tanácsadói zárolás, kaszkádolás)
--   5. adjust_container_item_quantity biztonsági RPC (sorzárolás, search_path védelem)
--   6. Granuláris RLS szabályok (modul-, helyszín- és szerepkör-ellenőrzéssel)
--
-- Rollback szkript (Down Migration):
--   Lásd a fájl végén és a STORAGE_SYSTEM_PLAN.md 8.10. fejezetében.
-- ============================================================================

-- ============================================================================
-- 1. FÁZIS: TÁBLÁK, OSZLOPOK ÉS INDEXEK LÉTREHOZÁSA
-- ============================================================================

-- 1.1. storage_containers tábla
CREATE TABLE IF NOT EXISTS public.storage_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ownership_scope TEXT NOT NULL DEFAULT 'private' CHECK (ownership_scope IN ('private', 'household')),
  household_id UUID REFERENCES public.households(id) ON DELETE RESTRICT,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  parent_container_id UUID REFERENCES public.storage_containers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  container_type TEXT NOT NULL DEFAULT 'box' CHECK (
    container_type IN ('box', 'shelf', 'cabinet', 'drawer', 'crate', 'bag', 'bin', 'case', 'other')
  ),
  qr_code TEXT UNIQUE,
  photo_url TEXT,
  color TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_container_household_scope CHECK (
    (ownership_scope = 'private') OR 
    (ownership_scope = 'household' AND household_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_storage_containers_user_id ON public.storage_containers(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_containers_household_id ON public.storage_containers(household_id);
CREATE INDEX IF NOT EXISTS idx_storage_containers_location_id ON public.storage_containers(location_id);
CREATE INDEX IF NOT EXISTS idx_storage_containers_parent_id ON public.storage_containers(parent_container_id);

-- 1.2. items.container_id oszlop hozzáadása a vagyontárgyakhoz
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES public.storage_containers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_items_container_id ON public.items(container_id) WHERE container_id IS NOT NULL;

-- 1.3. container_items tábla (egyszerű készlettételek)
CREATE TABLE IF NOT EXISTS public.container_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID NOT NULL REFERENCES public.storage_containers(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ownership_scope TEXT NOT NULL DEFAULT 'private' CHECK (ownership_scope IN ('private', 'household')),
  household_id UUID REFERENCES public.households(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'db' CHECK (unit IN ('db', 'pár', 'készlet', 'csomag', 'm', 'kg', 'l', 'doboz')),
  min_quantity NUMERIC CHECK (min_quantity IS NULL OR min_quantity >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_container_item_household_scope CHECK (
    (ownership_scope = 'private') OR 
    (ownership_scope = 'household' AND household_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_container_items_container_id ON public.container_items(container_id);
CREATE INDEX IF NOT EXISTS idx_container_items_household_id ON public.container_items(household_id);


-- ============================================================================
-- 2. FÁZIS: TRIGGER FÜGGVÉNYEK ÉS RPC DEFINÍCIÓK
-- ============================================================================

-- 2.1. Tárolótörlést korlátozó trigger (Kizárólag üres tároló törölhető)
CREATE OR REPLACE FUNCTION public.prevent_storage_container_delete()
RETURNS trigger AS $$
BEGIN
  -- 1. Hozzárendelt vagyontárgyak ellenőrzése:
  IF EXISTS (SELECT 1 FROM public.items WHERE container_id = OLD.id) THEN
    RAISE EXCEPTION 'A tároló nem törölhető, mert még vagyontárgyak vannak hozzárendelve! Előbb helyezd át vagy vedd ki a tárgyakat.';
  END IF;

  -- 2. Egyszerű készlettételek ellenőrzése:
  IF EXISTS (SELECT 1 FROM public.container_items WHERE container_id = OLD.id) THEN
    RAISE EXCEPTION 'A tároló nem törölhető, mert egyszerű készlettételeket tartalmaz! Előbb ürítsd ki a tárolót.';
  END IF;

  -- 3. Altárolók ellenőrzése:
  IF EXISTS (SELECT 1 FROM public.storage_containers WHERE parent_container_id = OLD.id) THEN
    RAISE EXCEPTION 'A tároló nem törölhető, mert altárolók találhatók benne! Előbb helyezd át az altárolókat.';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 2.2. Hierarchia, Helyszín-, Hatókör- és Ciklusvédelmi trigger
CREATE OR REPLACE FUNCTION public.check_storage_container_integrity()
RETURNS trigger AS $$
DECLARE
  v_current_id UUID;
  v_depth INT := 0;
  v_max_depth CONSTANT INT := 50;
  v_parent RECORD;
  v_lock_key BIGINT;
BEGIN
  -- Létrehozó felhasználó megőrzése módosításkor:
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
  END IF;

  -- Belső QR-kód formátum beállítása:
  IF NEW.qr_code IS NULL OR trim(NEW.qr_code) = '' THEN
    NEW.qr_code := 'thg:c:' || COALESCE(NEW.id, gen_random_uuid())::text;
  END IF;

  -- 1. DEF-03: Hatókör- és háztartásváltás szigorú szerveroldali védelme:
  IF TG_OP = 'UPDATE' AND (
    NEW.ownership_scope IS DISTINCT FROM OLD.ownership_scope OR 
    NEW.household_id IS DISTINCT FROM OLD.household_id
  ) THEN
    -- Csak teljesen üres tároló esetén engedélyezett a hatókör- vagy háztartásváltás:
    IF EXISTS (SELECT 1 FROM public.items WHERE container_id = OLD.id) THEN
      RAISE EXCEPTION 'A tároló hatóköre vagy háztartása nem módosítható, mert vagyontárgyak vannak hozzárendelve! Előbb helyezd át vagy vedd ki a tárgyakat.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.container_items WHERE container_id = OLD.id) THEN
      RAISE EXCEPTION 'A tároló hatóköre vagy háztartása nem módosítható, mert egyszerű készlettételeket tartalmaz! Előbb ürítsd ki a tárolót.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.storage_containers WHERE parent_container_id = OLD.id) THEN
      RAISE EXCEPTION 'A tároló hatóköre vagy háztartása nem módosítható, mert altárolók találhatók benne! Előbb helyezd át az altárolókat.';
    END IF;

    -- Jogosultság ellenőrzése szerveroldalon:
    IF OLD.ownership_scope = 'household' THEN
      IF NOT is_household_admin(OLD.household_id) THEN
        RAISE EXCEPTION 'Csak a háztartás adminisztrátora vagy tulajdonosa módosíthatja a családi tároló hatókörét vagy háztartását!';
      END IF;
    ELSE
      -- Privát tároló esetén csak a tulajdonos kezdeményezheti:
      IF OLD.user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Csak a privát tároló tulajdonosa módosíthatja a tároló megosztását!';
      END IF;
    END IF;

    -- Ha célként családi háztartás van megadva, a cél-háztartásban is adminisztrátori jog szükséges:
    IF NEW.ownership_scope = 'household' AND NEW.household_id IS NOT NULL THEN
      IF NOT is_household_admin(NEW.household_id) THEN
        RAISE EXCEPTION 'A cél-háztartásban adminisztrátori jogosultság szükséges a tároló fogadásához!';
      END IF;
    END IF;
  END IF;

  -- 2. Tranzakciószintű tanácsadói zárolás a fa párhuzamos átrendezése ellen:
  IF NEW.parent_container_id IS NOT NULL OR (TG_OP = 'UPDATE' AND OLD.parent_container_id IS NOT NULL) THEN
    v_lock_key := ('x' || substr(md5('storage_tree_' || COALESCE(NEW.household_id::text, NEW.user_id::text)), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);
  END IF;

  -- 3. Gyökér tároló kezelése (nincs szülő):
  IF NEW.parent_container_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 4. Közvetlen ön-hivatkozás tiltása:
  IF NEW.id IS NOT NULL AND NEW.id = NEW.parent_container_id THEN
    RAISE EXCEPTION 'Egy tároló nem lehet önmaga szülője!';
  END IF;

  -- 5. Szülőtároló lekérése és zárolása:
  SELECT id, user_id, ownership_scope, household_id, location_id
  INTO v_parent
  FROM public.storage_containers
  WHERE id = NEW.parent_container_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A megadott szülőtároló nem létezik!';
  END IF;

  -- 6. Kereszt-háztartási védelem:
  IF NEW.ownership_scope = 'household' THEN
    IF v_parent.ownership_scope <> 'household' OR v_parent.household_id <> NEW.household_id THEN
      RAISE EXCEPTION 'Családi tároló csak ugyanahhoz a háztartáshoz tartozó családi tároló alá helyezhető!';
    END IF;
  END IF;

  -- 7. Privát szülő szabályai:
  IF v_parent.ownership_scope = 'private' THEN
    IF NEW.ownership_scope = 'household' THEN
      RAISE EXCEPTION 'Privát tároló alá nem helyezhető el családi megosztású tároló!';
    END IF;
    IF NEW.user_id <> v_parent.user_id THEN
      RAISE EXCEPTION 'Más felhasználó privát tárolójába nem ágyazható be tároló!';
    END IF;
  END IF;

  -- 8. Családi szülőben lévő privát gyermek tagság-ellenőrzése:
  IF v_parent.ownership_scope = 'household' AND NEW.ownership_scope = 'private' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = v_parent.household_id
        AND (hm.user_id = NEW.user_id OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
    ) THEN
      RAISE EXCEPTION 'Csak a háztartás igazolt tagja helyezhet el privát tárolót a családi tárolóban!';
    END IF;
  END IF;

  -- 9. DEF-01: Helyszínöröklés és közvetlen helyszínmódosítás szabályozása:
  -- Ha a szülő változatlan maradt, de a kliens közvetlenül megpróbálta átírni a helyszínt:
  IF TG_OP = 'UPDATE' 
     AND OLD.parent_container_id IS NOT NULL 
     AND NEW.parent_container_id IS NOT DISTINCT FROM OLD.parent_container_id 
     AND NEW.location_id IS DISTINCT FROM v_parent.location_id THEN
    RAISE EXCEPTION 'A gyermek tároló helyszíne közvetlenül nem módosítható, mert kötelezően a szülőtároló helyszínét követi! A helyszín megváltoztatásához a gyökér tárolót kell áthelyezni vagy új szülő alá kell rendelni.';
  END IF;

  -- Új tároló beszúrásakor vagy szülőváltáskor a gyermek megörökli a szülő helyszínét:
  NEW.location_id := v_parent.location_id;

  -- 10. Ciklusvizsgálat a felmenő láncban:
  v_current_id := NEW.parent_container_id;
  WHILE v_current_id IS NOT NULL LOOP
    IF NEW.id IS NOT NULL AND v_current_id = NEW.id THEN
      RAISE EXCEPTION 'Ciklikus tárolóhierarchia észlelve: egy tároló nem helyezhető el a saját leszármazottjában!';
    END IF;

    v_depth := v_depth + 1;
    IF v_depth > v_max_depth THEN
      RAISE EXCEPTION 'A tárolóhierarchia mélysége meghaladta a megengedett % szintet!', v_max_depth;
    END IF;

    SELECT parent_container_id INTO v_current_id
    FROM public.storage_containers
    WHERE id = v_current_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 2.3. Kaszkádolt helyszínfrissítés altárolókra és vagyontárgyakra
CREATE OR REPLACE FUNCTION public.cascade_storage_container_location_update()
RETURNS trigger AS $$
BEGIN
  -- Akkor kell kaszkádolni, ha a helyszín ténylegesen megváltozott:
  IF NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    -- 1. Közvetlen gyermek tárolók frissítése (rekurzívan kiváltja a triggerláncot):
    UPDATE public.storage_containers
    SET location_id = NEW.location_id,
        updated_at = now()
    WHERE parent_container_id = NEW.id;

    -- 2. A tárolóhoz közvetlenül rendelt vagyontárgyak frissítése:
    UPDATE public.items
    SET location_id = NEW.location_id,
        updated_at = now()
    WHERE container_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 2.4. Vagyontárgy-tároló hozzárendelés validálása
CREATE OR REPLACE FUNCTION public.validate_item_container_assignment()
RETURNS trigger AS $$
DECLARE
  v_container RECORD;
  v_loc RECORD;
  v_member RECORD;
  v_member_sharing_mode TEXT;
  v_member_allowed_locations TEXT[];
  v_user_id UUID := auth.uid();
BEGIN
  IF NEW.container_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- DEF-SEC-03: Hitelesített felhasználó megkövetelése tároló-hozzárendeléskor:
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Hitelesítés szükséges a vagyontárgy tárolóhoz rendeléséhez!';
  END IF;

  SELECT id, user_id, ownership_scope, household_id, location_id
  INTO v_container
  FROM public.storage_containers
  WHERE id = NEW.container_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A megadott tároló nem létezik!';
  END IF;

  -- 1. Szigorú hatóköri összeférhetőség:
  IF NEW.ownership_scope <> v_container.ownership_scope THEN
    RAISE EXCEPTION 'Hatóköri inkompatibilitás: privát tárgy kizárólag privát tárolóba, családi tárgy kizárólag családi tárolóba helyezhető el!';
  END IF;

  -- 2. Családi tárgy esetén azonos háztartási kötés és jogosultsági ellenőrzés:
  IF NEW.ownership_scope = 'household' THEN
    IF v_container.household_id IS DISTINCT FROM NEW.household_id THEN
      RAISE EXCEPTION 'Kereszt-háztartási tiltás: a családi tárgy csak a saját háztartásának tárolójába helyezhető el!';
    END IF;

    -- Tagsági és szerkesztői jogosultság közvetlen ellenőrzése (tagság kötelező, created_by és is_admin fallback nélkül):
    SELECT hm.role, hm.sharing_mode, hm.allowed_location_ids, hm.allowed_modules
    INTO v_member
    FROM public.household_members hm
    WHERE hm.household_id = v_container.household_id
      AND (hm.user_id = v_user_id OR (hm.user_id IS NULL AND lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', ''))));

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nem vagy tagja a cél tároló háztartásának!';
    END IF;

    IF v_member.role NOT IN ('owner', 'admin', 'member') THEN
      RAISE EXCEPTION 'Nincs szerkesztési jogosultságod a cél családi tárolóra (Viewer szerepkör)!';
    END IF;

    IF (v_member.allowed_modules->>'inventory')::boolean IS FALSE THEN
      RAISE EXCEPTION 'A leltár modul le van tiltva a fiókod számára!';
    END IF;

    v_member_sharing_mode := COALESCE(v_member.sharing_mode, 'all');
    v_member_allowed_locations := v_member.allowed_location_ids;

    -- DEF-SEC-01 & DEF-SEC-05: Helyszínjogosultság ellenőrzése az RLS és megosztási szabályok szerint:
    IF v_container.location_id IS NOT NULL THEN
      SELECT id, user_id, household_id, parent_id, name
      INTO v_loc
      FROM public.locations
      WHERE id = v_container.location_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'A cél tárolóhoz rendelt helyszín nem található!';
      END IF;

      IF NOT (
        COALESCE(v_member_sharing_mode, 'all') = 'all'
        OR v_loc.id::text = ANY(COALESCE(v_member_allowed_locations, ARRAY[]::text[]))
        OR can_access_shared_location(v_loc.id, v_loc.user_id, v_loc.household_id, v_loc.parent_id)
      ) THEN
        RAISE EXCEPTION 'Nincs jogosultságod a cél-tároló fizikai helyszínéhez (%: %)!', v_loc.name, v_loc.id;
      END IF;
    END IF;
  END IF;

  -- 3. Privát tárgy esetén azonos tulajdonosi kötés:
  IF NEW.ownership_scope = 'private' THEN
    IF v_container.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'Privát tárgy kizárólag a saját privát tárolódban helyezhető el!';
    END IF;
    IF v_user_id <> v_container.user_id THEN
      RAISE EXCEPTION 'Nincs jogosultságod más felhasználó privát tárolójához!';
    END IF;
  END IF;

  -- 4. Helyszín szinkronizálása a tárolóval:
  NEW.location_id := v_container.location_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 2.5. Egyszerű készlettétel hatókör-szinkronizálása és áthelyezési védelme
CREATE OR REPLACE FUNCTION public.sync_container_item_scope()
RETURNS trigger AS $$
DECLARE
  v_container RECORD;
BEGIN
  SELECT id, user_id, ownership_scope, household_id
  INTO v_container
  FROM public.storage_containers
  WHERE id = NEW.container_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A megadott tároló nem létezik!';
  END IF;

  -- DEF-04: Szigorú hatóköri összeférhetőség és áthelyezési védelem:
  IF TG_OP = 'UPDATE' AND OLD.container_id IS DISTINCT FROM NEW.container_id THEN
    -- 1. Családi és privát közötti áthelyezés szigorú tiltása:
    IF OLD.ownership_scope <> v_container.ownership_scope THEN
      RAISE EXCEPTION 'Hatóköri inkompatibilitás: privát készlettétel nem helyezhető át családi tárolóba, és családi készlettétel sem helyezhető át privát tárolóba!';
    END IF;

    -- 2. Családi készlet esetén kereszt-háztartási áthelyezés tiltása:
    IF OLD.ownership_scope = 'household' AND OLD.household_id <> v_container.household_id THEN
      RAISE EXCEPTION 'Kereszt-háztartási tiltás: a családi készlettétel csak ugyanazon háztartás tárolói között helyezhető át!';
    END IF;

    -- 3. Családi készlet esetén cél-tároló szerkesztési jogosultság ellenőrzése:
    IF v_container.ownership_scope = 'household' AND NOT is_household_editor(v_container.household_id) THEN
      RAISE EXCEPTION 'Nincs szerkesztési jogosultságod a cél családi tárolóban!';
    END IF;
  END IF;

  -- Hatókör szinkronizálása a cél-tároló alapján:
  NEW.ownership_scope := v_container.ownership_scope;
  NEW.household_id := v_container.household_id;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- 2.6. Készletmennyiség-módosító biztonsági RPC
-- MEGJEGYZÉS (DEF-SEC-02):
-- A függvény interaktív végfelhasználói készletmódosításra készült. Hitelesített felhasználói
-- kontextust (auth.uid()) igényel a jogosultságok (privát tulajdonos / háztartási tagság,
-- leltár modul, helyszínhozzáférés) pontos érvényesítéséhez.
-- A service_role EXECUTE jogosultsága adminisztratív API hozzáférést tesz lehetővé, de önmagában nem váltja ki
-- az auth.uid() kontextust (nincs ellenőrizetlen bypass).
CREATE OR REPLACE FUNCTION public.adjust_container_item_quantity(
  p_item_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_rec RECORD;
  v_loc RECORD;
  v_member RECORD;
  v_member_sharing_mode TEXT;
  v_member_allowed_locations TEXT[];
  v_new_qty NUMERIC;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Hitelesítés szükséges!';
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'A változás mértéke nem lehet nulla!';
  END IF;

  IF abs(p_delta) > 10000 THEN
    RAISE EXCEPTION 'A módosítás mértéke meghaladja a megengedett értéket (max 10 000)!';
  END IF;

  SELECT 
    ci.id, 
    ci.quantity, 
    ci.container_id, 
    ci.ownership_scope,
    ci.household_id,
    sc.user_id AS container_user_id, 
    sc.location_id
  INTO v_rec
  FROM public.container_items ci
  JOIN public.storage_containers sc ON sc.id = ci.container_id
  WHERE ci.id = p_item_id
  FOR UPDATE OF ci;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'A tétel nem található!';
  END IF;

  IF v_rec.ownership_scope = 'private' THEN
    IF v_rec.container_user_id <> v_user_id THEN
      RAISE EXCEPTION 'Nincs jogosultságod a privát tároló tételének módosítására!';
    END IF;
  ELSE
    -- Tagsági és szerkesztői jogosultság közvetlen ellenőrzése (tagság kötelező, created_by és is_admin fallback nélkül):
    SELECT hm.role, hm.sharing_mode, hm.allowed_location_ids, hm.allowed_modules
    INTO v_member
    FROM public.household_members hm
    WHERE hm.household_id = v_rec.household_id
      AND (hm.user_id = v_user_id OR (hm.user_id IS NULL AND lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', ''))));

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Nem vagy tagja a tároló háztartásának!';
    END IF;

    IF v_member.role NOT IN ('owner', 'admin', 'member') THEN
      RAISE EXCEPTION 'Nincs szerkesztési jogosultságod a háztartásban (Viewer szerepkör)!';
    END IF;

    IF (v_member.allowed_modules->>'inventory')::boolean IS FALSE THEN
      RAISE EXCEPTION 'A leltár modul le van tiltva a fiókod számára!';
    END IF;

    v_member_sharing_mode := COALESCE(v_member.sharing_mode, 'all');
    v_member_allowed_locations := v_member.allowed_location_ids;

    -- DEF-SEC-01 & DEF-SEC-05: Helyszínjogosultság ellenőrzése a megosztási beállítások és RLS szerint:
    IF v_rec.location_id IS NOT NULL THEN
      SELECT id, user_id, household_id, parent_id, name
      INTO v_loc
      FROM public.locations
      WHERE id = v_rec.location_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'A tárolóhoz rendelt helyszín nem található!';
      END IF;

      IF NOT (
        COALESCE(v_member_sharing_mode, 'all') = 'all'
        OR v_loc.id::text = ANY(COALESCE(v_member_allowed_locations, ARRAY[]::text[]))
        OR can_access_shared_location(v_loc.id, v_loc.user_id, v_loc.household_id, v_loc.parent_id)
      ) THEN
        RAISE EXCEPTION 'Nincs jogosultságod a tétel fizikai helyszínéhez (%: %)!', v_loc.name, v_loc.id;
      END IF;
    END IF;
  END IF;

  v_new_qty := v_rec.quantity + p_delta;
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Készlethiány: a készlet nem csökkenthető nulla alá! Jelenlegi mennyiség: %, kért levonás: %', v_rec.quantity, abs(p_delta);
  END IF;

  UPDATE public.container_items
  SET quantity = v_new_qty,
      updated_at = now()
  WHERE id = p_item_id;

  RETURN v_new_qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================================
-- 3. FÁZIS: TRIGGEREK AKTIVÁLÁSA
-- ============================================================================

-- 3.1. storage_containers törlésvédelem
DROP TRIGGER IF EXISTS trg_prevent_storage_container_delete ON public.storage_containers;
CREATE TRIGGER trg_prevent_storage_container_delete
BEFORE DELETE ON public.storage_containers
FOR EACH ROW EXECUTE FUNCTION public.prevent_storage_container_delete();

-- 3.2. storage_containers integritás és ciklusvédelem
DROP TRIGGER IF EXISTS trg_check_storage_container_integrity ON public.storage_containers;
CREATE TRIGGER trg_check_storage_container_integrity
BEFORE INSERT OR UPDATE OF parent_container_id, ownership_scope, household_id, location_id ON public.storage_containers
FOR EACH ROW EXECUTE FUNCTION public.check_storage_container_integrity();

-- 3.3. storage_containers kaszkádolt helyszínfrissítés (DEF-02)
DROP TRIGGER IF EXISTS trg_cascade_storage_container_location_update ON public.storage_containers;
CREATE TRIGGER trg_cascade_storage_container_location_update
AFTER UPDATE OF location_id, parent_container_id ON public.storage_containers
FOR EACH ROW EXECUTE FUNCTION public.cascade_storage_container_location_update();

-- 3.4. items hozzárendelés ellenőrzése
DROP TRIGGER IF EXISTS trg_validate_item_container_assignment ON public.items;
CREATE TRIGGER trg_validate_item_container_assignment
BEFORE INSERT OR UPDATE OF container_id, location_id, ownership_scope, household_id ON public.items
FOR EACH ROW EXECUTE FUNCTION public.validate_item_container_assignment();

-- 3.5. container_items hatókör-szinkronizálás (DEF-04)
DROP TRIGGER IF EXISTS trg_sync_container_item_scope ON public.container_items;
CREATE TRIGGER trg_sync_container_item_scope
BEFORE INSERT OR UPDATE OF container_id ON public.container_items
FOR EACH ROW EXECUTE FUNCTION public.sync_container_item_scope();


-- ============================================================================
-- 4. FÁZIS: BIZTONSÁGI JOGOSULTSÁGOK (RLS ÉS GRANT-EK)
-- ============================================================================

-- 4.1. storage_containers RLS
ALTER TABLE public.storage_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_containers_select_policy ON public.storage_containers;
CREATE POLICY storage_containers_select_policy ON public.storage_containers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_member(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = storage_containers.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
          AND (
            storage_containers.location_id IS NULL
            OR COALESCE(hm.sharing_mode, 'all') = 'all'
            OR storage_containers.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
            OR EXISTS (
              SELECT 1 FROM public.locations loc
              WHERE loc.id = storage_containers.location_id
                AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS storage_containers_insert_policy ON public.storage_containers;
CREATE POLICY storage_containers_insert_policy ON public.storage_containers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      ownership_scope = 'private'
      OR (
        ownership_scope = 'household'
        AND household_id IS NOT NULL
        AND is_household_editor(household_id)
        AND EXISTS (
          SELECT 1 FROM public.household_members hm
          WHERE hm.household_id = storage_containers.household_id
            AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
            AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
            AND (
              storage_containers.location_id IS NULL
              OR COALESCE(hm.sharing_mode, 'all') = 'all'
              OR storage_containers.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
              OR EXISTS (
                SELECT 1 FROM public.locations loc
                WHERE loc.id = storage_containers.location_id
                  AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
              )
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS storage_containers_update_policy ON public.storage_containers;
CREATE POLICY storage_containers_update_policy ON public.storage_containers
  FOR UPDATE TO authenticated
  USING (
    (ownership_scope = 'private' AND user_id = auth.uid())
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_editor(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = storage_containers.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
          AND (
            storage_containers.location_id IS NULL
            OR COALESCE(hm.sharing_mode, 'all') = 'all'
            OR storage_containers.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
            OR EXISTS (
              SELECT 1 FROM public.locations loc
              WHERE loc.id = storage_containers.location_id
                AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
            )
          )
      )
    )
  )
  WITH CHECK (
    (ownership_scope = 'private' AND user_id = auth.uid())
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_editor(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = storage_containers.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
          AND (
            storage_containers.location_id IS NULL
            OR COALESCE(hm.sharing_mode, 'all') = 'all'
            OR storage_containers.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
            OR EXISTS (
              SELECT 1 FROM public.locations loc
              WHERE loc.id = storage_containers.location_id
                AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS storage_containers_delete_policy ON public.storage_containers;
CREATE POLICY storage_containers_delete_policy ON public.storage_containers
  FOR DELETE TO authenticated
  USING (
    (ownership_scope = 'private' AND user_id = auth.uid())
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_admin(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = storage_containers.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
      )
    )
  );

-- 4.2. container_items RLS
ALTER TABLE public.container_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS container_items_select_policy ON public.container_items;
CREATE POLICY container_items_select_policy ON public.container_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_member(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = container_items.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
          AND EXISTS (
            SELECT 1 FROM public.storage_containers sc
            WHERE sc.id = container_items.container_id
              AND (
                sc.location_id IS NULL
                OR COALESCE(hm.sharing_mode, 'all') = 'all'
                OR sc.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
                OR EXISTS (
                  SELECT 1 FROM public.locations loc
                  WHERE loc.id = sc.location_id
                    AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
                )
              )
          )
      )
    )
  );

DROP POLICY IF EXISTS container_items_insert_policy ON public.container_items;
CREATE POLICY container_items_insert_policy ON public.container_items
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.storage_containers sc
      WHERE sc.id = container_items.container_id
        AND (
          (sc.ownership_scope = 'private' AND sc.user_id = auth.uid())
          OR (
            sc.ownership_scope = 'household' 
            AND is_household_editor(sc.household_id)
            AND EXISTS (
              SELECT 1 FROM public.household_members hm
              WHERE hm.household_id = sc.household_id
                AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
                AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
                AND (
                  sc.location_id IS NULL
                  OR COALESCE(hm.sharing_mode, 'all') = 'all'
                  OR sc.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
                  OR EXISTS (
                    SELECT 1 FROM public.locations loc
                    WHERE loc.id = sc.location_id
                      AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
                  )
                )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS container_items_update_policy ON public.container_items;
CREATE POLICY container_items_update_policy ON public.container_items
  FOR UPDATE TO authenticated
  USING (
    (ownership_scope = 'private' AND user_id = auth.uid())
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_editor(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        JOIN public.storage_containers sc ON sc.id = container_items.container_id
        WHERE hm.household_id = container_items.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
          AND (
            sc.location_id IS NULL
            OR COALESCE(hm.sharing_mode, 'all') = 'all'
            OR sc.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
            OR EXISTS (
              SELECT 1 FROM public.locations loc
              WHERE loc.id = sc.location_id
                AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
            )
          )
      )
    )
  )
  WITH CHECK (
    (ownership_scope = 'private' AND user_id = auth.uid())
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_editor(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        JOIN public.storage_containers sc ON sc.id = container_items.container_id
        WHERE hm.household_id = container_items.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
          AND (
            sc.location_id IS NULL
            OR COALESCE(hm.sharing_mode, 'all') = 'all'
            OR sc.location_id::text = ANY(COALESCE(hm.allowed_location_ids, ARRAY[]::text[]))
            OR EXISTS (
              SELECT 1 FROM public.locations loc
              WHERE loc.id = sc.location_id
                AND can_access_shared_location(loc.id, loc.user_id, loc.household_id, loc.parent_id)
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS container_items_delete_policy ON public.container_items;
CREATE POLICY container_items_delete_policy ON public.container_items
  FOR DELETE TO authenticated
  USING (
    (ownership_scope = 'private' AND user_id = auth.uid())
    OR
    (
      ownership_scope = 'household'
      AND household_id IS NOT NULL
      AND is_household_admin(household_id)
      AND EXISTS (
        SELECT 1 FROM public.household_members hm
        WHERE hm.household_id = container_items.household_id
          AND (hm.user_id = auth.uid() OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
          AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
      )
    )
  );

-- 4.3. adjust_container_item_quantity futtatási jogok
-- DEF-SEC-02: Az RPC kizárólag érvényes felhasználói JWT-vel (auth.uid()) hívható sikeresen.
-- A service_role jogosultsága adminisztratív API hozzáférést tesz lehetővé, de felhasználói
-- kontextus (auth.uid()) nélkül a függvény védelmi okból megtagadja a készletmódosítást.
REVOKE ALL ON FUNCTION public.adjust_container_item_quantity(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_container_item_quantity(UUID, NUMERIC) TO authenticated, service_role;

-- 4.4. Trigger függvények közvetlen RPC hívásának letiltása (triggerek kizárólag belsőleg futnak)
REVOKE EXECUTE ON FUNCTION public.prevent_storage_container_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_storage_container_integrity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cascade_storage_container_location_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_item_container_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_container_item_scope() FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- 5. FÁZIS: POSTGREST SÉMA GYORSÍTÓTÁR ÉRVÉNYTELENÍTÉSE
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- ROLLBACK INSTRUKCIÓK (DOWN MIGRATION):
-- Amennyiben visszaállítás szükséges, futtasd az alábbi blokkot egyetlen tranzakcióban:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS trg_validate_item_container_assignment ON public.items;
-- DROP TRIGGER IF EXISTS trg_sync_container_item_scope ON public.container_items;
-- DROP TRIGGER IF EXISTS trg_cascade_storage_container_location_update ON public.storage_containers;
-- DROP TRIGGER IF EXISTS trg_check_storage_container_integrity ON public.storage_containers;
-- DROP TRIGGER IF EXISTS trg_prevent_storage_container_delete ON public.storage_containers;
-- DROP FUNCTION IF EXISTS public.adjust_container_item_quantity(UUID, NUMERIC);
-- DROP FUNCTION IF EXISTS public.sync_container_item_scope();
-- DROP FUNCTION IF EXISTS public.validate_item_container_assignment();
-- DROP FUNCTION IF EXISTS public.cascade_storage_container_location_update();
-- DROP FUNCTION IF EXISTS public.check_storage_container_integrity();
-- DROP FUNCTION IF EXISTS public.prevent_storage_container_delete();
-- ALTER TABLE public.items DROP COLUMN IF EXISTS container_id;
-- DROP TABLE IF EXISTS public.container_items CASCADE;
-- DROP TABLE IF EXISTS public.storage_containers CASCADE;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
--
-- FONTOS ADATVÉDELMI FIGYELMEZTETÉS: Éles üzem esetén a rollback megsemmisíti
-- a tárolók és készlettételek adatait! Rollback előtt kötelező a CSV/JSON mentés!
-- ============================================================================
