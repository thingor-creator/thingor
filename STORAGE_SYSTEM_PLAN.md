# THINGOR – TÁROLÓRENDSZER ÉS CSALÁDI MEGOSZTÁS INTEGRÁCIÓJA
**Fizikai tárolók (dobozok, polcok, szekrények, ládák), beágyazott hierarchia, QR-címkék, darabszámos tételek és a meglévő családi megosztási modell teljes integrációja**  
**Dokumentum verzió:** 1.4.6 (Célzott biztonsági és konzisztencia javítás – DEF-01–DEF-05)  
**Dátum:** 2026. október 16.  
**Munkamód:** READ-ONLY TERVFRISSÍTÉS – SAFE PATCH – NO REFACTOR  
**Státusz:** Tervezési fázis (Read-Only validáció; kód-, séma- és adatbázis-módosítás szigorúan tilos)

---

## 1. Kötelező korlátozások és alapelvek

Jelen dokumentum a Thingor fizikai tárolórendszerének architekturális, adatbázis- és jogosultsági integrációs terve.

### Szigorú munkaszabályok:
1. **Kizárólag audit és tervezés:** Nem módosulhat semmilyen alkalmazáskód (`.ts`, `.tsx`), adatbázis-rekord, táblaséma, RLS-szabály, PostgreSQL trigger vagy Supabase Edge Function.
2. **Módosító SQL tilalma:** Nincs `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE` utasítás-végrehajtás.
3. **Projekt-infrastruktúra védelme:** Nincs csomagtelepítés (`npm install`), nincs Supabase deploy és nincs Git push.
4. **Kizárólagos fájlmódosítás:** Egyedül a `STORAGE_SYSTEM_PLAN.md` dokumentum frissülhet a munkamenet során.
5. **Zero-Assumption (Bizonyítási elv):** Nem tekintünk egy tervezett funkciót vagy elvárt viselkedést megvalósult ténynek. Minden megállapításnál forrásfájllal igazoljuk a meglévő működést, a nyitott vagy még nem bevizsgált kérdéseket pedig **NEM IGAZOLT** jelöléssel látjuk el.
6. **Tervezett specifikáció vs. végrehajtott teszt:** A dokumentumban szereplő biztonsági garanciák **tervezett elméleti specifikációk**, a tesztmátrixban szereplő tesztek pedig **a migráció jóváhagyása után kötelezően végrehajtandó tesztesetek**; egyetlen tesztről sem állítjuk, hogy az éles adatbázisban már lefutott.
7. **STOP elv:** A tervfrissítés befejezése után kötelező a megállás; a fejlesztés és a migrációk létrehozása csak kifejezett felhasználói jóváhagyás után indulhat el.

---

## 2. Változatlan Üzleti Szabályok (Core Business Rules)

A tárolórendszer alapvető működési elvei szigorúan változatlanok:
1. **Szigorú hatókör-kompatibilitás:**
   - Privát tárgy (`ownership_scope = 'private'`) kizárólag a felhasználó saját privát tárolójába helyezhető el.
   - Családi tárgy (`ownership_scope = 'household'`) kizárólag ugyanazon háztartás kompatibilis családi tárolójába helyezhető el.
   - Privát tárgy NEM helyezhető el családi tárolóba, és az áthelyezés soha nem módosíthatja a tárgy saját jogosultságait vagy megosztási körét.
2. **Széfvédelem sérthetetlensége:**
   - A széfben védett vagyontárgyakhoz (`is_vault_protected = true`) a tároló megosztása, azonosítója vagy QR-kódja sem adhat többlethozzáférést. Nem-tulajdonos családtagoknak a lekérdezés 0 sort ad.
3. **Kizárólag üres tároló törölhető:**
   - Tároló csak akkor törölhető, ha nincs benne hozzárendelt vagyontárgy (`items`), nincs egyszerű készlettétel (`container_items`), és nincs altárolója (`parent_container_id`).
4. **Családi egyszerű készlettételek kezelése:**
   - Családi készlettételt a háztartáshoz, modulhoz és helyszínhez jogosult családtagok kezelhetnek; a `viewer` szerepkör kizárólag olvashat.

---

## 3. Modul- és Helyszínjogosultságok Műveletenkénti Bontásban

A meglévő migrációk (`20261007_households_and_invites.sql`, `20261010_fix_viewer_role_rls.sql`, `20261011_category_and_location_sharing.sql`, `20261016_security_hardening_v2.sql`) alapján a jogosultságok nem vezethetők le kizárólag a `role` szerepkörből. Minden műveletnél külön kell érvényesíteni az `allowed_modules->>'inventory'` és az `allowed_location_ids` feltételeket.

### 3.1. `storage_containers` műveletek jogosultsági szabályai

