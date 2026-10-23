# THINGOR — KÖZÖSSÉGI ALKALMASSÁG, SKÁLÁZHATÓSÁG ÉS FELHASZNÁLÓI KAPCSOLATOK AUDITJA

**Dátum:** 2026. október 23.  
**Munkamód:** READ-ONLY ARCHITECTURAL AUDIT  
**Auditált rendszer:** Thingor Platform (PWA Frontend, Supabase PostgreSQL DB, Supabase Edge Functions, Cloudflare R2 Object Storage)  
**Dokumentum azonosító:** `THINGOR_COMMUNITY_SCALABILITY_AUDIT.md`

---

## 1. Vezetői összefoglaló

A Thingor jelenlegi állapotában **nem közösségi hálózat és nem általános felhasználó-felhasználó megosztóplatform**, hanem egy kiválóan megtervezett, magas szintű adatbiztonságra törekvő **személyes leltár-, garancia- és háztartáskezelő alkalmazás (Personal & Household Inventory Management System)**.

### Fő megállapítások:
1. **Közösségi funkciók hiánya:** A rendszerben jelenleg **nincs** ismerősi kapcsolat (friendship), követési rendszer (follow), felhasználói profilkeresés, közvetlen üzenetküldés (DM), nyilvános profil, kommentezés vagy közösségi hírfolyam. A felhasználók közötti interakció kizárólag a **zárt családi háztartási modellre (`households`)** és az **egyedi kriptográfiai linkes tárgymegosztásra (`item_shares`)** korlátozódik.
2. **Kifejezetten erős pontok:**
   - **Kliensoldali képtömörítés:** 1600×1600 WebP automatikus konverzió a böngészőben feltöltés előtt ([`src/lib/storage.ts`](file:///c:/Users/User/thingor/src/lib/storage.ts#L37-L117)), ami drasztikusan csökkenti a hálózati forgalmat és a Storage költségeket.
   - **Cloudflare R2 privát tárolás és proxy:** A titkos R2 API kulcsok nem kerülnek a kliensre, az Edge Function ([`supabase/functions/storage-r2/index.ts`](file:///c:/Users/User/thingor/supabase/functions/storage-r2/index.ts)) szigorú útvonal- és tulajdonosi validációt végez.
   - **Granuláris háztartási jogosultságkezelés:** Modulszintű (`allowed_modules`), helyszínszintű (`allowed_location_ids`), kategóriaszintű (`allowed_category_ids`) és tételes tiltólistás (`excluded_item_ids`) szűrés működik a háztartási tagokra.
3. **Kritikus architekturális szűk keresztmetszetek növekedés esetén:**
   - **Kliensoldali tömeges adatbetöltés és LocalStorage plafon:** Bejelentkezéskor az [`AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1773-L1965) 12+ tábla **teljes tartalmát** lapozatlanul (`select('*')`) letölti és a böngésző LocalStorage-ába menti. Ez 500–1000 tárgy felett eléri a böngészők 5–10 MB-os LocalStorage kvótáját (`QuotaExceededError`), és memóriatúlcsordulást okoz.
   - **RLS teljesítményromlás (`auth_rls_initplan`):** A Supabase linter 67 RLS szabályban detektálta, hogy az `auth.uid()` függvény közvetlenül, nem pedig `(select auth.uid())` formában van meghívva, így a PostgreSQL a jogosultsági függvényeket minden egyes vizsgált sornál újraértékeli, exponenciálisan lassuló szekvenciális táblapásztázást okozva.
   - **Háttérfolyamat skálázhatatlansága (`process-notifications`):** Az Edge Function lapozatlanul lekéri az **összes** lejárati dátummal rendelkező tárgyat és hitelt a teljes adatbázisból ([`index.ts:83`](file:///c:/Users/User/thingor/supabase/functions/process-notifications/index.ts#L83)), majd elemenként egyenkénti HTTP hívással hajt végre `upsert`-et, ami néhány ezer tárgy felett azonnali Deno Deploy időtúllépést (timeout) eredményez.
   - **Adatszivárgási rés a függő meghívásoknál:** A `household_invites_select_policy` RLS szabályban az `OR (status = 'pending' AND expires_at > now())` feltétel miatt **bármely hitelesített felhasználó lekérdezheti az összes függőben lévő családi meghívást** és a meghívottak e-mail címeit.

---

## 2. Jelenlegi architektúra és adatfolyamok

### 2.1. Technológiai rétegek
```
┌────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 18 + Vite + Tailwind CSS / Vanilla CSS PWA)            │
│  - AppContext (Központi monolit állapot: 5650+ sor, LocalStorage cache)│
│  - Nézetek: ItemsView (szerveroldali lapozás), Pantry, Storage, stb.  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS REST / PostgREST & Auth JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ SUPABASE PLATFORM (PostgreSQL 15+)                                     │
│  - 25 nyilvános relációs tábla (Row-Level Security kötelezően aktív)   │
│  - Tárolt eljárások & Security Definer függvények (pl. can_access_*)   │
│  - Supabase Auth (GoTrue JWT, profiles tábla szinkron)                 │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               ▼                                          ▼
┌───────────────────────────────┐        ┌───────────────────────────────┐
│ EDGE FUNCTION: storage-r2     │        │ EDGE FUNCTION: notifications  │
│ - Cloudflare R2 S3 API Proxy  │        │ - Időzített Cron feladat      │
│ - Pre-signed URL generálás    │        │ - Garancia és törlesztő figyel│
│ - Szigorú útvonal-ellenőrzés  │        │ - Resend e-mail integráció    │
└──────────────┬────────────────┘        └───────────────────────────────┘
               │ S3 API
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ CLOUDFLARE R2 OBJECT STORAGE                                           │
│  - thingor (Fotók, nyilvános CDN hozzáféréssel elérhető)               │
│  - thingor-vault (Dokumentumok, szigorúan privát, presigned URL kell)  │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Valós idejű kommunikáció (Realtime) hiánya
A frontend kódban **egyetlen Supabase Realtime feliratkozás sincs** (`supabase.channel` vagy `postgres_changes`).
- Ha a háztartás „A” tagja módosít egy tárgyat, a „B” tag felületén ez csak manuális oldalfrissítés, nézetváltás vagy újraindítás után jelenik meg.
- Közösségi funkcióknál (üzenetek, értesítések, kapcsolatkérések) ez azonnali elvárás lenne; jelenleg a rendszer kizárólag lekérdezés-alapú (polling/on-mount).

---

## 3. Felhasználói kapcsolatok és közösségi adatmodell

### 3.1. Felhasználói azonosítás és adatszeparálás
- **Azonosítás:** A Supabase Auth `auth.users` táblája generálja a UUID azonosítót (`auth.uid()`). A `public.profiles` tábla tárolja a megjelenített nevet, e-mail címet, admin szerepkört (`role`) és felhasználói preferenciákat (`preferences`).
- **Elszeparálás:** Minden entitás rendelkezik egy kötelező `user_id UUID` mezővel.
- **Profilok láthatósága:** A `profiles` tábla RLS szabálya szigorúan egyéni:
  ```sql
  {"policyname":"Users can view own profile", "qual":"(auth.uid() = user_id)"}
  {"policyname":"Admins can view all profiles", "qual":"is_admin()"}
  ```
  Ez azt jelenti, hogy **egy normál felhasználó a PostgREST API-n keresztül semmilyen más felhasználó profilját nem kérdezheti le**. Nincs publikus profillista, és nincs lehetőség más felhasználók keresésére.

### 3.2. A háztartási modell (`households`)
A felhasználók közötti egyetlen meglévő relációs kapcsolat a háztartási struktúra:
1. `households`: `id`, `name`, `owner_id`, `created_by`, `shared_location_ids`, `shared_category_ids`.
2. `household_members`: `household_id`, `user_id`, `user_email`, `user_name`, `role` (`owner`, `admin`, `member`), `allowed_modules`, `sharing_mode` (`all` vagy `custom`), `allowed_location_ids`, `allowed_category_ids`, `excluded_item_ids`.
3. `household_invites`: `household_id`, `invited_email`, `role`, `invited_by`, `token`, `status` (`pending`, `accepted`, `declined`), `expires_at`.

#### Korlátok a jelenlegi modellben:
- **Csak egyetlen aktív háztartás a kliensen:** Bár az adatbázisban egy felhasználó több háztartás tagja is lehetne, az [`AppContext.tsx:1902`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1902) fájlban:
  ```typescript
  const savedHhId = localStorage.getItem('thingor_active_household_id');
  const memberData = memberList?.find(m => m.household_id === savedHhId) || memberList?.[0];
  ```
  A frontend állapot egyszerre kizárólag egyetlen háztartást kezel. Nincs háztartásváltó UI több háztartás párhuzamos kezelésére.
- **Nincs felhasználó–felhasználó kapcsolat:** Nem létezik ismerős (friend), követő (follower) vagy kontakt entitás. Ha két felhasználó meg akar osztani valamit, az egyiknek be kell hívnia a másikat a komplett háztartásába.
- **Nincs közvetlen kapcsolatfelvételi kérelem:** A meghívás kizárólag e-mail cím beírásával történik (`household_invites.invited_email`). Ha a címzett más e-mail címmel regisztrált, a rendszer nem tudja összekötni őket.

### 3.3. Integritás és törlési anomáliák (Orphaned Records)
A vizsgálat kimutatta, hogy az adatbázisban a `user_id` oszlopok **nem rendelkeznek külső kulcs (Foreign Key) kényszerrel az `auth.users` felé**, vagy nincsenek ellátva `ON DELETE CASCADE` szabállyal:
- Ha egy felhasználót törölnek az Auth rendszerből, vagy a felhasználó meghívja a [`deleteAccount()`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L2330) függvényt:
  ```typescript
  await supabase.from('item_documents').delete().eq('user_id', user.id);
  await supabase.from('items').delete().eq('user_id', user.id);
  await supabase.from('locations').delete().eq('user_id', user.id);
  await supabase.from('categories').delete().eq('user_id', user.id).eq('is_custom', true);
  await supabase.from('profiles').delete().eq('user_id', user.id);
  ```
  **Árva rekordok maradnak:**
  - A `household_members` rekord nem törlődik.
  - A `households` (ahol ő volt az `owner_id` vagy `created_by`) gazdátlanná válik.
  - A `collections`, `collection_items`, `pantry_items`, `storage_containers`, `container_items`, `item_loans`, `item_repairs`, `item_financings`, `quick_notes`, `notifications` rekordok mind az adatbázisban ragadnak!
  - A Cloudflare R2-ben lévő fájlok (`<user_id>/photos/*` és `<user_id>/documents/*`) sosem törlődnek.

---

## 4. Közösségi funkciók alkalmassági mátrixa

| Közösségi funkció | Státusz | Jelenlegi implementáció és technikai bizonyíték | Szükséges átalakítás mértéke |
| :--- | :--- | :--- | :--- |
| **Felhasználói profilok** | **Részben támogatott** | Létezik `profiles` tábla, de szigorúan zárt (`auth.uid() = user_id`). Nincs publikus profilnézet, avatar, bio vagy social linkek. | Közepes (RLS módosítás, profil mezők bővítése). |
| **Felhasználók keresése** | **Nincs implementálva** | Az RLS tiltja más profilok olvasását. Nincs kereső RPC vagy névindex. | Nagy (Biztonságos kereső RPC funkció, RLS revízió, pg_trgm index). |
| **Ismerősök / Kapcsolatok** | **Nincs implementálva** | Nincs `friends`, `connections` tábla vagy adatmodell. | Jelentős adatmodell-bővítés (új kapcsolati táblák, RLS). |
| **Kapcsolatkérések / Meghívók** | **Részben támogatott** | Csak családi háztartási meghívás létezik e-mail cím alapján (`household_invites`). Felhasználók közötti direkt felkérés nincs. | Nagy (Általános meghívási/kapcsolati rendszer kifejlesztése). |
| **Tiltás és jelentés (Block/Report)** | **Nincs implementálva** | Nincs `user_blocks`, `reports` tábla. Csak globális admin tiltás van (`status: 'suspended'`). | Nagy (Új táblák, RLS szűrők integrálása minden megosztási lekérdezésbe). |
| **Követési rendszer (Followers)** | **Nincs implementálva** | Egyáltalán nincs követési mechanizmus vagy hírfolyam logika. | Teljesen új alrendszer szükséges. |
| **Közös háztartások / Csoportok** | **Meglévő és igazolt** | Működő `households`, `household_members` szerepkörökkel (`owner`, `admin`, `member`) és modulszintű jogosultságokkal. | Kész alapok; több háztartás egyidejű kliensoldali kezelése hiányzik. |
| **Közös tárgyak és gyűjtemények** | **Meglévő és igazolt** | Tárgyak (`ownership_scope: 'household'`), gyűjtemények és kamra elemek sikeresen megoszthatók háztartáson belül. | Kész; háztartáson kívüli direkt csoportos megosztás nincs. |
| **Célzott linkes megosztás** | **Meglévő és igazolt** | `item_shares` tábla kriptográfiai tokennel és lejárattal vendég megtekintésre ([`AppContext.tsx:5270`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L5270)). | Kész; egyedi tárgyakra működik, gyűjteményekre/helyszínekre nem. |
| **Kommentek és reakciók** | **Nincs implementálva** | Tárgyakhoz vagy tevékenységekhez nincs hozzászólás- vagy lájk-modell. | Új adatmodell és felület szükséges (`item_comments`, `reactions`). |
| **Privát üzenetek (Chat/DM)** | **Nincs implementálva** | Nincs üzenetküldési adatmodell vagy Realtime infrastruktúra. | Teljesen új alrendszer és Realtime infrastruktúra szükséges. |
| **Értesítések** | **Részben támogatott** | Létezik `notifications` tábla és cron Edge Function, de csak lejárati/pénzügyi típusokra (`warranty`, `financing`). Közösségi típusok nincsenek. | Közepes (Postgres CHECK constraint bővítés, Realtime push). |
| **Tevékenységi hírfolyam (Activity Feed)**| **Nincs implementálva** | Csak belső `admin_audit_logs` létezik (az is write-only a frontendről). Felhasználói tevékenységnapló nincs. | Nagy (Eseményvezérelt audit/feed tábla és UI). |
| **Közösségi adatvédelem** | **Részben támogatott** | Modulszintű és tételes kizárás van háztartáson belül, de nincsenek nyilvános/ismerősi láthatósági szintek. | Nagy (Public / Friends-only / Private láthatósági mátrix). |
| **Spam- és visszaélésvédelem** | **Nincs implementálva** | Nincs sebességkorlátozás (rate limiting), CAPTCHA vagy szövegelemzés. | Nagy (Edge Function rate limiterek, Upstash/Redis, hCAPTCHA). |
| **Adminisztrációs és moderációs eszközök**| **Meglévő és igazolt** | [`AdminView.tsx`](file:///c:/Users/User/thingor/src/components/AdminView.tsx): Felhasználó felfüggesztése, regisztráció leállítása, karbantartási mód, audit log mentés. | Meglévő; közösségi moderációs funkciók (tartalomjelentés) hiányoznak. |

---

## 5. Jogosultsági és adatbiztonsági kockázatok

### 5.1. RLS szabályok biztonsági elemzése
A PostgreSQL RLS házirendek alapvetően szigorú elszeparálást biztosítanak, de az alábbi konkrét biztonsági rések és anomáliák azonosíthatók:

#### 1. Adatszivárgás a függő meghívásoknál (HIGH)
- **Hiba helye:** `household_invites_select_policy`
  ```sql
  qual: (is_admin() 
    OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) 
    OR (invited_by = auth.uid()) 
    OR (household_id IN ( SELECT get_my_household_ids() )) 
    OR ((status = 'pending'::text) AND ((expires_at IS NULL) OR (expires_at > now()))))
  ```
- **Kockázat:** Az utolsó `OR status = 'pending'` záradékban **nincs felhasználói azonosító szűrés**. Bármely bejelentkezett felhasználó lekérdezheti az adatbázisban létező **összes** függőben lévő családi meghívást, hozzáférve más felhasználók e-mail címéhez (`invited_email`) és a meghívó tokenjéhez.

#### 2. Képek URL-jeinek nyilvánossága Cloudflare R2-n (MEDIUM)
- **Hiba helye:** [`supabase/functions/storage-r2/index.ts:364`](file:///c:/Users/User/thingor/supabase/functions/storage-r2/index.ts#L364) és [`L522`](file:///c:/Users/User/thingor/supabase/functions/storage-r2/index.ts#L522)
- **Kockázat:** Míg a dokumentumok szigorúan presigned URL-ekkel védettek, a fényképek publikus CDN URL-t kapnak (`https://media.thingor.com/<user_id>/photos/<filename>.webp`). Bár az URL tartalmaz egy véletlenszerű timestamp előtagot, a képek nem igényelnek Supabase munkamenetet a letöltéshez. Ha valaki megszerzi a linket, jogosulatlanul megtekintheti.

#### 3. Search Path sebezhetőség a tárolt eljárásban (MEDIUM)
- **Hiba helye:** Supabase Security Advisor Linter: `public.prevent_household_role_escalation`
- **Kockázat:** A triggerfüggvény nem definiál rögzített `search_path`-t (`SET search_path = ''`), ami elméleti privilege escalation támadásnak nyit teret schema injection esetén.

### 5.2. Konkrét biztonsági tesztesetek (Izolált ellenőrzési forgatókönyvek)

1. **Saját adatok szeparálása:**
   - *Teszteset:* `User A` lekérdezi a `SELECT * FROM items`.
   - *Várt eredmény:* Kizárólag azok a rekordok térnek vissza, ahol `user_id = User A` vagy `User A` tagja a tárgyhoz rendelt háztartásnak.
   - *Audit eredmény:* **Átment.** Az `items_select_policy` megakadályozza idegen privát tárgyak listázását.
2. **Háztartási tag moduláris korlátozása:**
   - *Teszteset:* `User B` tagja `Household X`-nek, de `allowed_modules->>'inventory'` értéke `false`.
   - *Várt eredmény:* `User B` nem láthatja a háztartás tárgyait, még akkor sem, ha a háztartás azonosítója egyezik.
   - *Audit eredmény:* **Átment.** A `can_access_shared_item` függvény kifejezetten ellenőrzi: `((hm.allowed_modules->>'inventory')::boolean IS NOT FALSE)`.
3. **Idegen háztartás izolációja:**
   - *Teszteset:* `User C` nem tagja `Household X`-nek, de közvetlenül kísérel meg lekérdezést `WHERE household_id = 'Household X'`.
   - *Várt eredmény:* 0 sor eredmény.
   - *Audit eredmény:* **Átment.** A `can_access_shared_item` ellenőrzi a megtekintő tagságát a megadott háztartásban.
4. **Megosztás visszavonása:**
   - *Teszteset:* `User B`-t eltávolítják `Household X`-ből (`household_members` törlése).
   - *Várt eredmény:* A következő lekérdezéstől kezdve `User B` azonnal elveszíti a hozzáférést a korábban megosztott elemekhez.
   - *Audit eredmény:* **Átment adatbázis szinten**, de **frontend szinten hibás:** Mivel a kliens a LocalStorage-ba mentette az adatokat, `User B` böngészőjében az offline cache miatt az adatok a `clearUserSessionData()` lefutásáig vagy manuális frissítésig láthatóak maradnak!
5. **Védett dokumentumok szeparálása (Vault):**
   - *Teszteset:* `User B` megpróbálja letölteni `User A` olyan dokumentumát, amelynél `is_vault_protected = true`.
   - *Várt eredmény:* HTTP 403 Forbidden a storage-r2 Edge Functiontől.
   - *Audit eredmény:* **Átment.** A `storage-r2/index.ts:156` sorban explicit szabály védi: `return !data.is_vault_protected;`.
6. **Műveletvégzés más nevében (Impersonation):**
   - *Teszteset:* `User B` megpróbál beszúrni egy tárgyat `user_id = User A` mezővel.
   - *Várt eredmény:* RLS INSERT hiba.
   - *Audit eredmény:* **Átment.** Az `items_insert_policy` kötelezően megköveteli: `(auth.uid() = user_id)`.

---

## 6. Skálázhatósági és teljesítménykockázatok

### 6.1. Adatbázis és lekérdezési réteg (PostgreSQL / Supabase)

#### 1. Az `auth_rls_initplan` probléma (67 RLS szabály érintett)
A Supabase Performance Advisor 67 RLS szabályban jelezte a hibás kiértékelést.
- **Ok:** A szabályokban az `auth.uid()` kifejezés szerepel ahelyett, hogy `(SELECT auth.uid())` lenne.
- **Következmény:** 10 000 sornál a PostgreSQL nem egyszer futtatja le a session azonosítását a lekérdezés elején, hanem **mind a 10 000 sornál újra és újra meghívja az auth függvényt**. Ez 100-500-szoros CPU terhelést és észrevehetően megnövekedett TTFB (Time to First Byte) válaszidőt okoz.

#### 2. Hiányzó indexek és szekvenciális pásztázás (Seq Scan)
A `public.items` tábla indexeinek lekérdezése igazolta:
- Van index: `id`, `user_id`, `household_id`, `location_id`, `category_id`, `is_vault_protected`, `container_id`.
- **Nincs index:** `created_at`, `purchase_date`, `current_value`, `name`.
- **Következmény:** Az [`ItemsView.tsx:184-194`](file:///c:/Users/User/thingor/src/components/ItemsView.tsx#L184-L194) alapértelmezett rendezése: `.order('created_at', { ascending: false })`. Index hiányában a PostgreSQL minden egyes lapozásnál a teljes szűrt halmazon `Sort` műveletet kénytelen végezni a memóriában.
- **Keresési teljesítmény:** A keresés `.or('name.ilike.%token%,description.ilike.%token%')` formában fut. Trigram (`pg_trgm`) GIN index nélkül a `%keresőszó%` minta **garantáltan teljes táblapásztázást (Full Table Scan)** végez, ami 10 000 tárgynál másodperces késleltetéseket eredményez.

### 6.2. Frontend állapotkezelés és memória (React PWA)

#### 1. Monolitikus adatszinkronizáció bejelentkezéskor (CRITICAL)
Az [`AppContext.tsx:1773-1965`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1773-L1965) fájlban az alkalmazás az autentikáció pillanatában **12 tábla teljes tartalmát lekéri lapozás nélkül**:
```typescript
supabase.from('items').select('*')
supabase.from('item_documents').select('*')
supabase.from('item_repairs').select('*')
supabase.from('item_financings').select('*')
supabase.from('item_loans').select('*')
supabase.from('collections').select('*')
supabase.from('collection_items').select('*')
supabase.from('pantry_items').select('*')
supabase.from('storage_containers').select('*')
supabase.from('container_items').select('*')
```
- **Következmény:** 
  - Egy 2000 tárgyat kezelő felhasználó esetén a kezdeti betöltés több megabájtnyi JSON adatot mozgat meg feleslegesen.
  - A `JSON.stringify` formában LocalStorage-ba írás összeomlik a böngészők 5 MB-os limitje miatt (`DOMException: QuotaExceededError`).
  - A React állapotban tartott többezres tömbök miatt minden apró állapotfrissítés (pl. értesítés érkezése) masszív re-render hullámot indít a memóriában.

#### 2. Lapozás hiánya a másodlagos nézetekben
Egyedül az `ItemsView.tsx` valósít meg szerveroldali lapozást (`range(from, to)`).
- A `PantryView`, `DocumentsView`, `CollectionsView`, `StorageView`, `RepairsView`, `LendingView` és az `AdminView` **teljes egészében a memóriában lévő kliensoldali tömböket rendereli ki**.
- 500 kamracikk vagy 1000 dokumentum esetén a DOM elemek száma kezelhetetlenné válik, a görgetés akad, a mobil eszközök böngészői pedig memóriahiány miatt bezárják a lapot.

---

## 7. Terhelési forgatókönyvek értékelése

| Forgatókönyv | Mi működik jól? | Várható szűk keresztmetszet | Bizonyíték / Ok | Szükséges mérés / Feladat |
| :--- | :--- | :--- | :--- | :--- |
| **100 regisztrált felhasználó** | Kiválóan működik. A Supabase Free tier kényelmesen kiszolgálja. | Nincs érdemi szűk keresztmetszet. | Alacsony egyidejű adatbázis-kapcsolatszám és kis táblaméretek. | Normál funkcionális teszt. |
| **1 000 regisztrált felhasználó** | Az R2 tárhely és az autentikáció stabil. | Lassuló bejelentkezési idők az `AppContext` 12+ egyidejű lekérdezése miatt. | Táblánkénti `select('*')` a belépés pillanatában. | Belépési TTFB és hálózati payload mérése. |
| **10 000 regisztrált felhasználó** | R2 fájlkiszolgálás stabil. | **Adatbázis kapcsolatkimerülés és CPU csúcsok.** A `process-notifications` cron elbukik. | `auth_rls_initplan` 67 szabályban; `process-notifications` cron nem lapoz (`select id, name from items`). | Szintetikus adatbázis-terheléses teszt (pgbench / k6). |
| **100 egyidejű aktív felhasználó** | A statikus PWA frontend (CDN) azonnal betölt. | Supabase PostgreSQL kapcsolat-pool (Pooler) terhelés; lassuló `ItemsView` lapozás. | RLS `can_access_shared_item` függvény minden sorra lefutó subqueryje. | K6 terheléses teszt az API végpontokra. |
| **500 egyidejű aktív felhasználó** | Kliensoldali képtömörítés védi a sávszélességet. | **504 Gateway Timeout a Supabase API-n.** Kapcsolat-sorbanállás (Connection pooling exhaustion). | Kis méretű Supabase compute instance (Micro/Small) nem bírja a többszörös RLS subquery-ket. | Terheléses kapacitásteszt staging környezeten. |
| **1 000 egyidejű aktív felhasználó** | Statikus fájlok kiszolgálása (R2). | **Teljes szolgáltatáskiesés adatbázis szinten.** | A hiányzó indexek és az RLS függvényhívások miatt a PostgreSQL CPU 100%-ra ugrik. | Dedikált Supabase compute és PgBouncer optimalizálás. |
| **Felhasználó több ezer tárggyal és képpel** | `ItemsView` lapozás segít a képernyőn; képek WebP formátumban vannak. | **LocalStorage QuotaExceededError.** Az `AppContext` belépéskor összeomlik. | [`AppContext.tsx:1779`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1779) `setItems(data)` és LocalStorage-ba írás. | Kliensoldali LocalStorage mentés eltávolítása a nagyméretű entitásokról. |
| **Háztartás sok taggal és nagy adatmennyiséggel** | Szerepkörök és jogosultsági mátrix logikailag pontosan szűr. | **Drasztikus lekérdezési lassulás.** | `can_access_shared_item` és a `collection_items` RLS dupla joinja `household_members` táblán. | RLS végrehajtási terv (`EXPLAIN ANALYZE`) elemzés. |
| **Egyidejű tömeges keresés és szerkesztés** | Debounced keresőmező védi a felesleges leütésenkénti hívásokat (300ms). | **Adatbázis I/O csúcs.** | `%token%` alapú ILIKE keresés GIN index nélkül szekvenciálisan pásztázza az összes sort. | `pg_trgm` GIN index mérése valós keresési kifejezésekkel. |

---

## 8. Konkrét bizonyítékok jegyzéke

| # | Terület | Fájl / Objektum | Sorszám / Részlet | Leírás és technikai következmény |
| :--- | :--- | :--- | :--- | :--- |
| **B1** | Adatbázis RLS | `pg_policies` | `household_invites_select_policy` | `OR (status = 'pending' AND expires_at > now())`: Nincs `user_id` szűrés, bármely bejelentkezett felhasználó láthatja az összes függő meghívást. |
| **B2** | Adatbázis Perf | Supabase Linter | `auth_rls_initplan` (67 db) | Az `auth.uid()` függvény minden egyes sor vizsgálatakor újra lefut `(select auth.uid())` helyett, súlyos CPU terhelést okozva. |
| **B3** | Adatbázis Perf | `pg_indexes` | `public.items` tábla | Hiányzik a `created_at` index, miközben a lapozó lekérdezés mindig `order('created_at', { ascending: false })` szerint rendez. |
| **B4** | Háttérfolyamat | `process-notifications` | [`index.ts:82-85`](file:///c:/Users/User/thingor/supabase/functions/process-notifications/index.ts#L82-L85) | `select('id, user_id, name, warranty_end').not('warranty_end', 'is', null)`: Lapozatlanul behúzza a teljes adatbázis összes tárgyát, majd szekvenciális ciklusban ment. |
| **B5** | Frontend Memória| `AppContext.tsx` | [`L1773-L1895`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1773-L1895) | 12 különálló `select('*')` fut le belépéskor lapozás nélkül, és mindent beír a szűkös kapacitású LocalStorage-ba. |
| **B6** | Frontend Lapozás| `*View.tsx` komponensek | `PantryView`, `DocumentsView`, stb. | Egyedül az `ItemsView.tsx` tartalmaz lapozást, az összes többi modul a teljes memóriabeli listát egyszerre rendereli ki a DOM-ba. |
| **B7** | Integritás | `AppContext.tsx` | [`deleteAccount: L2334-L2340`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L2334-L2340) | Fióktörléskor a kamra, konténerek, hitelek, háztartási tagságok és az R2 fájlok érintetlenül a szerveren maradnak (árva rekordok). |
| **B8** | Biztonság / Audit | `AppContext.tsx` | [`logAdminAction: L4800-L4815`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L4800-L4815) | Az `admin_audit_logs` tábla írásra kerül, de a frontendről sosem olvasódik vissza; oldalfrissítéskor az admin felület naplója üres marad. |

---

## 9. Kockázati lista súlyosság szerint

### CRITICAL (Azonnali stabilitási és adatbiztonsági kockázat)
1. **Frontend LocalStorage kvótatúllépés (`QuotaExceededError`):** Több ezer tétel esetén a monolitikus `AppContext` betöltés összeomlasztja a böngésző állapotperzisztenciáját ([`B5`](#8-konkrét-bizonyítékok-jegyzéke)).
2. **`process-notifications` Edge Function időtúllépés (Timeout):** Az összes tárgy lapozatlan memóriába töltése és egyenkénti mentése miatt a háttérfolyamat elbukik növekvő adatszámnál ([`B4`](#8-konkrét-bizonyítékok-jegyzéke)).

### HIGH (Skálázhatósági és jogosultsági kockázat)
3. **Adatszivárgás a függő meghívásoknál:** Idegen e-mail címek és meghívási tokenek listázhatósága a hiányzó RLS felhasználó-szűrés miatt ([`B1`](#8-konkrét-bizonyítékok-jegyzéke)).
4. **RLS InitPlan teljesítményromlás (67 szabály):** `auth.uid()` per-row kiértékelés, ami skálázódáskor megbénítja az adatbázis processzort ([`B2`](#8-konkrét-bizonyítékok-jegyzéke)).
5. **Hiányzó kaszkádolt törlések és árva adatok:** Fióktörléskor hátramaradó relációk és orvosi/pénzügyi/tárgyi adathalmok ([`B7`](#8-konkrét-bizonyítékok-jegyzéke)).

### MEDIUM (Felhasználói élmény és karbantarthatósági kockázat)
6. **Lapozás hiánya a másodlagos modulokban:** DOM túlterhelés nagyméretű kamra, konténer és dokumentumlistáknál ([`B6`](#8-konkrét-bizonyítékok-jegyzéke)).
7. **Rendezési és keresési indexek hiánya:** `created_at` B-tree és szöveges GIN indexek hiánya a tárgytáblán ([`B3`](#8-konkrét-bizonyítékok-jegyzéke)).
8. **Realtime hiánya háztartási megosztásnál:** Egyidejű használat esetén inkonzisztens kliensoldali nézetek (nincs automatikus frissülés).
9. **R2 képek közvetlen URL-jének nyilvánossága:** Ismert fájlnév esetén a képek hitelesítés nélkül megnyithatók a CDN-ről.

### LOW (Kisebb funkcionális hiányosság)
10. **Write-only admin audit napló a kliensen:** Újratöltés után a felület nem jeleníti meg a korábbi bejegyzéseket ([`B8`](#8-konkrét-bizonyítékok-jegyzéke)).

---

## 10. Hiányzó információk és a további mérések követelményei

Az alábbi megállapítások kódelemzéssel nem válaszolhatók meg felelősen, ezekhez éleshez hasonló mérési környezet szükséges:
1. **Pontos egyidejű konkurens kapacitás:** Nem határozható meg pusztán a kódból, hogy a jelenlegi Supabase compute méret (pl. Micro/Small/Medium) pontosan hány konkurens felhasználónál éri el a kapcsolatkorlátot (max connections / pool size).
2. **PostgreSQL Execution Plan valós adatokkal:** Kis adatszámnál (51 tárgy, 2 felhasználó) az indexek hiánya nem mérhető, mivel a PostgreSQL tervező eleve Sequential Scant választ. 100 000 szintetikus rekorddal kell `EXPLAIN ANALYZE` mérést végezni.
3. **Cloudflare R2 sávszélesség és költség:** Valós egyidejű képfeltöltési és letöltési terhelés alatt vizsgálandó az Edge Function memóriahasználata és hidegindítási (cold start) ideje.

---

## 11. Prioritásos fejlesztési roadmap

### 1. Fázis: Alapvető skálázhatósági és biztonsági javítások (Must-Have)
- **1.1.** `household_invites_select_policy` javítása: Az univerzális `status = 'pending'` feltétel szigorítása az érintett e-mail címre.
- **1.2.** RLS InitPlan javítás: Mind a 67 szabályban az `auth.uid()` cseréje `(select auth.uid())` formára.
- **1.3.** Monolitikus betöltés megszüntetése az `AppContext`-ben: A nagyméretű táblák (`items`, `documents`, `pantry`) ne töltődjenek be egyszerre a memóriába és a LocalStorage-ba belépéskor; kizárólag az éppen megnyitott nézet kérje le őket lapozva.
- **1.4.** `process-notifications` cron átírása: Kötegelt (batch/cursor-based) feldolgozás bevezetése a lejáró elemekre.
- **1.5.** Adatbázis indexelés: `items(created_at DESC)` és trigram (`pg_trgm`) indexek hozzáadása a tárgykereséshez.

### 2. Fázis: Teljesítmény és integritás optimalizálás (Should-Have)
- **2.1.** Másodlagos modulok lapozása: Szerveroldali lapozás bevezetése a `PantryView`, `DocumentsView` és `CollectionsView` komponensekben.
- **2.2.** Teljes adatbázis szintű kaszkádolt törlés (`ON DELETE CASCADE`) bevezetése az `auth.users` és a kapcsolódó modulok között, valamint szerveroldali R2 törlési webhook fióktörléskor.
- **2.3.** Supabase Realtime feliratkozás a háztartási táblákra a többeszközös szinkronizációhoz.
- **2.4.** Admin audit napló visszakérdezésének megvalósítása lapozott formában.

### 3. Fázis: Közösségi architektúra kiépítése (Future Social Platform)
- **3.1.** Relációs kapcsolati modell kidolgozása: `user_connections` (barátok/ismerősök) és `user_blocks` (tiltás) táblák.
- **3.2.** Nyilvános/Ismerősi profilláthatóság és biztonságos kereső RPC bevezetése.
- **3.3.** Tárgy- és gyűjteményszintű direkt megosztás felhasználók között (háztartási kényszer nélkül).
- **3.4.** Közösségi aktivitási hírfolyam és interakciók (kommentek, reakciók).

---

## 12. Megvalósíthatósági elkülönítés

### Jelenlegi adatmodellel és architektúrával megvalósítható:
- Lapozás kiterjesztése az összes meglévő nézetre.
- RLS InitPlan és indexelési teljesítményjavítások.
- Háttérben futó cron optimalizálása (kötegelés).
- Biztonsági javítás a meghívások RLS szabályában.
- Több háztartás közötti váltás frontend felületének elkészítése.
- Supabase Realtime értesítések és szinkronizáció a háztartási adatokra.

### Jelentős adatmodell-változtatást és új infrastruktúrát igénylő funkciók:
- **Felhasználók közötti ismerősi/kapcsolati rendszer:** Új entitások (`connections`, `friend_requests`), státuszgéppel és új RLS architektúrával.
- **Közösségi interakciók:** Hozzászólások (`comments`), kedvelések/reakciók (`reactions`).
- **Direkt üzenetváltás (Chat):** Új üzenetkezelő táblák, végpontok közötti vagy szerveroldali jogosultságkezelés és dedikált Realtime szobák.
- **Spam- és visszaélésvédelem:** Rate-limiting middleware, külső kulcs-érték tároló (pl. Redis/Upstash), tartalomellenőrzés.

---

## 13. Biztonságos terheléses tesztterv (Staging környezetre)

> [!CAUTION]
> **Éles környezetben nagy terheléses teszt futtatása TILOS!** A méréseket kizárólag izolált Supabase staging projekten szabad elvégezni.

### Javasolt tesztkörnyezet és eszközök:
- **Eszköz:** `k6` (Grafana) vagy `Locust` load testing script.
- **Adatgenerálás:** Tölts fel a staging adatbázisba:
  - 1 000 tesztfelhasználót,
  - 50 000 tárgyat (változatos kategóriákkal és helyszínekkel),
  - 200 háztartást különböző jogosultsági beállításokkal.

### Tesztlépések:
1. **T1: Keresési és lapozási stressz-teszt:**
   - 100 párhuzamos virtuális felhasználó (VU) futtat véletlenszerű szöveges keresést és lapozást az `items` táblán.
   - *Mért mutatók:* p95 válaszidő (elvárás: < 250ms), PostgreSQL CPU használat.
2. **T2: RLS terhelési profil:**
   - Párhuzamos lekérdezések futtatása olyan háztartási tagokkal, akiknél szigorú moduláris és helyszínalapú szűrés van érvényben.
   - *Mért mutatók:* `can_access_shared_item` végrehajtási ideje az `auth_rls_initplan` optimalizálás előtt és után.
3. **T3: Párhuzamos fájlfeltöltés R2-re:**
   - 50 egyidejű 5-10 MB-os képfeltöltés a `storage-r2` Edge Functionön keresztül.
   - *Mért mutatók:* Edge Function hibaráta (5xx), presigned URL generálási késleltetés.

---

## 14. Végső értékelés

### Értékelési mátrix (0–5 skála)

| Értékelt terület | Pontszám (0–5) | Indoklás |
| :--- | :---: | :--- |
| **Közösségi funkciók jelenlegi fejlettsége** | **1 / 5** | Nincs ismerősi kapcsolat, követés, kommentezés, üzenetküldés vagy nyilvános profil. |
| **Felhasználók közötti kapcsolatok kezelése** | **2 / 5** | A családi háztartási modell és a megosztási linkek működnek, de hiányzik a direkt 1:1 kapcsolat. |
| **Jogosultsági és adatvédelmi biztonság** | **3 / 5** | Erős és granuláris RLS szabályrendszer, de az `invites` táblán adatszivárgási rés van. |
| **Adatbázis-skálázhatóság** | **2 / 5** | 67 RLS initplan hiba, hiányzó rendezési/keresési indexek, lapozatlan lekérdezések. |
| **Frontend-teljesítmény** | **2 / 5** | Monolitikus belépéskori betöltés, LocalStorage korlátok, lapozás hiánya a modulok 90%-ában. |
| **Fájlkezelés és Storage (Cloudflare R2)** | **4 / 5** | Kiváló kliensoldali WebP konverzió, biztonságos proxy Edge Function, elszeparált dokumentumok. |
| **Háttérfolyamatok és értesítések** | **2 / 5** | Működő e-mail küldés, de a cron Edge Function skálázhatatlan, és nincs Realtime támogatás. |
| **Megfigyelhetőség és üzemeltetés** | **2 / 5** | Alapvető Supabase naplózás van, de az admin audit napló visszakérdezése a kliensen nem működik. |

---

## 15. Záró válaszok a kötelező kérdésekre

1. **A Thingor jelenleg személyes tárgynyilvántartó, megosztási platform vagy közösségi platform?**  
   A Thingor jelenleg **személyes tárgynyilvántartó és szűk körű családi háztartási megosztóplatform**. Egyáltalán nem minősül közösségi platformnak.
2. **Melyek a legnagyobb akadályok a közösségi funkciók bevezetése előtt?**  
   - A relációs kapcsolati adatmodell teljes hiánya (nincs ismerős, tiltás, követés, hírfolyam tábla).
   - A profilok zárt RLS architektúrája, ami ellehetetleníti a felhasználók felfedezését és keresését.
   - A valós idejű kommunikációs infrastruktúra (Supabase Realtime) teljes hiánya a frontend rétegben.
3. **Melyek a legnagyobb kockázatok a felhasználószám növekedésekor?**  
   - A frontend LocalStorage memóriaplaponja (`QuotaExceededError`) a belépéskori lapozatlan adatbetöltés miatt.
   - Az adatbázis CPU túlterhelése az `auth_rls_initplan` (67 RLS szabály) és a hiányzó indexek miatt.
   - A háttérben futó lejárati cron Edge Function összeomlása a lapozatlan lekérdezés következtében.
4. **Mi az első öt legfontosabb fejlesztési feladat?**  
   1. **Frontend adatszinkronizáció átalakítása:** A belépéskori tömeges `select('*')` és LocalStorage mentés megszüntetése, igény szerinti lekérések bevezetése.
   2. **67 RLS szabály javítása:** `auth.uid()` cseréje `(select auth.uid())` formára az adatbázis tehermentesítéséhez.
   3. **Meghívási RLS javítás:** A függő meghívások szivárgásának megszüntetése a `household_invites` táblán.
   4. **`process-notifications` cron kötegelése:** Lapozott, hatékony feldolgozás bevezetése a lejárati értesítő Edge Functionben.
   5. **Adatbázis indexelés:** `created_at` B-tree és szöveges `pg_trgm` GIN indexek felhelyezése az `items` táblára.
5. **Milyen mérési eredmények szükségesek a felelős kijelentéshez?**  
   - Minimum 100 egyidejű virtuális felhasználóval lefutatott terheléses teszt (pl. k6) eredménye, ahol a p95 válaszidő igazoltan 300 ms alatt marad.
   - Legalább 50 000 rekordos szintetikus adatbázison végzett `EXPLAIN ANALYZE` mérés, amely bizonyítja, hogy a keresési és lapozási lekérdezések indexet használnak és nem lép fel Sequential Scan.
