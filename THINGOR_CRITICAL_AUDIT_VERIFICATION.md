# THINGOR — KRITIKUS AUDITMEGÁLLAPÍTÁSOK ELLENŐRZÉSE

**Dátum:** 2026. október 23.  
**Munkamód:** READ-ONLY / NO PATCH / NO DATABASE WRITES / NO DEPLOY  
**Vizsgált audit dokumentum:** `THINGOR_COMMUNITY_SCALABILITY_AUDIT.md` (2026-10-23)  
**Dokumentum azonosító:** `THINGOR_CRITICAL_AUDIT_VERIFICATION.md`  

---

## 1. Vizsgálati környezet, időpont és hozzáférési korlátok

A vizsgálat célja a 2026. október 23-án készült átfogó audit kritikus megállapításainak szigorú, tényeken és bizonyítékokon alapuló felülvizsgálata volt.

### Vizsgált rendszerelemek:
1. **Éles PostgreSQL adatbázis metaadatok (Supabase):** `pg_policies`, `information_schema.columns`, `information_schema.role_table_grants`, `information_schema.referential_constraints`, `pg_indexes`, `pg_extension`, `pg_proc`.
2. **Supabase Linter / Advisors:** Hivatalos biztonsági (`security`) és teljesítménybeli (`performance`) linter futási eredmények (időbélyeg: `2026-10-23T07:51:02.926Z` és `2026-10-23T07:55:40.433Z`).
3. **Alkalmazáskód (TypeScript / React):** [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx), [`src/components/ItemsView.tsx`](file:///c:/Users/User/thingor/src/components/ItemsView.tsx), [`src/lib/storage.ts`](file:///c:/Users/User/thingor/src/lib/storage.ts), [`src/lib/r2.ts`](file:///c:/Users/User/thingor/src/lib/r2.ts).
4. **Edge Function forráskódok és logok:** [`supabase/functions/process-notifications/index.ts`](file:///c:/Users/User/thingor/supabase/functions/process-notifications/index.ts), [`supabase/functions/storage-r2/index.ts`](file:///c:/Users/User/thingor/supabase/functions/storage-r2/index.ts), Supabase `function_logs` és `edge_logs`.

### Hozzáférési korlátok és megjegyzések:
- **Terheléses mérések hiánya:** Nem áll rendelkezésre szintetikus terhelési teszt (pl. k6, Locust, Artillery), sem `EXPLAIN (ANALYZE, BUFFERS)` benchmark nagyméretű (10 000+ soros) adathalmazon, mivel az éles adatbázis jelenleg mindössze 51 tárgyrekordot tartalmaz.
- **READ-ONLY fegyelem:** Semmilyen forráskód, SQL tábla, jogosultság, migráció vagy storage konfiguráció nem módosult.

---

## 2. Vezetői összefoglaló

A felülvizsgálat megállapította, hogy az előző audit megállapításainak döntő többsége architekturálisan és forráskód-szinten megalapozott, azonban **több ponton a kockázat mértéke vagy a lassulás jellege túlzó, spekulatív megfogalmazást kapott**, mérések hiányában.

### A felülvizsgálat legfontosabb eredményei:
1. **Valós, igazolt biztonsági rés (HIGH):** A `household_invites_select_policy` valóban tartalmaz egy feltétel nélküli `OR (status = 'pending' AND ...)` ágat, amellyel **bármely felhasználó (akár anonim módon is) lekérdezheti a rendszer összes függő meghívójának adatait** (e-mail címek, tokenek, háztartási azonosítók).
2. **Spekulatív teljesítményállítások elutasítása:** Az audit állítása, miszerint az `auth.uid()` használata „akár 100–500-szoros CPU-terhelést vagy exponenciális lassulást okoz”, **nem igazolt és elméletileg is pontatlan**. Bár a Supabase Linter ténylegesen 67 esetben javasolja a `(select auth.uid())` formát (InitPlan optimalizáció), a lassulás mértéke lineáris (O(N) vs O(1)), nem exponenciális, és nincs rá semmilyen mért adat.
3. **Árnyalt LocalStorage és lapozási helyzet:** Bár az `AppContext.tsx` valóban 12+ táblát kérdez le `select('*')`-tal, a legnagyobb tábla (`items`) a LocalStorage-ba mentés előtt **le van vágva 50 elemre** (`items.slice(0, 50)`), és el van látva `try/catch` hibakezeléssel. Ráadásul az `ItemsView.tsx` már tényleges szerveroldali lapozást (`.range(from, to)`) használ.
4. **Igazolt fióktörlési és árva adat kockázat (HIGH):** A `deleteAccount()` implementációja valóban hiányos: 8 adatbázistáblát nem töröl, az auth felhasználót nem törli (csak `signOut`), és a Cloudflare R2-ben lévő képeket/dokumentumokat sem takarítja el.
5. **Közösségi funkciók hiánya igazolt:** Nincs baráti/követési rendszer, profilkeresés, üzenetküldés vagy Realtime kapcsolat.

---

## 3. A kritikus megállapítások (A–I) tételes ellenőrzése

### A. Meghívási adatok jogosulatlan olvashatósága
- **Megállapítás:** A `household_invites_select_policy` olyan feltételt tartalmaz, amely a függőben lévő és még le nem járt meghívókat felhasználói jogosultsági szűrés nélkül is olvashatóvá teszi.
- **Minősítés:** `IGAZOLT`
- **Bizonyíték:**
  - Migrációs forrás: [`supabase/migrations/20261008_enable_rls_and_policies.sql`](file:///c:/Users/User/thingor/supabase/migrations/20261008_enable_rls_and_policies.sql#L193-L201) (193–201. sorok).
  - Aktuális éles adatbázis metaadat (`pg_policies` lekérdezés eredménye):
    ```sql
    -- policyname: household_invites_select_policy
    -- roles: {public}
    -- qual:
    (is_admin() OR 
     (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR 
     (invited_by = auth.uid()) OR 
     (household_id IN (SELECT get_my_household_ids.household_id FROM get_my_household_ids())) OR 
     ((status = 'pending'::text) AND ((expires_at IS NULL) OR (expires_at > now()))))
    ```
  - Táblajogosultságok (`information_schema.role_table_grants`): Az `anon` és `authenticated` szerepkörök mindegyike rendelkezik `SELECT` joggal a `household_invites` táblán.
  - Táblamezők (`information_schema.columns`): `id`, `household_id`, `invited_email`, `role`, `invited_by`, `token`, `status`, `created_at`, `expires_at`, `title`.
- **Tény:** A `roles: {public}` és az `OR ((status = 'pending') AND ((expires_at IS NULL) OR (expires_at > now())))` feltétel miatt bármely kliens (akár bejelentkezés nélkül, anonim kulccsal) futtathat egy egyszerű `supabase.from('household_invites').select('*')` lekérdezést, amely visszaadja az **összes függőben lévő meghívó e-mail címét, a titkos meghívási tokent és a háztartás ID-t**.
- **Feltételezés:** Nincs. A jogosultság és a lekérdezhetőség közvetlen adatbázis-szintű tény.
- **Hatás:** Súlyos személyes adat szivárgás (e-mail címek megismerése) és jogosulatlan háztartási belépés (a token birtokában bárki elfogadhatja a másnak küldött meghívást).
- **Súlyosság:** `HIGH`
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** Izolált tesztkörnyezetben tesztelni a javított feltételt (`lower(invited_email) = lower(auth.jwt()->>'email')`), kizárva a nyílt pending záradékot.

---

### B. Az `auth.uid()` használata és a teljesítményre vonatkozó állítások
- **Megállapítás:** A Supabase RLS-policyk közül 67 használja az `auth.uid()` függvényt a `(select auth.uid())` forma helyett, ami akár 100–500-szoros CPU-terhelést vagy exponenciális lassulást okozhat.
- **Minősítés:** `RÉSZBEN IGAZOLT`
- **Bizonyíték:**
  - Supabase Database Linter (`performance` kategória, ellenőrzési időbélyeg: `2026-10-23T07:51:02.926Z`):
    - Linter szabály: `auth_rls_initplan` (Level: `WARN`, Count: **67**).
    - Érintett táblák: `items`, `locations`, `categories`, `household_members`, `households`, `storage_containers`, `container_items`, `quick_notes`, `item_loans`, `lending_contacts`, `item_repairs`, `item_financings`, `item_documents`, `collections`, `collection_items`, `pantry_items`, `vault_settings`, `profiles`.
- **Tény:** Valóban pontosan 67 darab RLS policy létezik a projektben, amelyben a PostgreSQL nem InitPlan-ként (lekérdezésenként egyszer), hanem SubPlan-ként (soronként újra és újra kiértékelve) futtatja az `auth.uid()` függvényt.
- **Feltételezés / Téves megfogalmazás:**
  - **NINCS bizonyíték a „100–500-szoros CPU-terhelésre” és az „exponenciális lassulásra”.**
  - A soronkénti kiértékelés költsége **lineáris** ($O(N)$ az $O(1)$-gyel szemben), nem exponenciális ($O(2^N)$).
  - A jelenlegi 51 tételes adatbázison a különbség mikromásodpercekben mérhető, mérési adat vagy EXPLAIN benchmark nem készült.
- **Hatás:** Skálázódáskor (több tízezer sornál) megnövekedett lekérdezési idő és magasabb adatbázis CPU kihasználtság.
- **Súlyosság:** `MEDIUM` (Optimalizációs hiányosság, nem leállást okozó hiba).
- **Bizonyosság:** Magas (a policyk számát illetően) / Alacsony (a korábbi audit által becsült lassulási szorzót illetően).
- **Következő ellenőrzés:** 10 000 szintetikus rekord betöltése után `EXPLAIN (ANALYZE, BUFFERS)` futtatása az `items` lekérdezésen `auth.uid()` vs `(select auth.uid())` mellett.

---

### C. Tömeges adatbetöltés és LocalStorage
- **Megállapítás:** Az `AppContext.tsx` bejelentkezéskor 12 vagy több táblából tölt le adatokat, jellemzően `select('*')` használatával, lapozás nélkül, majd az adatokat LocalStorage-ban tárolja. Ez nagyobb adatmennyiségnél lassulást és `QuotaExceededError` hibát okozhat.
- **Minősítés:** `RÉSZBEN IGAZOLT`
- **Bizonyíték:**
  - Forrásfájl: [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1740-L2005) (1740–2005. sorok).
  - Lekérdezett táblák bejelentkezéskor:
    1. `categories` (`select('*')`)
    2. `locations` (`select('*')`)
    3. `items` (`select('*').order('created_at', ...)`)
    4. `item_documents` (`select('*')`)
    5. `item_repairs` (`select('*')`)
    6. `item_financings` (`select('*')`)
    7. `item_loans` (`select('*')`)
    8. `lending_contacts` (`select('*')`)
    9. `collections` (`select('*')`)
    10. `collection_items` (`select('*')`)
    11. `pantry_items` (`select('*')`)
    12. `storage_containers` (`select('*')`)
    13. `container_items` (`select('*')`)
    14. `household_members` (`select('*')`)
    15. `households` (`select('*')`)
    16. `household_invites` (`select('*')`)
    17. `item_relations` (`select('*')`)
    18. `quick_notes` (`select('*')`)
    19. `vault_settings` (`select('*')`)
  - LocalStorage mentés: [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1394-L1407) (1394–1407. sorok):
    ```ts
    const cacheItems = items.slice(0, 50);
    localStorage.setItem('thingor_items', JSON.stringify(cacheItems));
    localStorage.setItem('thingor_items_backup', JSON.stringify(cacheItems));
    ```
    és a `try/catch` blokk: `catch { console.warn('LocalStorage quota limit reached, skipping full item serialization'); }`.
  - Szerveroldali lapozás: [`src/components/ItemsView.tsx`](file:///c:/Users/User/thingor/src/components/ItemsView.tsx#L196-L201) (196–201. sorok): `.range(from, to)` használatával lapoz.
- **Tény:** Az `AppContext.tsx` valóban 19 táblalekérdezést indít bejelentkezéskor `select('*')` használatával, lapozás nélkül a React memóriába töltve őket.
- **Pontosítás / Nem igazolt elem a korábbi auditból:**
  - A korábbi audit állítása, miszerint „a teljes tárgylista LocalStorage-be mentése miatt azonnal QuotaExceededError lép fel”, **nem felel meg a valóságnak**.
  - A kód **kifejezetten csak az első 50 elemet menti** (`items.slice(0, 50)`), és el van látva kvóta-hibakezelő `catch` ággal.
  - Ugyanakkor a többi entitás (pl. `documents`, `collections`, `locations`) nincs szeletelve és nincs `try/catch` védelme a mentésnél, ami elméletileg kvótatúllépést okozhat, ha ezek száma több ezerre nőne.
- **Hatás:** Lassabb kezdeti betöltési idő bejelentkezéskor gyengébb hálózaton; felesleges adatforgalom a háttérben nem használt moduloknál.
- **Súlyosság:** `MEDIUM`
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** Bejelentkezési hálózati waterfall mérése Chrome DevTools Network fülön staging környezetben.

---

### D. A `process-notifications` Edge Function skálázhatósága
- **Megállapítás:** A `process-notifications` függvény az összes olyan tárgyat lekérdezi, amelynek nem üres a garanciahatárideje, lapozás nélkül, majd sorban hajtja végre az upsert műveleteket. Ez időtúllépéshez vezethet.
- **Minősítés:** `IGAZOLT` (Architekturális szűk keresztmetszetként igazolt, éles hiba nélkül)
- **Bizonyíték:**
  - Forrásfájl: [`supabase/functions/process-notifications/index.ts`](file:///c:/Users/User/thingor/supabase/functions/process-notifications/index.ts#L82-L135) (82–135. sorok).
  - Lekérdezés: `supabase.from("items").select("id, user_id, name, warranty_end").not("warranty_end", "is", null);` (nincs limit, nincs dátumszűrés, nincs lapozás).
  - Végrehajtási ciklus: Szekvenciális `for (const item of items)` ciklus, és minden lejáró tételnél külön `await supabase.from("notifications").upsert(...)` fut le.
  - Ugyanez a minta ismétlődik az `item_financings` táblánál (138–189. sorok).
  - Idempotencia: A kód biztosítja az idempotenciát (`dedup_key: dedupKey`, `onConflict: "user_id,dedup_key", ignoreDuplicates: true`).
  - Éles logok (`function_logs` ClickHouse lekérdezés): A függvény az elmúlt napokban normál állapotban futott le, timeout hiba nem szerepel a naplóban.
- **Tény:** A kód valóban a memóriába tölti az összes nem üres garanciájú tárgyat a teljes adatbázisból, és szekvenciális HTTP hívásokkal végzi az upsert műveleteket.
- **Feltételezés:** A jelenlegi alacsony tételszámnál még nem lép fel timeout. A Supabase Edge Function 150 másodperces wall-clock limitje és a CPU limitek csak akkor jelentenek valós leállást, ha a lejáró tételek száma meghaladja a több százas/ezres nagyságrendet.
- **Hatás:** Nagyobb adatbázisnál a cron feladat futása időtúllépéssel leállhat, így az értesítések egy része nem generálódik le.
- **Súlyosság:** `MEDIUM`
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** Staging környezetben 5 000 lejáró garanciás tétellel futtatni a függvényt és mérni a futásidőt.

---

### E. Hiányzó indexek és keresési teljesítmény
- **Megállapítás:** Hiányzik a `created_at` mezőre vonatkozó index az elemek rendezéséhez; hiányzik a `pg_trgm` alapú GIN-index a `%token%` típusú `ILIKE` keresésekhez.
- **Minősítés:** `IGAZOLT` (Az indexhiány ténye igazolt; a lassulás mértéke mérést igényel)
- **Bizonyíték:**
  - Aktuális éles adatbázis indexek (`pg_indexes` lekérdezés a `public.items` táblára):
    1. `items_pkey` (btree `id`)
    2. `idx_items_user_id` (btree `user_id`)
    3. `idx_items_household_id` (btree `household_id`)
    4. `idx_items_location_id` (btree `location_id`)
    5. `idx_items_category_id` (btree `category_id`)
    6. `idx_items_vault_protected` (btree `is_vault_protected` WHERE `is_vault_protected = true`)
    7. `idx_items_container_id` (btree `container_id` WHERE `container_id IS NOT NULL`)
  - Bővítmények (`pg_extension` lekérdezés): A `pg_trgm` bővítmény **nincs telepítve**.
  - Keresési szintaxis a frontendben: [`src/components/ItemsView.tsx`](file:///c:/Users/User/thingor/src/components/ItemsView.tsx#L164) (164. sor): `name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`.
  - Rendezés: [`src/components/ItemsView.tsx`](file:///c:/Users/User/thingor/src/components/ItemsView.tsx#L184) és [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1776): `order('created_at', { ascending: false })`.
- **Tény:** Az `items.created_at` mezőn valóban **nincs index**, holott a rendszer alapértelmezetten ezen mező szerint rendezi a találatokat. A `pg_trgm` bővítmény hiányában a kétoldali jokerkarakteres (`%text%`) `ILIKE` keresések minden esetben teljes táblás szekvenciális vizsgálatot (`Seq Scan`) végeznek.
- **Feltételezés:** A jelenlegi 51 soros tételszámnál a PostgreSQL optimalizáló index mellett is Seq Scant választana az alacsony költség miatt. A lassulás csak többezer tételnél válik érzékelhetővé.
- **Hatás:** Skálázódáskor a szabadszavas keresés és a lapozás egyre nagyobb I/O és CPU terhelést ró az adatbázisra.
- **Súlyosság:** `MEDIUM`
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** 50 000 tétel betöltése után `EXPLAIN ANALYZE` futtatása keresésre és lapozásra.

---

### F. Fióktörlés és árva adatok
- **Megállapítás:** A `deleteAccount()` csak néhány adatkészletet töröl, ezért adatbázisrekordok és R2-fájlok maradhatnak vissza.
- **Minősítés:** `IGAZOLT`
- **Bizonyíték:**
  - Forráskód: [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L2330-L2344) (2330–2344. sorok):
    ```ts
    const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) return { success: false, error: 'No user session' };

      if (isSupabaseConfigured && supabase) {
        await supabase.from('item_documents').delete().eq('user_id', user.id);
        await supabase.from('items').delete().eq('user_id', user.id);
        await supabase.from('locations').delete().eq('user_id', user.id);
        await supabase.from('categories').delete().eq('user_id', user.id).eq('is_custom', true);
        await supabase.from('profiles').delete().eq('user_id', user.id);
        await supabase.auth.signOut();
      }

      logout();
      return { success: true };
    };
    ```
  - Idegenkulcs és kaszkádolt törlési szabályok (`information_schema.referential_constraints`):
    - Az `items` törlése kaszkádolva törli: `collection_items`, `item_documents`, `item_financings`, `item_loans`, `item_relations`, `item_repairs`, `item_shares`.
    - **NEM törlődnek (nincs rájuk cascade és a kód sem törli őket):**
      - `pantry_items` (önálló `user_id`-val rendelkezik, megmarad)
      - `collections` (megmarad)
      - `storage_containers` és `container_items` (megmaradnak, ráadásul `RESTRICT` szabály védi őket)
      - `quick_notes` (megmarad)
      - `lending_contacts` (megmarad)
      - `household_members` (a felhasználó tagsági sora megmarad a háztartásban)
      - `notifications` és `user_notification_settings` (megmaradnak)
    - **Auth felhasználó:** A kód csak `supabase.auth.signOut()`-ot hív, a felhasználó fiókja a `auth.users` belső táblában megmarad (nem törlődik).
    - **Cloudflare R2 fájlok:** A függvény nem hívja meg az R2 törlési végpontot, a felhasználó által feltöltött dokumentumok és képek fizikai fájljai véglegesen megmaradnak az R2 vödrökben.
- **Tény:** A fióktörlés után az adatbázisban több táblában árva rekordok, az R2-ben pedig árva bináris objektumok maradnak vissza, miközben az auth fiók sem szűnik meg.
- **Hatás:** GDPR megfelelési kockázat (a felhasználó törlési kérése ellenére adatai megmaradnak), felesleges tárhelyköltség.
- **Súlyosság:** `HIGH`
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** Egy biztonságos szerveroldali RPC függvény / Edge Function tervezése, amely service_role jogosultsággal minden entitást, R2 objektumot és az `auth.users` rekordot is törli tranzakcióban.

---

### G. Megosztott adatok gyorsítótára és jogosultság-visszavonás
- **Megállapítás:** A háztartási jogosultság visszavonása után a frontend gyorsítótárában korábban betöltött megosztott adatok maradhatnak, amíg a felhasználó nem frissíti az oldalt vagy nem zárja le a munkamenetet.
- **Minősítés:** `IGAZOLT`
- **Bizonyíték:**
  - Realtime feliratkozások hiánya: A teljes `src/` mappában **0 darab Supabase Realtime `.channel()` vagy feliratkozási hívás** található.
  - Állapotkezelés: A jogosultságokat és a megosztott adatokat a bejelentkezéskor tölti be az `AppContext.tsx`, és elhelyezi a React állapotban (`items`, `locations`, stb.) és a böngésző `localStorage`-ában.
- **Tény:** Ha a háztartás adminisztrátora kizárja a felhasználót vagy visszavonja egy modul/helyszín engedélyét:
  - A szerveroldali RLS azonnal blokkol minden új lekérdezést vagy írást.
  - A kliensoldalon viszont semmilyen push értesítés nem érkezik a jog visszavonásáról.
  - A felhasználó az aktív böngészőfülben mindaddig látja a korábban betöltött megosztott adatokat, amíg be nem zárja a lapot vagy nem frissít.
- **Hatás:** Kliensoldali adatelavulás. A szerver nem szivárogtat ki új adatot, de a meglévő munkamenetben a visszavont adat a képernyőn maradhat.
- **Súlyosság:** `LOW` (Tipikus SPA gyorsítótárazási jelenség, az RLS a szervert azonnal védi).
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** Supabase Realtime csatorna bevezetése a `household_members` változásainak figyelésére.

---

### H. Nyilvános fotó-URL-ek és a privát fájlok védelme
- **Megállapítás:** A fotók a nyilvános CDN-en keresztül hozzáférhetők lehetnek, ha az URL ismert; a privát dokumentumoknak ezzel szemben a védett R2-proxyn keresztül kell elérhetőnek lenniük.
- **Minősítés:** `IGAZOLT`
- **Bizonyíték:**
  - Forrásfájl: [`src/lib/r2.ts`](file:///c:/Users/User/thingor/src/lib/r2.ts#L227-L240) (227–240. sorok):
    ```ts
    // Photos: resolve directly via public CDN domain if configured and not already a full URL
    if (!isDocument && r2PublicDomain && !pathOrUrl.startsWith('http://') && !pathOrUrl.startsWith('https://')) {
      return `${r2PublicDomain}/${pathOrUrl}`;
    }
    ```
  - Dokumentumok védelme: [`src/lib/r2.ts`](file:///c:/Users/User/thingor/src/lib/r2.ts#L237-L260):
    A dokumentumok (`/documents/`) kivétel nélkül a `storage-r2` Edge Functionön keresztül futnak le, amely hitelesített pre-signed GET URL-t generál, miután ellenőrizte a felhasználó RLS jogosultságát (`checkItemDocumentAccess`) és a vault védettséget.
  - Dokumentum megnyitás a frontendben: Minden komponens ([`VaultView.tsx`](file:///c:/Users/User/thingor/src/components/VaultView.tsx#L629), [`ItemDetailModal.tsx`](file:///c:/Users/User/thingor/src/components/ItemDetailModal.tsx#L1412), [`DocumentsView.tsx`](file:///c:/Users/User/thingor/src/components/DocumentsView.tsx#L17)) az `openR2DocumentSecurely` függvényt használja, közvetlen `file_url` link nincs kikötve a DOM-ba.
- **Tény:** A képek valóban nyilvános CDN domainen keresztül töltődnek be, tokenes védelem nélkül (ha valaki ismeri a véletlenszerű fájlnevet és az elérési utat, letöltheti a képet). A dokumentumok viszont szigorúan védettek az Edge Function és pre-signed tokenek által.
- **Hatás:** Képek esetén az URL ismeretében illetéktelen megtekintés lehetséges (security by obscurity). Dokumentumoknál a védelem robusztus.
- **Súlyosság:** `INFORMATIONAL / LOW` (A tárgyfotók esetében a CDN gyorsítótárazás és költséghatékonyság miatt ez gyakori architektúra, de tudatosítani kell).
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** Dönteni, hogy a tárgyfotókhoz szükséges-e Cloudflare Token Authentication vagy Signed Cookie bevezetése.

---

### I. `search_path` a `prevent_household_role_escalation` függvénynél
- **Megállapítás:** A `public.prevent_household_role_escalation` adatbázisfüggvény nem rögzíti a `search_path` beállítást, ami biztonsági kockázatot okozhat.
- **Minősítés:** `RÉSZBEN IGAZOLT` (A hiány tény, de a kockázat jellege és súlyossága túlértékelt)
- **Bizonyíték:**
  - Supabase Security Linter: Szabály: `function_search_path_mutable` (Level: `WARN`).
  - Adatbázis függvénydefiníció (`pg_proc` lekérdezés):
    ```sql
    CREATE OR REPLACE FUNCTION public.prevent_household_role_escalation()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
    AS $function$
    BEGIN
      IF NOT (public.is_admin() OR public.is_household_admin(OLD.household_id)) THEN
        ...
      END IF;
      RETURN NEW;
    END;
    $function$
    ```
- **Tény:** A függvény valóban `SECURITY DEFINER` jogosultságú, és nem rendelkezik explicit `SET search_path = public, pg_temp` klauzulával.
- **Pontosítás / Nem igazolt kockázati elem:**
  - A függvény belsejében hívott más függvények (`public.is_admin()`, `public.is_household_admin()`) **kifejezetten sémával minősítettek** (`public.`).
  - A PostgreSQL-ben a `search_path` kihasználásához az attackernek objektumokat (táblát, operátort, függvényt) kellene tudnia létrehozni egy olyan sémában, amely megelőzi a `public`-ot a keresési útvonalon.
  - A Thingor normál webes felhasználói **nem rendelkeznek DDL (`CREATE`) jogosultsággal** az adatbázis sémáiban.
- **Hatás:** Best practice hiányosság és linter figyelmeztetés; közvetlen jogosultság-kiterjesztésre nem alkalmas normál körülmények között.
- **Súlyosság:** `LOW` (Nem CRITICAL vagy HIGH).
- **Bizonyosság:** Magas
- **Következő ellenőrzés:** A függvény kiegészítése `SET search_path = public, pg_temp` direktívával a következő karbantartási ablakban.

---

## 4. Közösségi és nagy felhasználószámra vonatkozó állítások ellenőrzése

### 4.1. Közösségi funkciók tényleges létezése

| Funkció | Korábbi állítás | Tényleges kód- és adatbázis-állapot | Minősítés |
| :--- | :--- | :--- | :---: |
| **Ismerősök / Kapcsolatok** | Nincs implementálva | A kódban és a sémában egyetlen tábla vagy modell sincs felhasználók közötti ismeretségre. | **IGAZOLT** |
| **Felhasználókeresés** | Nincs implementálva | A `user_profiles` RLS szabálya (`auth.uid() = user_id`) kifejezetten tiltja mások profiljának olvasását. | **IGAZOLT** |
| **Követési rendszer (Follow)** | Nincs implementálva | Sem backend reláció, sem frontend felület nem létezik. | **IGAZOLT** |
| **Privát üzenetek (DM)** | Nincs implementálva | Nincs üzenetküldő tábla vagy funkció. | **IGAZOLT** |
| **Kommentek és reakciók** | Nincs implementálva | Nincs bejegyzés, hírfolyam vagy hozzászólási lehetőség. | **IGAZOLT** |
| **Realtime szinkronizáció** | Nincs implementálva | 0 db WebSocket csatorna az alkalmazásban; adatszinkronizáció csak oldalfrissítéskor van. | **IGAZOLT** |

### 4.2. Felhasználószám-kapacitási állítások ellenőrzése

A korábbi auditban szereplő számszerű terhelési forgatókönyvek felülvizsgálata:

1. **„100 regisztrált felhasználóval jól működik”**
   - **Minősítés:** `NEM IGAZOLT (Heurisztikus becslés)`.
   - **Indoklás:** Nem történt 100 egyidejű vagy 100 regisztrált felhasználós szintetikus próba. A jelenlegi adatbázisban mindössze 51 tárgy található. Bár a kis méret miatt az architektúra vélhetően stabil ezen a szinten, mérési bizonyíték nincs mögötte.

2. **„10 000 felhasználónál túlterhelődik”**
   - **Minősítés:** `NEM IGAZOLT (Túlzó feltételezés mérés nélkül)`.
   - **Indoklás:** A regisztrált felhasználók száma és az egyidejűleg aktív felhasználók száma nem azonos. 10 000 regisztrált felhasználó, ha napi 50 kérést indít, egy standard méretű Supabase instancián kényelmesen kiszolgálható lenne a megfelelő indexek megléte esetén. A túlterhelődés nem a felhasználók számától, hanem az egyidejű kérések, a lekérdezések mérete és az RLS indexáltságának függvénye.

3. **„500 vagy több párhuzamos felhasználóval nem bír el”**
   - **Minősítés:** `NEM IGAZOLT (Spekuláció)`.
   - **Indoklás:** Terheléses teszt (benchmark) nélkül nem állapítható meg a rendszer párhuzamos kapacitáskorlátja. A PgBouncer kapcsolatkezelés, a Supabase compute mérete és a Cloudflare CDN kapacitása határozza meg a plafont, amely mérések hiányában ismeretlen.

---

## 5. Az előző audit állításainak összefoglaló értékelése

| # | Eredeti audit állítás | Minősítés | Tényleges bizonyíték | Korrigált valós kockázat |
| :-: | :--- | :---: | :--- | :--- |
| **A** | `household_invites_select_policy` nyíltan olvashatóvá teszi a függő meghívókat | **IGAZOLT** | `pg_policies` élő definíció & migráció 193–201. sor | **HIGH**: Bárki lekérheti az összes függő meghívó e-mailjét és tokenjét. |
| **B** | 67 RLS policy `auth.uid()` miatt 100–500x CPU terhelést és exponenciális lassulást okoz | **RÉSZBEN IGAZOLT** | Supabase Advisor: 67 db `auth_rls_initplan`, de 0 db mérés | **MEDIUM**: Lineáris SubPlan többletköltség nagyméretű tábláknál; a szorzó spekulatív. |
| **C** | `AppContext.tsx` 12+ táblát tölt be és LocalStorage-ba ment, azonnali QuotaExceededError-t okozva | **RÉSZBEN IGAZOLT** | `AppContext.tsx` 1740. sor (19 tábla), de `items.slice(0, 50)` és try/catch van | **MEDIUM**: Bejelentkezési waterfall lassulás; a tárgyak nincsenek túlcsordulásnak kitéve. |
| **D** | `process-notifications` unpaginated lekérdezése és szekvenciális upsertje timeoutot okoz | **IGAZOLT** (Architekturálisan) | `process-notifications/index.ts` 82–135. sor; logokban nincs hiba | **MEDIUM**: Nagy adatmennyiségnél Deno wall-clock timeout kockázat. |
| **E** | Hiányzik az `items.created_at` index és a `pg_trgm` GIN index | **IGAZOLT** | `pg_indexes` (nincs created_at) és `pg_extension` (nincs pg_trgm) | **MEDIUM**: Seq Scan kereséskor és rendezéskor skálázódás esetén. |
| **F** | `deleteAccount()` hiányos törlést végez, árván hagyva DB rekordokat és R2 fájlokat | **IGAZOLT** | `AppContext.tsx` 2330. sor & `referential_constraints` | **HIGH**: 8 tábla kimarad, nincs auth user törlés, nincs R2 fájltörlés (GDPR kockázat). |
| **G** | Jogosultság visszavonás után megosztott adatok maradnak a kliens gyorsítótárában | **IGAZOLT** | 0 db Realtime `.channel` előfizetés a teljes kliensben | **LOW**: Kliensoldali gyorsítótárazási jelenség; a szerver védett. |
| **H** | Tárgyfotók nyilvános CDN-en vannak védtelenül, dokumentumok védett proxyn | **IGAZOLT** | `src/lib/r2.ts` 228. sor (CDN) vs 237. sor (Edge proxy) | **LOW**: Fotók URL ismeretében nyilvánosak; dokumentumok védettek. |
| **I** | `prevent_household_role_escalation` search_path hiánya kritikus biztonsági rés | **RÉSZBEN IGAZOLT** | `pg_proc` (nincs search_path, de hívások minősítettek) | **LOW**: Linter figyelmeztetés; nem kihasználható jogosultság-kiterjesztésre. |

---

## 6. A ténylegesen igazolt biztonsági problémák listája

1. **`household_invites_select_policy` jogosulatlan adatlekérdezés (HIGH):**
   - **Hiba leírása:** A policy `OR ((status = 'pending') AND ((expires_at IS NULL) OR (expires_at > now())))` ága globálisan, feltétel nélkül igazat ad bármely publikus kérésre.
   - **Kockázat:** Személyes adatok (meghívott e-mail címek) tömeges kinyerése és meghívók eltérítése a titkos token birtokában.
2. **Hiányos fióktörlési folyamat / GDPR adatmegőrzési hiba (HIGH):**
   - **Hiba leírása:** A felhasználó által kezdeményezett `deleteAccount()` nem törli az összes hozzá tartozó adatbázisrekordot (`pantry_items`, `collections`, `quick_notes`, `storage_containers`, `household_members`), nem törli az `auth.users` fiókot, és nem törli az R2 tárolóban lévő fizikai fájlokat.
   - **Kockázat:** Személyes adatok és fájlok jogosulatlan megőrzése a fiók állítólagos megszüntetése után.

---

## 7. A további vizsgálatot igénylő, de még nem bizonyított problémák listája

1. **RLS InitPlan tényleges teljesítményvesztesége:**
   - Pontos mérési adat szükséges: mekkora az időbeli eltérés ezredmásodpercben 10 000 tétel lekérdezésekor `auth.uid()` és `(select auth.uid())` között.
2. **`process-notifications` valós lefutási ideje nagy adathalmazon:**
   - Szintetikus adatokkal tesztelendő, hány lejáró tételnél éri el a függvény a Supabase Edge Function 150 másodperces futási korlátját.
3. **Bejelentkezési adatfolyam (Waterfall) sávszélesség-igénye:**
   - Mobilhálózati profil mellett mérést igényel, hogy a 19 tábla párhuzamos lekérése mekkora késleltetést okoz egy valós háztartás adatméretével.

---

## 8. Prioritási javaslat (Kizárólag az igazolt tények alapján)

### Prioritás 1: Kritikus biztonsági és adatvédelmi javítások (P1)
- **A `household_invites_select_policy` RLS szabály azonnali korrekciója:** A nyílt `status = 'pending'` feltétel szűkítése a bejelentkezett felhasználó e-mail címére (`lower(invited_email) = lower(auth.jwt()->>'email')`).
- **Szerveroldali fióktörlési eljárás (RPC / Edge Function):** Tranzakcionális törlés megvalósítása a hiányzó táblákra, a Cloudflare R2 fájlok takarítására és az `auth.users` rekord törlésére.

### Prioritás 2: Adatbázis- és lekérdezés-optimalizáció (P2)
- **RLS InitPlan javítás:** A 67 érintett policy átírása `(select auth.uid())` szintaxisra a Supabase linter ajánlása szerint.
- **Hiányzó indexek pótlása:** Index létrehozása a `public.items(created_at DESC)` mezőre.
- **Szövegkeresés korszerűsítése:** `pg_trgm` bővítmény bekapcsolása és GIN index létrehozása az `items(name, description, notes)` mezőkre a szekvenciális keresések kiküszöbölésére.

### Prioritás 3: Háttérfolyamatok és kliens stabilitás (P3)
- **`process-notifications` kötegelt feldolgozása:** A lejárati lekérdezés szűkítése kizárólag a releváns dátumablakra (`warranty_end BETWEEN today AND today + 30 days`), és a szekvenciális upsert helyett kötegelt (batch) mentés alkalmazása.
- **Háttértáblák igény szerinti betöltése (Lazy Loading):** Az `AppContext.tsx` tehermentesítése: a csak adott nézetben szükséges modulok (pl. kamra, konténerek, gyűjtemények) ne a bejelentkezéskor, hanem a képernyő megnyitásakor töltődjenek be.

---

## 9. A további bizonyítékok megszerzéséhez szükséges lépések (Kód- és adatbázis-módosítás nélkül)

1. **Izolált tesztkörnyezet (Staging / Branch DB) létrehozása:**
   - A Supabase projekt branching funkciójával vagy egy külön dev projektben tesztadatbázis felállítása.
2. **Szintetikus adatgenerálás (csak staging környezetben):**
   - 10 000 elem, 100 helyszín és 50 háztartás létrehozása kizárólag a tesztadatbázisban.
3. **Lekérdezési profilozás (`EXPLAIN ANALYZE`):**
   - A staging adatbázisban a keresési, lapozási és RLS kiértékelési tervek futtatása és rögzítése.
4. **k6 terhelési forgatókönyv futtatása:**
   - 50, 100 és 250 virtuális felhasználó szimulációja staging végpontokon az API válaszidők és P95 mutatók dokumentálására.