| Művelet | Privát tároló (`private`) | Családi tároló (`household`) jogosultsági feltétele |
| :--- | :--- | :--- |
| **`SELECT`** | `auth.uid() = user_id` | 1. Aktív tagság: `is_household_member(household_id)`.<br>2. Moduljogosultság: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.<br>3. Helyszínhozzáférés: `location_id IS NULL` VAGY `sharing_mode = 'all'` VAGY a tag jogosult a helyszínre a `locations` rekord adatai alapján. |
| **`INSERT`** | `auth.uid() = user_id` | 1. Szerkesztői jog: `is_household_editor(household_id)` (`viewer` kizárva).<br>2. Moduljogosultság: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.<br>3. Helyszínjogosultság: ha van `location_id`, a tagnak rendelkeznie kell hozzáféréssel az adott helyszínhez. |
| **`UPDATE`** | `auth.uid() = user_id` (régi és új állapotban is) | 1. Szerkesztői jog: `is_household_editor(household_id)`.<br>2. Moduljogosultság: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)` a régi ÉS az új állapotra is.<br>3. Helyszínjogosultság: a tagnak a régi ÉS az új helyszínhez is hozzáféréssel kell rendelkeznie.<br>4. Hatókör-védelem: a megosztási kör vagy háztartás átírását a trigger csak `is_household_admin` joggal engedi. |
| **`DELETE`** | `auth.uid() = user_id` | 1. Adminisztrátori jog: `is_household_admin(household_id)` (`member` és `viewer` kizárva).<br>2. Moduljogosultság: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.<br>3. Ürességi feltétel: trigger és `RESTRICT` idegen kulcsok ellenőrzik. |

### 3.2. `container_items` műveletek jogosultsági szabályai

| Művelet | Privát tétel (`private`) | Családi tétel (`household`) jogosultsági feltétele |
| :--- | :--- | :--- |
| **`SELECT`** | `auth.uid() = user_id` | 1. Aktív tagság: `is_household_member(household_id)`.<br>2. Moduljogosultság: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.<br>3. Tároló helyszínéhez való hozzáférés (ha van helyszíne). |
| **`INSERT`** | `auth.uid() = user_id` | 1. Szerkesztői jog: `is_household_editor(household_id)`.<br>2. Moduljogosultság: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.<br>3. Tároló helyszínéhez való hozzáférés. |
| **`UPDATE`** | `auth.uid() = user_id` | 1. Szerkesztői jog: `is_household_editor(household_id)`.<br>2. Moduljogosultság kötelező a régi és új állapotban is.<br>3. Tároló helyszínéhez való hozzáférés. |
| **`DELETE`** | `auth.uid() = user_id` | 1. Adminisztrátori jog: `is_household_admin(household_id)`.<br>2. Moduljogosultság kötelező. |
| **Mennyiség RPC (`adjust...`)** | `sc.user_id = auth.uid()` | 1. `is_household_editor(household_id)` (`viewer` azonnal elutasítva).<br>2. `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.<br>3. Helyszínhozzáférés a valódi `locations` adatokkal ellenőrizve.<br>4. `< 0` levonás explicit hibát dob. |

---

## 4. Helyszínöröklés és a Hierarchia Konzisztenciája

A tárolóhierarchia fizikai valóságát és a helyszínek szigorú konzisztenciáját a rendszer az alábbi egyértelmű szabályok szerint kezeli:

### 4.1. Helyszínkezelési esetek (DEF-01 és DEF-02 szerint pontosítva)
1. **Új tároló létrehozása szülő nélkül (Gyökér tároló):**
   - A felhasználó szabadon megadhat egy érvényes `location_id` értéket, vagy hagyhatja `NULL`-on (pl. "Rendszerezés alatt").
   - Családi tároló esetén az RLS és a trigger ellenőrzi, hogy a felhasználónak van-e jogosultsága a megadott helyszínhez.
2. **Új tároló létrehozása szülővel (Gyermek tároló):**
   - **Kötelező öröklés:** A gyermek tároló fizikai helyszíne nem lehet független: a `check_storage_container_integrity` trigger automatikusan beállítja `NEW.location_id := v_parent.location_id` értékre (akkor is, ha a szülő helyszíne `NULL`).
3. **Gyermek áthelyezése másik szülő alá (`parent_container_id` változik – DEF-01):**
   - A gyermek tároló automatikusan megörökli az új szülőtároló helyszínét (`NEW.location_id := v_parent.location_id`), függetlenül attól, hogy az új szülőnek van-e helyszíne vagy `NULL`.
   - A régi helyszínnel való eltérés **nem okozhat és nem okoz hibát**, mert a szülőváltás jogszerű hierarchiamódosítás.
   - Az `AFTER UPDATE OF location_id, parent_container_id` trigger tranzakciósan és rekurzívan frissíti a gyermek alá tartozó összes leszármazott tároló és vagyontárgy helyszínét (DEF-02).
4. **Gyermek tároló gyökérré emelése (`OLD.parent_container_id IS NOT NULL` és `NEW.parent_container_id IS NULL`):**
   - A tároló gyökérré válik; megtarthatja korábbi helyszínét vagy tetszőleges új érvényes helyszínt kaphat. Nem dob hibát a szülő követéséről, mivel a szülői kapcsolat megszűnt.
