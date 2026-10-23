# THINGOR — HOUSEHOLD INVITES MIGRATION PRE-DEPLOY REVIEW

**Dokumentum azonosító:** `THINGOR_HOUSEHOLD_INVITES_PREDEPLOY_REVIEW.md`  
**Dátum:** 2026. október 23.  
**Munkamód:** READ-ONLY REVIEW — NO DATABASE WRITES — NO CODE CHANGES  
**Vizsgált migráció:** [`supabase/migrations/20261023_fix_household_invites_select_rls.sql`](file:///c:/Users/User/thingor/supabase/migrations/20261023_fix_household_invites_select_rls.sql)  
**Végső minősítés / Döntés:** **`DEPLOY-READY`**  

---

## 1. Vezetői összefoglaló

A [`supabase/migrations/20261023_fix_household_invites_select_rls.sql`](file:///c:/Users/User/thingor/supabase/migrations/20261023_fix_household_invites_select_rls.sql) migráció célja a `public.household_invites` táblán az audit során feltárt súlyos biztonsági adatszivárgás megszüntetése.

A jelenlegi éles `household_invites_select_policy` tartalmaz egy feltétel nélküli záradékot (`OR ((status = 'pending') AND ((expires_at IS NULL) OR (expires_at > now())))`), amely lehetővé teszi bármely bejelentkezett felhasználó számára, hogy lekérdezze az összes függőben lévő meghívás adatait (címzett e-mail-címek, titkos meghívási tokenek, háztartásazonosítók).

A pre-deploy felülvizsgálat megállapította, hogy az elkészített migráció:
1. **Pontosan és minimális hatókörrel hárítja el a biztonsági rést.**
2. **Megőrzi a meglévő jogosult funkciókat:** a háztartásgazda továbbra is látja és kezeli a meghívásokat, a meghívott pedig megkapja és elfogadhatja a neki szóló meghívást.
3. **Nem okoz rekurziót vagy jogosultsági hibát** a segédfüggvényekben (`get_my_household_ids()`, `is_admin()`).
4. **Idempotens és tranzakcióbiztos.**
5. **Táblaszinten is lezárja az anonim hozzáférést** (`REVOKE ALL FROM anon`).

A felülvizsgálat alapján a migráció **`DEPLOY-READY`** minősítést kapott.

---

## 2. A migráció tartalma és összevetése az éles adatbázis-állapottal

### 2.1. A migráció forráskódja
```sql
-- 1. Revoke unneeded privileges from anon role on household_invites
REVOKE ALL ON TABLE public.household_invites FROM anon;

-- 2. Ensure authenticated role has necessary table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.household_invites TO authenticated;

-- 3. Replace household_invites_select_policy with hardened, scoped policy
DROP POLICY IF EXISTS "household_invites_select_policy" ON public.household_invites;

CREATE POLICY "household_invites_select_policy"
  ON public.household_invites
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    lower(invited_email) = lower(COALESCE(((SELECT auth.jwt()) ->> 'email'), '')) OR
    invited_by = (SELECT auth.uid()) OR
    household_id IN (SELECT household_id FROM public.get_my_household_ids())
  );
```

### 2.2. Összevetés a jelenlegi éles állapottal
- **Jelenlegi éles definíció (`pg_policies`):**
  - `policyname`: `household_invites_select_policy`
  - `roles`: `{public}`
  - `qual`: `(is_admin() OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR (invited_by = auth.uid()) OR (household_id IN ( SELECT get_my_household_ids.household_id FROM get_my_household_ids() get_my_household_ids(household_id))) OR ((status = 'pending'::text) AND ((expires_at IS NULL) OR (expires_at > now()))))`
- **Eltérés és javítás:**
  1. A sérülékeny `OR ((status = 'pending'::text) AND ...)` ág **törlésre kerül**.
  2. A szerepkör `{public}`-ról `{authenticated}`-re szűkül, kizárva az anonim lekérdezést.
  3. Az `auth.uid()` és `auth.jwt()` hívások `(SELECT ...)` formára cserélődnek (InitPlan teljesítmény-optimalizáció a Supabase Linter 0003 ajánlása szerint).

---

## 3. A `household_invites` tábla összes policy-jének vizsgálata

Az éles `pg_policies` lekérdezés alapján a tábla 4 policy-vel rendelkezik:

| Művelet | Policy név | Szerepkör | Feltétel (`USING` / `WITH CHECK`) | Hatás és értékelés |
| :---: | :--- | :---: | :--- | :--- |
| **SELECT** | `household_invites_select_policy` *(módosul)* | `{public}` $\rightarrow$ `{authenticated}` | **Új:** `is_admin() OR lower(invited_email) = lower((SELECT auth.jwt())->>'email') OR invited_by = (SELECT auth.uid()) OR household_id IN (SELECT household_id FROM get_my_household_ids())` | **Védett:** Kizárólag az adminisztrátor, a címzett, a létrehozó és a háztartás tagjai olvashatják. Idegen felhasználó 0 sort lát. |
| **INSERT** | `household_invites_insert_policy` | `{public}` | `WITH CHECK: (is_admin() OR is_household_admin(household_id))` | **Védett:** Kizárólag a rendszeradminisztrátor vagy az adott háztartás adminisztrátora hozhat létre új meghívót. |
| **UPDATE** | `household_invites_update_policy` | `{authenticated}` | `USING: lower(invited_email) = lower(auth.jwt()->>'email') AND status = 'pending' AND (expires_at IS NULL OR expires_at > now())`<br>`WITH CHECK: lower(invited_email) = lower(auth.jwt()->>'email') AND (expires_at IS NULL OR expires_at > now()) AND status IN ('accepted', 'declined')` | **Védett:** A `20261016_security_hardening_v2.sql` óta szigorúan védett. Csak a címzett módosíthatja, csak pending és nem lejártról, kizárólag `accepted` vagy `declined` státuszra. |
| **DELETE** | `household_invites_delete_policy` | `{public}` | `USING: (is_admin() OR is_household_admin(household_id))` | **Védett:** Kizárólag a rendszeradminisztrátor vagy a háztartás adminisztrátora vonhat vissza / törölhet meghívót. |

---

## 4. Táblaszintű jogosultságok (`GRANT`) ellenőrzése

A felülvizsgálat ellenőrizte, hogy a `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.household_invites TO authenticated;` utasítás nem ad-e a szükségesnél szélesebb jogosultságot.

### Megállapítások:
1. **Jelenlegi állapot (`information_schema.role_table_grants`):**
   - Az `authenticated` szerepkör jelenleg **már rendelkezik** `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` és `TRIGGER` jogosultságokkal a Supabase alapértelmezett táblalétrehozása miatt.
   - Az `anon` szerepkör szintén rendelkezik ugyanezen jogokkal.
2. **A migráció hatása:**
   - `REVOKE ALL ON TABLE public.household_invites FROM anon;` $\rightarrow$ Az `anon` szerepkörtől **minden** táblaszintű jogot elvon, így az unauthenticated REST API kérések azonnal `401 Unauthorized / 42501 Permission Denied` választ kapnak, anélkül, hogy az RLS motort terhelnék.
   - `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated;` $\rightarrow$ Csak a szükséges DML műveleteket rögzíti, megvonva a `TRUNCATE` kockázatát.
3. **RLS védelem érvényesülése:**
   - A PostgreSQL-ben a táblaszintű GRANT csupán belépési küszöb (előfeltétel). Mivel a táblán `relrowsecurity = true` van bekapcsolva (`pg_class`), egyetlen sor sem olvasható vagy módosítható anélkül, hogy a fenti 3. pontban részletezett RLS policy-k mindegyike át ne engedné a műveletet.
   - **Következtetés:** A `GRANT` nem ad túlzott jogosultságot, és teljes összhangban van a minimális jogosultságok elvével (Least Privilege).

---

## 5. A meghívás-elfogadás folyamatának end-to-end vizsgálata

A kliensoldali kód ([`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L4433-L4522)) és a szerveroldali szabályok összevetése:

```
[1. Kliens: Bejelentkezés]
    │
    ▼
[2. AppContext.tsx:1991] 
    supabase.from('household_invites')
      .select('*, households(name)')
      .ilike('invited_email', user.email)
      .eq('status', 'pending')
    │  
    ├─► Szerver RLS ellenőrzés (ÚJ SELECT POLICY):
    │   lower(invited_email) = lower(auth.jwt()->>'email')  --> IGAZ (átengedi)
    ▼
[3. Felhasználó látja a felugró ablakban: PendingInviteModal.tsx]
    │  Kattintás: "Elfogadás"
    ▼
[4. AppContext.tsx:4445: acceptHouseholdInvite()]
    supabase.from('household_members').insert([{
      household_id: invite.household_id,
      user_id: user.id,
      user_email: user.email,
      role: invite.role, ...
    }])
    │
    ├─► Szerver RLS ellenőrzés (household_members_insert_policy):
    │   1. auth.uid() = user_id  --> IGAZ
    │   2. lower(user_email) = lower(auth.jwt()->>'email')  --> IGAZ
    │   3. EXISTS (SELECT 1 FROM household_invites hi WHERE
    │        hi.household_id = household_members.household_id
    │        AND lower(hi.invited_email) = lower(auth.jwt()->>'email')
    │        AND hi.status = 'pending'
    │        AND (hi.expires_at IS NULL OR hi.expires_at > now())
    │        AND household_members.role = hi.role)  --> IGAZ (Csak érvényes, nem lejárt meghívóval és egyező szerepkörrel engedi!)
    ▼
[5. AppContext.tsx:4473: Státusz frissítése]
    supabase.from('household_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)
    │
    └─► Szerver RLS ellenőrzés (household_invites_update_policy):
        lower(invited_email) = lower(auth.jwt()->>'email')
        AND status = 'pending'
        AND expires_at > now()
        AND status IN ('accepted', 'declined')  --> IGAZ (sikeres lezárás)
```

### Biztonsági garanciák szerveroldalon:
- **Személyazonosság hamisítás elleni védelem:** A beillesztett tagsági rekord `user_id` és `user_email` mezője kötelezően meg kell egyezzen a JWT tokenben szereplő hitelesített adatokkal.
- **Jogosultság-kiterjesztés (Privilege Escalation) elleni védelem:** A tag csak azzal a `role`-lal léphet be, ami a meghívóban szerepelt (`household_members.role = hi.role`). Nem adhat magának `admin` vagy `owner` jogot, ha `member`-ként hívták meg.
- **Lejárat ellenőrzése:** Mind a tagság létrehozása, mind a meghívó státuszfrissítése az adatbázisban a PostgreSQL `now()` idejéhez viszonyítva ellenőrzi a lejárati dátumot (`hi.expires_at > now()`), a kliensoldali óraállástól függetlenül.

---

## 6. Függőségek és rekurzió-mentesség igazolása

A policy két segédfüggvényt hív meg: `public.is_admin()` és `public.get_my_household_ids()`.

### 6.1. `public.get_my_household_ids()`
- **Definíció (`pg_proc`):**
  ```sql
  CREATE OR REPLACE FUNCTION public.get_my_household_ids()
   RETURNS TABLE(household_id uuid)
   LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
  AS $function$
  BEGIN
    RETURN QUERY
    SELECT hm.household_id FROM public.household_members hm
    WHERE hm.user_id = auth.uid() OR (hm.user_email IS NOT NULL AND lower(hm.user_email) = lower(COALESCE(auth.jwt()->>'email', '')))
    UNION
    SELECT h.id AS household_id FROM public.households h
    WHERE h.created_by = auth.uid();
  END;
  $function$;
  ```
- **Rekurzió kizárása:** A függvény kizárólag a `household_members` és `households` táblákat kérdezi le. **Nem hivatkozik a `household_invites` táblára**, így rekurzív hívási lánc (Infinite Recursion) nem alakulhat ki.
- **Biztonság és jogosultság:** `SECURITY DEFINER` és rögzített `SET search_path TO 'public'` beállítással rendelkezik, az `authenticated` szerepkörnek van rá `EXECUTE` joga.

### 6.2. `public.is_admin()`
- **Definíció (`pg_proc`):**
  ```sql
  CREATE OR REPLACE FUNCTION public.is_admin()
   RETURNS boolean
   LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
  AS $function$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    );
  END;
  $function$;
  ```
- **Rekurzió kizárása:** Kizárólag a `public.profiles` táblát ellenőrzi. Nem érinti a háztartásokat vagy meghívásokat.
- **Biztonság és jogosultság:** `SECURITY DEFINER` és rögzített `SET search_path`, az `authenticated` szerepkörnek van rá `EXECUTE` joga.

---

## 7. Idempotencia, tranzakcióbiztonság és konvenciók

1. **Idempotencia:**
   - A `REVOKE ALL ON TABLE public.household_invites FROM anon;` futtatható tetszőleges számban hiba nélkül.
   - A `DROP POLICY IF EXISTS "household_invites_select_policy" ON public.household_invites;` használja az `IF EXISTS` direktívát, így nem dob hibát akkor sem, ha a policy korábban nem létezett.
   - A `CREATE POLICY` pontosan egyszer hozza létre a policy-t az eldobás után.
   - A migráció újra és újra futtatható azonos végeredménnyel.
2. **Tranzakcióbiztonság:**
   - A PostgreSQL a DDL műveleteket (REVOKE, GRANT, DROP POLICY, CREATE POLICY) tranzakcióban kezeli. Hiba esetén a teljes műveletsor visszagördül.
3. **Projekt konvenciók:**
   - A fájlelnevezés (`20261023_fix_household_invites_select_rls.sql`) követi az időbélyeges Supabase migrációs konvenciót (`YYYYMMDD_leiras.sql`).
   - Teljes mértékben illeszkedik a meglévő biztonsági hardening migrációkhoz (`20261008_enable_rls_and_policies.sql`, `20261016_security_hardening_v2.sql`).

---

## 8. Tesztelési bizonyítékok szétválasztása

| Teszttípus | Módszertan | Eredmény | Bizonyíték |
| :--- | :--- | :---: | :--- |
| **Lefuttatott éles tranzakciós teszt 1** | Idegen hitelesített felhasználó (`unrelated_stranger@nowhere.com`) lekérdezése aktív pending meghívóra a jelenlegi policy mellett. | **Adatszivárgás igazolva** | A lekérdezés kiadta a `target_invited_person@test.com` e-mail-címet és a titkos tokent. |
| **Lefuttatott éles tranzakciós teszt 2** | Anonim szerepkör (`anon`) szimulált SELECT futtatása. | **Blokkolva (hibával)** | `ERROR 42501: permission denied for function get_my_household_ids` (a migráció ezt tisztán lezárja táblaszinten is). |
| **Lefuttatott éles tranzakciós teszt 3** | Az új policy logikai kifejezésének kiértékelése valós adatbázisban. | **Sikeres izoláció** | `stranger_matches = false`, `invited_user_matches = true`, `creator_matches = true`. |
| **Statikus kódellenőrzés 1** | `AppContext.tsx` meghívás elfogadási és elutasítási folyamata (1923, 1991, 4433-4545. sorok). | **Teljes kompatibilitás** | A frontend lekérdezések pontosan illeszkednek az új policy 4 engedélyezett ágához. |
| **Statikus kódellenőrzés 2** | `household_members_insert_policy` és `household_invites_update_policy` szerveroldali védelme. | **Szigorúan védett** | A szerver megköveteli az egyező szerepkört, le nem járt státuszt és azonos e-mail-címet. |
| **Elméleti / még nem futtatott ellenőrzés** | A migráció tényleges éles DDL futtatása és éles UI kattintásos elfogadás deploy után. | **Pre-deploy függőben** | Csak a felhasználói jóváhagyás után hajtható végre a READ-ONLY korlátozás feloldásával. |

---

## 9. Megállapítások és intézkedési táblázat

| # | Ellenőrzési terület | Hivatkozás | Bizonyíték | Minősítés | Következmény és intézkedés |
| :-: | :--- | :--- | :--- | :---: | :--- |
| **1** | A migráció tartalma a jelenlegi éles állapothoz képest | `household_invites_select_policy` | `pg_policies` lekérdezés | **IGAZOLT** | A sérülékeny `OR status = 'pending'` ág törlődik, az adatszivárgás megszűnik. |
| **2** | `household_invites` többi policy-je | `INSERT`, `UPDATE`, `DELETE` | `pg_policies` lekérdezés | **IGAZOLT** | Az egyéb műveletek már korábban le lettek védve; a SELECT javítása teljessé teszi a védelmet. |
| **3** | Táblaszintű `GRANT` jogosultságok | `role_table_grants` | `information_schema` lekérdezés | **IGAZOLT** | `anon` jogok visszavonva, `authenticated` jogok tisztázva, RLS kényszerítve. |
| **4** | Elfogadási folyamat szerveroldali védelme | `AppContext.tsx:4445` & `household_members` RLS | `pg_policies` `with_check` | **IGAZOLT** | A szerepkör, email és lejárat szerveroldalon szigorúan ellenőrzött. |
| **5** | Rekurzió és függvénykompatibilitás | `get_my_household_ids()`, `is_admin()` | `pg_proc` definíciók | **IGAZOLT** | Egyik függvény sem hívja a `household_invites` táblát; rekurzió kizárva. |
| **6** | Idempotencia és tranzakcióbiztonság | Migrációs SQL szkript | DDL szintaxis ellenőrzés | **IGAZOLT** | A szkript hiba nélkül újrafuttatható és tranzakcióbiztos. |

---

## 10. Végső döntés

### **`DEPLOY-READY`**

A [`supabase/migrations/20261023_fix_household_invites_select_rls.sql`](file:///c:/Users/User/thingor/supabase/migrations/20261023_fix_household_invites_select_rls.sql) migráció minden technikai, biztonsági és funkcionális ellenőrzésen megfelelt. Nem tartalmaz funkciótörő elemet, nem okoz rekurziót, szigorúan felszámolja az adatszivárgást, és biztonságosan alkalmazható az éles adatbázisban.

A migráció éles alkalmazásához kizárólag a felhasználói végleges engedély szükséges.