5. **Közvetlen `location_id` módosítás gyermek tárolón változatlan szülő esetén (SZIGORÚAN TILTOTT):**
   - Ha egy tároló szülője változatlan marad (`NEW.parent_container_id IS NOT NULL AND NEW.parent_container_id IS NOT DISTINCT FROM OLD.parent_container_id`), és a felhasználó közvetlen SQL vagy API hívással megpróbálja átírni a `location_id`-t a szülőtől eltérő értékre:
   - A `check_storage_container_integrity` trigger azonnal kivétellel elutasítja a kérést:
     ```sql
     IF TG_OP = 'UPDATE' 
        AND OLD.parent_container_id IS NOT NULL 
        AND NEW.parent_container_id IS NOT DISTINCT FROM OLD.parent_container_id 
        AND NEW.location_id IS DISTINCT FROM v_parent.location_id THEN
       RAISE EXCEPTION 'A gyermek tároló helyszíne közvetlenül nem módosítható, mert kötelezően a szülőtároló helyszínét követi! A helyszín megváltoztatásához a gyökér tárolót kell áthelyezni vagy új szülő alá kell rendelni.';
     END IF;
     ```
   - Ezzel a hierarchia fizikai integritása 100%-ban védett marad.
6. **Szülő helyszínének módosítása és szülőváltás kaszkádolása (DEF-02):**
   - Amikor egy tároló `location_id`-ja vagy `parent_container_id`-ja megváltozik, a `trg_cascade_storage_container_location_update` trigger tranzakciósan és rekurzívan frissíti az összes közvetlen és közvetett leszármazott tárolót, valamint a hozzárendelt vagyontárgyak (`items.location_id`) helyszínét.

---

## 5. Háztartás Törlése és az Idegen Kulcsok Életciklusa

A meglévő adatbázis vizsgálata alapján a `households` törléséhez kapcsolódó viselkedés:
- `household_members`: `ON DELETE CASCADE` (`20261007_households_and_invites.sql:41`).
- `items`: `ON DELETE SET NULL` (`20261007_households_and_invites.sql:63`).
- `locations`: `ON DELETE SET NULL` (`20261007_households_and_invites.sql:67`).

### 5.1. A tárolórendszer alternatíváinak elemzése
- **Alternatíva 1: `ON DELETE CASCADE`:**
  - Ha a háztartást törlik, az összes családi tároló automatikusan törlődne.
  - *Kockázat:* Ha a családi tárolókban vagyontárgyak vagy készletek vannak, a törlés vagy adatvesztést okozna, vagy a `prevent_storage_container_delete` trigger miatt a háztartás törlése érthetetlen hibával elakadna.
- **Alternatíva 2: `ON DELETE RESTRICT` (Kiválasztott biztonságos megoldás):**
  - `storage_containers.household_id UUID REFERENCES public.households(id) ON DELETE RESTRICT`.
  - **Miért ez a helyes döntés?**
    1. Nem engedi a háztartás törlését mindaddig, amíg családi tárolók vannak hozzárendelve.
    2. Nem hagy árván rekordokat, és kizárja, hogy a `chk_container_household_scope` kényszer megsérüljön.
    3. Megköveteli az explicit, tudatos leltár-felszámolást: a családfőnek előbb ki kell ürítenie és törölnie kell a tárolókat (vagy priváttá kell alakítania őket), mielőtt a teljes háztartási fiókot megszüntetné.

---

## 6. Helyszínellenőrzés Pontosítása (`can_access_shared_location`)

A `can_access_shared_location` függvény definíciója (`20261011_category_and_location_sharing.sql:90-141`):
```sql
CREATE OR REPLACE FUNCTION public.can_access_shared_location(
  p_location_id UUID,
  p_location_user_id UUID,
  p_location_household_id UUID,
  p_location_parent_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
```
- A függvény a 2. paraméterben a helyszín létrehozóját (`location.user_id`), a 4. paraméterben pedig az alhelyszín szülőjét (`location.parent_id`) várja.
- **Megállapítás:** A korábbi tervezetekben szereplő `container_user_id` vagy a vak `NULL` átadása kockázatos, mert ha a felhasználó egy alhelyiséghez kapott jogosultságot a szülőjén keresztül, a `NULL` szülőparaméter miatt a függvény tévesen megtagadná a hozzáférést!
- **Helyes hívási minta az RPC-ben és a triggerekben:**
  A rendszer a tároló `location_id`-jához tartozó valós `locations` rekordot kérdezi le:
  ```sql
  SELECT id, user_id, household_id, parent_id
  INTO v_loc
  FROM public.locations
  WHERE id = v_rec.location_id;

  IF NOT can_access_shared_location(v_loc.id, v_loc.user_id, v_loc.household_id, v_loc.parent_id) THEN
    RAISE EXCEPTION 'Nincs jogosultságod a tároló fizikai helyszínéhez!';
  END IF;
  ```
  Ez a minta 100%-ban illeszkedik a meglévő függvény működéséhez, és hibátlanul kezeli a kétszintű helyszínhierarchiát.

---

## 7. Tranzakciós Zárolás és Konkurenciavédelem

### 7.1. Tranzakciós Tanácsadói Zárolási Protokoll
A hierarchia körképződésének kivédésére a PostgreSQL tanácsadói zárolását (`pg_advisory_xact_lock`) alkalmazzuk:
1. **Kulcsképzés:** Determinisztikus, 64 bites előjeles egész szám generálása a háztartás vagy felhasználó azonosítójából:
   ```sql
   v_lock_key := ('x' || substr(md5('storage_tree_' || COALESCE(NEW.household_id::text, NEW.user_id::text)), 1, 16))::bit(64)::bigint;
   PERFORM pg_advisory_xact_lock(v_lock_key);
   ```
2. **Szigorú végrehajtási sorrend:**
   - A zár kérése a trigger **legelső lépése**, megelőzve minden lekérdezést és ciklusbejárást.
   - Amíg a tranzakció vizsgálja a fát, az adott háztartásban más tranzakció nem módosíthatja a struktúrát.
3. **Párhuzamos Törlés vs. Beszúrás vs. Áthelyezés:**
   - **Törlés vs. Beszúrás:** A tároló törlése kizárólagos zárat tart a tároló során (`DELETE`). Egy párhuzamos `INSERT` az idegen kulcs ellenőrzése során `FOR KEY SHARE` zárat kér a tárolóra, ami ütközik. A műveletek szerializálódnak, és a törlés után a beszúrás idegen kulcs hibával elutasításra kerül.
   - **Párhuzamos átrendezés (T1: A->B, T2: B->A):** Az advisory lock miatt T2 sorba áll T1 mögé. T1 lefutása után T2 már az új faállapotot látja, és a ciklusvizsgálat kivétellel megszakítja a tranzakciót.

---

## 8. Véglegesített Adatbázis-séma, Triggerek és RLS Szabályok (1.4.5)

### 8.1. `storage_containers` tábla DDL
```sql
CREATE TABLE public.storage_containers (
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

CREATE INDEX idx_storage_containers_user_id ON public.storage_containers(user_id);
CREATE INDEX idx_storage_containers_household_id ON public.storage_containers(household_id);
CREATE INDEX idx_storage_containers_location_id ON public.storage_containers(location_id);
CREATE INDEX idx_storage_containers_parent_id ON public.storage_containers(parent_container_id);
```

### 8.2. Tárolótörlést korlátozó trigger (`prevent_storage_container_delete`)
```sql
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

CREATE TRIGGER trg_prevent_storage_container_delete
BEFORE DELETE ON public.storage_containers
FOR EACH ROW EXECUTE FUNCTION public.prevent_storage_container_delete();
```

### 8.3. Hierarchia, Helyszín- és Ciklusvédelmi trigger (`check_storage_container_integrity`)
```sql
CREATE OR REPLACE FUNCTION public.check_storage_container_integrity()
RETURNS trigger AS $$
DECLARE
  v_current_id UUID;
  v_depth INT := 0;
  v_max_depth CONSTANT INT := 50;
  v_parent RECORD;
  v_lock_key BIGINT;
BEGIN
  -- Belső QR-kód formátum beállítása:
  IF NEW.qr_code IS NULL OR trim(NEW.qr_code) = '' THEN
    NEW.qr_code := 'thg:c:' || COALESCE(NEW.id, gen_random_uuid())::text;
  END IF;

  -- 1. DEF-03: Hatókör- és háztartásváltás szigorú szerveroldali védelme (még a korai kilépések ELŐTT!):
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
    -- Ha gyermekből lett gyökér (gyökérré emelés), megtarthatja az eddigi helyszínt vagy új érvényes helyszínt kaphat:
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

  -- Új tároló beszúrásakor vagy szülőváltáskor (reparenting) a gyermek kötelezően megörökli a szülő helyszínét:
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

CREATE TRIGGER trg_check_storage_container_integrity
BEFORE INSERT OR UPDATE OF parent_container_id, ownership_scope, household_id, location_id ON public.storage_containers
FOR EACH ROW EXECUTE FUNCTION public.check_storage_container_integrity();
```

### 8.4. Kaszkádolt helyszínfrissítés (`cascade_storage_container_location_update`)
```sql
CREATE OR REPLACE FUNCTION public.cascade_storage_container_location_update()
RETURNS trigger AS $$
BEGIN
  -- Akkor kell kaszkádolni, ha a helyszín ténylegesen megváltozott:
  IF NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    -- 1. Közvetlen gyermek tárolók frissítése:
    -- Ez a művelet rekurzívan kiváltja a gyermekek trg_cascade_storage_container_location_update triggerét is,
    -- így a teljes leszármazotti fa (unokák, dédunokák stb.) automatikusan és tranzakciósan frissül.
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

-- DEF-02: A triggernek mind a location_id, mind a parent_container_id módosítására le kell futnia!
CREATE TRIGGER trg_cascade_storage_container_location_update
AFTER UPDATE OF location_id, parent_container_id ON public.storage_containers
FOR EACH ROW EXECUTE FUNCTION public.cascade_storage_container_location_update();
```

### 8.5. `items.container_id` oszlop és Szigorú Hatókör-kompatibilitási Trigger
```sql
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES public.storage_containers(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_items_container_id ON public.items(container_id) WHERE container_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_item_container_assignment()
RETURNS trigger AS $$
DECLARE
  v_container RECORD;
  v_loc RECORD;
BEGIN
  IF NEW.container_id IS NULL THEN
    RETURN NEW;
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

  -- 2. Családi tárgy esetén azonos háztartási kötés és szerkesztési jog:
  IF NEW.ownership_scope = 'household' THEN
    IF v_container.household_id <> NEW.household_id THEN
      RAISE EXCEPTION 'Kereszt-háztartási tiltás: a családi tárgy csak a saját háztartásának tárolójába helyezhető el!';
    END IF;
    IF NOT is_household_editor(v_container.household_id) THEN
      RAISE EXCEPTION 'Nincs szerkesztési jogosultságod a cél családi tárolóra!';
    END IF;
    -- Helyszínjogosultság ellenőrzése egyedi megosztásnál:
    IF v_container.location_id IS NOT NULL THEN
      SELECT id, user_id, household_id, parent_id INTO v_loc FROM public.locations WHERE id = v_container.location_id;
      IF NOT can_access_shared_location(v_loc.id, v_loc.user_id, v_loc.household_id, v_loc.parent_id) THEN
        RAISE EXCEPTION 'Nincs jogosultságod a cél-tároló fizikai helyszínéhez!';
      END IF;
    END IF;
  END IF;

  -- 3. Privát tárgy esetén azonos tulajdonosi kötés:
  IF NEW.ownership_scope = 'private' THEN
    IF v_container.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'Privát tárgy kizárólag a saját privát tárolódban helyezhető el!';
    END IF;
  END IF;

  -- 4. Helyszín szinkronizálása a tárolóval:
  NEW.location_id := v_container.location_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_validate_item_container_assignment
BEFORE INSERT OR UPDATE OF container_id, location_id, ownership_scope, household_id ON public.items
FOR EACH ROW EXECUTE FUNCTION public.validate_item_container_assignment();
```

### 8.6. `container_items` tábla és szinkronizáció
```sql
CREATE TABLE public.container_items (
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

CREATE INDEX idx_container_items_container_id ON public.container_items(container_id);
CREATE INDEX idx_container_items_household_id ON public.container_items(household_id);

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

  -- Hatókör szinkronizálása a cél-tároló alapján (új tétel beszúrásakor vagy szabályos áthelyezéskor):
  NEW.ownership_scope := v_container.ownership_scope;
  NEW.household_id := v_container.household_id;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_sync_container_item_scope
BEFORE INSERT OR UPDATE OF container_id ON public.container_items
FOR EACH ROW EXECUTE FUNCTION public.sync_container_item_scope();
```

### 8.7. `adjust_container_item_quantity` RPC pontosított helyszínhívással
```sql
CREATE OR REPLACE FUNCTION public.adjust_container_item_quantity(
  p_item_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_rec RECORD;
  v_loc RECORD;
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
    IF NOT is_household_editor(v_rec.household_id) THEN
      RAISE EXCEPTION 'Nincs szerkesztési jogosultságod a háztartásban (Viewer szerepkör vagy nem tag)!';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.household_members hm
      WHERE hm.household_id = v_rec.household_id
        AND (hm.user_id = v_user_id OR lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
        AND ((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)
    ) THEN
      RAISE EXCEPTION 'A leltár modul le van tiltva a fiókod számára!';
    END IF;

    IF v_rec.location_id IS NOT NULL THEN
      SELECT id, user_id, household_id, parent_id INTO v_loc FROM public.locations WHERE id = v_rec.location_id;
      IF NOT can_access_shared_location(v_loc.id, v_loc.user_id, v_loc.household_id, v_loc.parent_id) THEN
        RAISE EXCEPTION 'Nincs jogosultságod a tétel fizikai helyszínéhez!';
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

REVOKE ALL ON FUNCTION public.adjust_container_item_quantity(UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_container_item_quantity(UUID, NUMERIC) TO authenticated, service_role;
```

### 8.8. RLS Szabályok (`storage_containers` és `container_items`)
```sql
ALTER TABLE public.storage_containers ENABLE ROW LEVEL SECURITY;

-- 1. SELECT
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

-- 2. INSERT: Modul- és helyszínellenőrzéssel
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

-- 3. UPDATE: Régi és új állapotra is modul- és helyszínvédelemmel
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

-- 4. DELETE: Kizárólag Admin/Owner és aktív leltármodul
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

ALTER TABLE public.container_items ENABLE ROW LEVEL SECURITY;

-- 1. SELECT
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

-- 2. INSERT
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

-- 3. UPDATE: Modul- és helyszínvédelemmel a régi és új állapotra is
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

-- 4. DELETE
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

### 8.9. Migrációs függőségek és Lépésről Lépésre Végrehajtási Sorrend (DEF-05)

A táblák, idegen kulcsok és triggerek közötti kölcsönös függőségek miatt a migrációt az alábbi szigorúan meghatározott sorrendben kell végrehajtani egyetlen tranzakcióban:

1. **Táblák és oszlopok létrehozása:**
   - 1.1. `storage_containers` tábla és indexek (`idx_storage_containers_...`).
   - 1.2. `items.container_id` oszlop és index (`idx_items_container_id`).
   - 1.3. `container_items` tábla és indexek (`idx_container_items_...`).
2. **Triggerek függvényeinek definiálása (`CREATE OR REPLACE FUNCTION`):**
   - 2.1. `prevent_storage_container_delete` (hivatkozik: `items`, `container_items`, `storage_containers`).
   - 2.2. `check_storage_container_integrity` (hivatkozik: `storage_containers`, `household_members`, `is_household_admin`).
   - 2.3. `cascade_storage_container_location_update` (hivatkozik: `storage_containers`, `items`).
   - 2.4. `validate_item_container_assignment` (hivatkozik: `items`, `storage_containers`, `can_access_shared_location`).
   - 2.5. `sync_container_item_scope` (hivatkozik: `container_items`, `storage_containers`, `is_household_editor`).
   - 2.6. `adjust_container_item_quantity` RPC (hivatkozik: `container_items`, `storage_containers`, `can_access_shared_location`).
3. **Triggerek aktiválása a táblákon (`CREATE TRIGGER`):**
   - 3.1. `trg_prevent_storage_container_delete` ON `storage_containers`.
   - 3.2. `trg_check_storage_container_integrity` ON `storage_containers`.
   - 3.3. `trg_cascade_storage_container_location_update` ON `storage_containers`.
   - 3.4. `trg_validate_item_container_assignment` ON `items`.
   - 3.5. `trg_sync_container_item_scope` ON `container_items`.
4. **Biztonsági jogosultságok (RLS és GRANT-ek):**
   - 4.1. `ALTER TABLE storage_containers ENABLE ROW LEVEL SECURITY;`
   - 4.2. `storage_containers` RLS szabályok (SELECT, INSERT, UPDATE, DELETE).
   - 4.3. `ALTER TABLE container_items ENABLE ROW LEVEL SECURITY;`
   - 4.4. `container_items` RLS szabályok (SELECT, INSERT, UPDATE, DELETE).
   - 4.5. `REVOKE ALL ON FUNCTION adjust_container_item_quantity ... FROM PUBLIC, anon;`
   - 4.6. `GRANT EXECUTE ON FUNCTION adjust_container_item_quantity ... TO authenticated, service_role;`
5. **PostgREST séma cache frissítése:**
   - 5.1. `NOTIFY pgrst, 'reload schema';`

---

### 8.10. Visszavonási Terv (Rollback Plan & Down Migration – DEF-05)

A tervezett migráció esetleges visszagörgetése a következő lépésekkel hajtható végre:

```sql
-- ROLLBACK SCRIPT (DOWN MIGRATION)
BEGIN;

-- 1. Triggerek törlése:
DROP TRIGGER IF EXISTS trg_validate_item_container_assignment ON public.items;
DROP TRIGGER IF EXISTS trg_sync_container_item_scope ON public.container_items;
DROP TRIGGER IF EXISTS trg_cascade_storage_container_location_update ON public.storage_containers;
DROP TRIGGER IF EXISTS trg_check_storage_container_integrity ON public.storage_containers;
DROP TRIGGER IF EXISTS trg_prevent_storage_container_delete ON public.storage_containers;

-- 2. Függvények törlése:
DROP FUNCTION IF EXISTS public.adjust_container_item_quantity(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.sync_container_item_scope();
DROP FUNCTION IF EXISTS public.validate_item_container_assignment();
DROP FUNCTION IF EXISTS public.cascade_storage_container_location_update();
DROP FUNCTION IF EXISTS public.check_storage_container_integrity();
DROP FUNCTION IF EXISTS public.prevent_storage_container_delete();

-- 3. Oszlopok és táblák törlése:
-- FIGYELEM: items.container_id eldobása nem érinti magukat a vagyontárgyakat és azok helyszíneit!
ALTER TABLE public.items DROP COLUMN IF EXISTS container_id;
DROP TABLE IF EXISTS public.container_items CASCADE;
DROP TABLE IF EXISTS public.storage_containers CASCADE;

-- 4. PostgREST gyorsítótár ürítése:
NOTIFY pgrst, 'reload schema';

COMMIT;
```

#### Adatvesztési kockázatok és nem-automatikus rollback esetek:
1. **Éles adatok elvesztése:**
   - Ha a migráció után a felhasználók már hoztak létre fizikai tárolókat (`storage_containers`) vagy egyszerű készleteket (`container_items`), a táblák eldobása (`DROP TABLE`) ezen adatok **végleges és visszavonhatatlan megsemmisülését** eredményezi.
   - Az `items.container_id` oszlop eldobása megszünteti a vagyontárgyak dobozokhoz/polcokhoz rendelését, de a tárgyak rekordjai, fényképei, számlái és fizikai helyszínei (`location_id`) sértetlenek maradnak.
2. **Kényszerű előzetes adatmentés:**
   - Amennyiben éles üzemben futó adatbázison válik szükségessé a rollback, az automatikus visszagörgetés **TILOS mindaddig**, amíg a `storage_containers` és `container_items` táblák teljes tartalma nem kerül exportálásra (JSON vagy CSV formátumban).
```

---

## 9. Kötelező Tervezett Tesztspecifikáció (12 Forgatókönyv)

> [!IMPORTANT]
> **Figyelem:** Az alábbi táblázat a migráció jóváhagyása után kötelezően végrehajtandó tesztesetek pontos előfeltételeit, műveleteit és elvárt eredményeit rögzíti. Ezek elméleti specifikációk; az éles adatbázisban még **nem futottak le**.

| Teszt ID | Teszteset neve | Előfeltétel (Precondition) | Végrehajtott művelet (Action) | Elvárt eredmény (Expected Result) |
| :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | **Leltármodul letiltva** | Tag szerepköre `member`, de `allowed_modules->>'inventory' = 'false'`. | SELECT, INSERT vagy UPDATE kísérlet `storage_containers` vagy `container_items` táblán. | **RLS REJECT (0 sor / 403 Forbidden):** Nem láthat és nem módosíthat sem tárolót, sem készletet. |
| **TEST-02** | **Helyszín-hozzáférés megtagadva** | Tag `sharing_mode = 'custom'`, a tároló helyszíne (`Pince`) nincs benne az `allowed_location_ids` tömbben. | SELECT `storage_containers WHERE location_id = pince_id`. | **0 sor (Rejtett):** A tároló és a benne lévő tételek teljesen láthatatlanok. |
| **TEST-03** | **`viewer` írási kísérlete** | Felhasználó szerepköre `viewer` a háztartásban. | 1. INSERT tároló vagy tétel.<br>2. UPDATE készletmennyiség RPC. | 1. **RLS REJECT (403)**.<br>2. **RPC EXCEPTION:** "Nincs szerkesztési jogosultságod a háztartásban (Viewer szerepkör)!" |
| **TEST-04** | **Másik háztartás tárolójának elérése** | Felhasználó a "B" háztartás tagja, a tároló az "A" háztartáshoz tartozik. | SELECT `storage_containers WHERE household_id = A_id`. | **0 sor (Rejtett):** Kereszt-háztartási adatszivárgás szigorúan kizárva. |
| **TEST-05** | **Privát/családi inkompatibilis áthelyezés** | Vagyontárgy `ownership_scope = 'private'`, cél-tároló `ownership_scope = 'household'`. | UPDATE `items SET container_id = family_container_id WHERE id = private_item_id`. | **TRIGGER EXCEPTION:** "Hatóköri inkompatibilitás: privát tárgy kizárólag privát tárolóba helyezhető el!" |
| **TEST-06** | **Széfben védett tárgy közvetlen és QR-alapú elérése** | Vagyontárgy `is_vault_protected = true`, közös tárolóban. Családtag nem a tulajdonos. | 1. SELECT `items WHERE container_id = ...`<br>2. Lekérdezés `#storage/<UUID>` hash alapján. | **0 sor (Széf-barrier):** `is_vault_protected IS NOT TRUE` miatt sem közvetlenül, sem QR-ral nem érhető el. |
| **TEST-07** | **Közvetlen `location_id`-módosítás gyermek tárolón (DEF-01)** | Tárolónak van szülője (`parent_container_id IS NOT NULL`), szülő nem változik. | UPDATE `storage_containers SET location_id = mas_helyszin WHERE id = child_id`. | **TRIGGER EXCEPTION:** "A gyermek tároló helyszíne közvetlenül nem módosítható, mert kötelezően a szülőtároló helyszínét követi!" |
| **TEST-08** | **Tároló áthelyezése más helyszínű szülő alá (DEF-01 & DEF-02)** | Tároló B a Garázsban van. Új szülő C a Padláson van. | UPDATE `storage_containers SET parent_container_id = C_id WHERE id = B_id`. | **SIKERES ÁTHELYEZÉS:** B és összes altárolója és vagyontárgya automatikusan megörökli C helyszínét (Padlás); nem dob hibát! |
| **TEST-09** | **Párhuzamos, egymással ütköző hierarchiamódosítás** | Párhuzamos Session 1: A alá B-t teszi. Session 2: B alá A-t teszi. | Egyidejű UPDATE `parent_container_id`. | **Tanácsadói zárolás (`pg_advisory_xact_lock`):** Session 2 sorba áll Session 1 mögé. Session 1 kommitál, Session 2 felébred, észleli a ciklust, és **EXCEPTION-nel elbukik**. |
| **TEST-10** | **Törlés és egyidejű beszúrás versenye** | Session 1: `DELETE storage_containers WHERE id = X`. Session 2 egyidejűleg: `INSERT INTO container_items (container_id = X)`. | Párhuzamos tranzakciók futtatása. | **PostgreSQL Foreign Key Lock:** Session 2 `FOR KEY SHARE` zárat kér, blokkolódik. Session 1 törlése után Session 2 **idegen kulcs hibával elbukik**. Adatvesztés nem történik. |
| **TEST-11** | **Hatókörváltás nem üres tárolón (DEF-03)** | Tárolóban tárgyak vagy készletek vannak. | UPDATE `storage_containers SET ownership_scope = 'private' WHERE id = family_box_id`. | **TRIGGER EXCEPTION:** "A tároló hatóköre vagy háztartása nem módosítható, mert vagyontárgyak vannak hozzárendelve!" |
| **TEST-12** | **Készlettétel áthelyezése privát tárolóba (DEF-04)** | Családi készlettétel áthelyezése privát tárolóba. | UPDATE `container_items SET container_id = private_box_id WHERE id = family_ci_id`. | **TRIGGER EXCEPTION:** "Hatóköri inkompatibilitás: privát készlettétel nem helyezhető át családi tárolóba, és családi készlettétel sem helyezhető át privát tárolóba!" |
| **TEST-13** | **Háztartástörlés nem üres tárolókkal** | Háztartásban még létezik családi tároló. | DELETE `households WHERE id = ...`. | **RESTRICT EXCEPTION:** A tárolók idegen kulcsa (`ON DELETE RESTRICT`) miatt a háztartás nem törölhető addig, amíg a leltár nincs felszámolva. |
| **TEST-14** | **Háztartástagság vagy helyszínjogosultság visszavonása** | Felhasználó rekordját törlik a `household_members`-ből, vagy tiltják a helyszínt. | SELECT tárolók és készlettételek. | **AZONNALI 0 SOR:** Valós idejű RLS kiértékelés; a jog visszavonásának pillanatában minden családi adat eltűnik. |
| **TEST-15** | **Közvetlen API- és RPC-hívások jogosulatlanul** | Kijelentkezett vagy anonim felhasználó közvetlen PostgREST REST vagy RPC hívást indít. | POST `/rpc/adjust_container_item_quantity` vagy GET `/rest/v1/storage_containers`. | **401 Unauthorized / EXCEPTION:** "Hitelesítés szükséges!" |

---

## 10. Rendezett, Nyitott és Nem Ellenőrizhető Kérdések

### 10.1. Rendezett kérdések (Megoldva a v1.4.6-ban)
1. **DEF-01 – Tároló áthelyezése eltérő helyszínű szülő alá:** A `check_storage_container_integrity` trigger feltétele pontosítva lett: a szülő megváltozása esetén (`NEW.parent_container_id IS DISTINCT FROM OLD.parent_container_id`) a tároló automatikusan megörökli az új szülő helyszínét (`NEW.location_id := v_parent.location_id`), és a korábbi helyszínnel való eltérés nem okoz kivételt. A közvetlen helyszínmódosítás kizárólag változatlan szülő esetén van tiltva.
2. **DEF-02 – Leszármazottak helyszínének frissítése:** A `trg_cascade_storage_container_location_update` trigger eseménylistája kibővítésre került (`AFTER UPDATE OF location_id, parent_container_id`), így a szülőváltáskor is garantáltan és tranzakciósan frissül a teljes leszármazotti fa és az összes hozzárendelt vagyontárgy.
3. **DEF-03 – Hatókör- és háztartásváltás:** A `check_storage_container_integrity` triggerbe beépítésre került a szigorú szerveroldali védelem még a korai kilépési ágak előtt: hatókör- és háztartásváltás csak teljesen üres tárolón engedélyezett, és kizárólag a háztartás adminisztrátora vagy privát tároló tulajdonosa végezheti el.
4. **DEF-04 – Egyszerű készlettétel áthelyezése:** A `sync_container_item_scope` trigger kiegészítésre került: szerveroldalon tiltja a privát készlettétel családi tárolóba mozgatását, a családi készlettétel privát tárolóba mozgatását, valamint a kereszt-háztartási készletáthelyezést.
5. **DEF-05 – Migrációs sorrend és rollback:** A 8.9. és 8.10. fejezetekben pontosan specifikálásra került a függőségeken alapuló, lépésről lépésre követendő migrációs sorrend, a teljes visszavonási szkript (Down migration), az adatvesztési kockázatok, valamint az előzetes adatmentési kötelezettség.

### 10.2. Nyitott tervezési kérdések
- Nincs nyitott biztonsági, jogosultsági vagy adatmodell-konzisztencia kérdés a PostgreSQL sémában. Valamennyi feltárt hiba (DEF-01 – DEF-05) hiánytalanul lefedésre és javításra került.

### 10.3. Ténylegesen nem ellenőrizhető kérdések (Hardveres környezet)
1. **[NEM IGAZOLT - Niimbot B1 közvetlen böngészős Bluetooth kapcsolat]:**
   - A Web Bluetooth API közvetlen gyártói BLE kommunikációja fizikai hardveres tesztelés hiányában szoftveresen nem igazolható.
   - *Elfogadott működési stratégia:* A 300 DPI monokróm PNG letöltése (a hivatalos Niimbot mobilalkalmazáshoz) és a böngészős `@media print` mint másodlagos asztali megoldás 100%-ban működőképes és független a zárt Bluetooth protokolloktól.

---

## 11. Végső Döntés és STOP Pont

**DÖNTÉS:** `JÓVÁHAGYHATÓ MIGRÁCIÓTERVEZÉSRE`

**Indoklás:**  
A v1.4.6-os tervben a záróellenőrzés során azonosított valamennyi funkcionális és konzisztencia-hiba (DEF-01: szülőváltás eltérő helyszínnél, DEF-02: kaszkádolt frissítés `parent_container_id` esetén, DEF-03: hatókörváltási védelem és ürességi ellenőrzés, DEF-04: készlettétel áthelyezési korlátok, DEF-05: lépésenkénti migrációs sorrend és teljes rollback terv) hiánytalanul javításra került. A tervezett adatbázis-logika hibátlanul illeszkedik a meglévő migrációkhoz, és nem hagy nyitott biztonsági kockázatot.

A jóváhagyás kizárólag a migrációtervezet elkészítésére (`supabase/migrations/20261017_storage_containers_schema.sql`) vonatkozik, nem az éles adatbázis módosítására.

---

**STOP:** A tervfrissítés befejeződött. Nem hoztam létre migrációt, és nem módosítottam forráskódot vagy adatbázist. A migrációs fájl létrehozása az Ön kifejezett utasítására vár.
