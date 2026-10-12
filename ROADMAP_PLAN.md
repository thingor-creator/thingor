# THINGOR — MESTERFEJLESZTÉSI ÉS MÉRFÖLDKŐ TERV (ROADMAP PLAN)

Ez a dokumentum rögzíti a Thingor platform összes hátralévő mérföldkövének teljes körű, minden technológiai és üzleti szempontot figyelembe vevő végrehajtási tervét. A mérföldköveken lépésről lépésre haladunk végig, az elkészült feladatokat folyamatosan pipálva (`[x]`), a végén pedig átfogó teszteléssel zárva.

---

## Áttekintő Mérföldkő-mátrix

| Mérföldkő | Modul / Feladat | Fő cél | Állapot |
|---|---|---|---|
| **Mérföldkő 6** | **Teljesítmény & Preferenciák** | Dashboard RPC aggregáció (10k-50k skálázás) & `profiles.preferences` JSONB | [x] Elkészült |
| **Mérföldkő 7** | **Kölcsönadás Modul (Lending)** | Kölcsönadott tárgyak, határidők, partnerek, értesítések | [x] Elkészült |
| **Mérföldkő 8** | **Gyűjtemények Modul (Collections)** | Tematikus katalógusok (érmék, könyvek, órák stb.), gyűjtői érték | [x] Elkészült |
| **Mérföldkő 9** | **Spájz & Készletek (Pantry)** | Fogyóeszközök, mennyiségek, lejárati idők, bevásárlólista | [ ] Folyamatban |
| **Mérföldkő 10** | **Védett Széf Modul (Vault)** | PIN/jelszóval védett privát leltár & dokumentumok | [ ] Tervezve |
| **Mérföldkő 11** | **Rendszerteszt & Szinkronizáció** | Végponttól végpontig tartó audit, hibajavítás, Supabase & GitHub szinkron | [ ] Tervezve |

---

## 6. MÉRFÖLDKŐ: Teljesítmény-aggregáció & Felhő-preferenciák

### Cél
Kiváltani a bejelentkezéskori korlátlan `items` letöltést szerveroldali aggregációra, és bevezetni a keresztplatformos felhasználói menü-testreszabást.

### Feladatlista
- [x] **6.1. Adatbázis Migráció (`20261013_dashboard_metrics_and_preferences.sql`):**
  - [x] `profiles.preferences` JSONB oszlop létrehozása alapértelmezett beállításokkal (`pinned_modules`, `module_order`, `hidden_modules`, `compact_mode`).
  - [x] `public.get_dashboard_metrics()` tárolt eljárás (RPC) létrehozása:
    - Visszaadja a tárgyak darabszámát (`total_items`), összértékét (`total_value`), aktív és lejáró garanciákat (`active_warranties`, `expiring_warranties`), karbantartásra váró tételeket (`pending_repairs`), anélkül, hogy a teljes táblát le kellene tölteni.
  - [x] RLS és jogosultságok: az RPC biztonságos, kizárólag az aktuális felhasználó (`auth.uid()`) és a saját háztartása adatait aggregálja.
- [x] **6.2. Alkalmazás Állapotkezelés (`AppContext.tsx`):**
  - [x] Az induláskori és változáskori szerveroldali `get_dashboard_metrics` RPC integráció (`dashboardMetrics`, `refreshDashboardMetrics`).
  - [x] Felhasználói preferenciák kezelő függvényei: `updateUserPreferences(newPrefs)` mentése Supabase-be és lokális fallback cache-be.
- [x] **6.3. Felhasználói Felület:**
  - [x] [DashboardView.tsx](file:///c:/Users/User/thingor/src/components/DashboardView.tsx) átkötése a szerveroldali aggregált metrikákra.
  - [x] Felhőalapú preferenciák integrációja és megőrzése.
- [x] **6.4. Tesztelés & Validáció:**
  - [x] RPC hívás tesztelve, TypeScript és lint validálva, azonnali betöltési sebesség.

---

## 7. MÉRFÖLDKŐ: Kölcsönadás & Határidőkövető Modul (Lending Tracker)

### Cél
Pontos nyilvántartás arról, hogy a felhasználó melyik tárgyát kinek, mikor adta kölcsön, mikorra várja vissza, és melyek a késedelmes tételek.

### Feladatlista
- [x] **7.1. Adatbázis Migráció (`20261013_lending_schema.sql`):**
  - [x] `public.item_loans` tábla létrehozása:
    - `id` (UUID PK), `item_id` (UUID FK -> items.id ON DELETE CASCADE), `user_id` (UUID FK), `borrower_name` (TEXT NOT NULL), `borrower_contact` (TEXT), `borrower_email` (TEXT), `lent_date` (DATE NOT NULL), `expected_return_date` (DATE), `actual_return_date` (DATE), `status` (TEXT: 'active', 'returned', 'overdue'), `notes` (TEXT), `created_at`, `updated_at`.
  - [x] Indexek a gyors kereséshez (`user_id`, `item_id`, `status`).
  - [x] RLS szabályok: a felhasználó csak saját vagy háztartásbeli tárgyaihoz kapcsolódó kölcsönzéseket kezelhet.
- [x] **7.2. TypeScript Típusok & Szolgáltatások (`types/index.ts`, `AppContext.tsx`):**
  - [x] `ItemLoan` típus, CRUD függvények (`addLoan`, `updateLoan`, `returnLoan`, `deleteLoan`).
  - [x] Integráció az értesítési motorral: lejáró vagy késedelmes kölcsönzés automatikus jelzése a harang ikon alatt.
- [x] **7.3. Felhasználói Felület (`src/components/LendingView.tsx`):**
  - [x] Kölcsönzési lista szűrőkkel (Aktív / Visszahozva / Késedelmes).
  - [x] Új kölcsönadás rögzítése modál (tárgy kiválasztó, partner neve, elérhetősége, határidő).
  - [x] Gyors "Visszahozva" egykattintásos akciógomb.
  - [x] Tárgy adatlapon ([ItemDetailModal.tsx](file:///c:/Users/User/thingor/src/components/ItemDetailModal.tsx)) kölcsönzési státusz jelvény és kölcsönzési előzmények.
- [x] **7.4. Menü Integráció:**
  - [x] Beillesztés a Modulok legördülőbe asztali gépen és a mobil Drawerbe, fordítások (`hu` / `en`).

---

## 8. MÉRFÖLDKŐ: Gyűjtemények Modul (Collections & Curated Catalogs)

### Cél
Különleges, tematikus gyűjtemények (könyvek, érmék, órák, borok, műszaki cikkek, lemezek) rendszerezése egyedi gyűjtői attribútumokkal és galériával.

### Feladatlista
- [x] **8.1. Adatbázis Migráció (`20261013_collections_schema.sql`):**
  - [x] `public.collections` tábla:
    - `id` (UUID PK), `user_id` (UUID FK), `name` (TEXT NOT NULL), `description` (TEXT), `collection_type` (TEXT: 'books', 'coins', 'watches', 'wine', 'records', 'general'), `cover_image_url` (TEXT), `is_public` (BOOLEAN DEFAULT false), `created_at`, `updated_at`.
  - [x] `public.collection_items` kapcsolótábla:
    - `id` (UUID PK), `collection_id` (UUID FK -> collections.id ON DELETE CASCADE), `item_id` (UUID FK -> items.id ON DELETE CASCADE), `collector_grade` (TEXT), `rarity` (TEXT), `acquired_year` (INTEGER), `catalog_number` (TEXT), `estimated_collector_value` (NUMERIC), `custom_attributes` (JSONB).
  - [x] RLS szabályok és integritás.
- [x] **8.2. Frontend Típusok & Logika (`src/types/index.ts`, `AppContext.tsx`):**
  - [x] `Collection`, `CollectionItem` típusok, gyűjtemények CRUD és tárgyak gyűjteményhez rendelése.
- [x] **8.3. Felhasználói Felület (`src/components/CollectionsView.tsx`):**
  - [x] Gyűjtemények kártyás áttekintője (borítókép, darabszám, becsült gyűjteményi összérték).
  - [x] Gyűjtemény részletező nézet: tárgyak vizuális katalógusa, egyedi gyűjtői szűrők és mezők.
  - [x] Új gyűjtemény létrehozó modál típusválasztóval.
- [x] **8.4. Menü & Integráció:**
  - [x] Asztali és mobil navigáció bekötése, kétnyelvű feliratok.

---

## 9. MÉRFÖLDKŐ: Spájz & Készletek / Fogyóeszközök Modul (Pantry & Consumables)

### Cél
Háztartási fogyóeszközök, tisztítószerek és tartós élelmiszerek készletének kezelése minimális készletszinttel és automatikus bevásárlólistával.

### Feladatlista
- [x] **9.1. Adatbázis Migráció (`20261013_pantry_schema.sql`):**
  - [x] `public.pantry_items` tábla:
    - `id` (UUID PK), `user_id` (UUID FK), `household_id` (UUID FK), `name` (TEXT NOT NULL), `category` (TEXT), `current_quantity` (NUMERIC NOT NULL DEFAULT 1), `unit` (TEXT: 'db', 'kg', 'l', 'csomag'), `min_threshold` (NUMERIC DEFAULT 1), `expiration_date` (DATE), `location_id` (UUID FK -> locations.id), `notes` (TEXT), `is_staple` (BOOLEAN DEFAULT true), `created_at`, `updated_at`.
  - [x] RLS szabályok családi megosztással.
- [x] **9.2. Készletkezelési Logika & Bevásárlólista Generátor:**
  - [x] Gyors mennyiségmódosító (`+1`, `-1`), automata státusz (*Elegendő*, *Fogyóban*, *Elfogyott*, *Lejárt*).
  - [x] Automatikus bevásárlólista generálása az elfogyott/fogyóban lévő cikkekből vágólapra másolási és pipa funkcióval.
- [x] **9.3. Felhasználói Felület (`src/components/PantryView.tsx`):**
  - [x] Készletlista gyors gombokkal a készletváltozáshoz.
  - [x] Lejárati naptár & figyelmeztetések.
  - [x] Interaktív bevásárlólista fül.
- [x] **9.4. Menü Integráció:**
  - [x] Beillesztés a Modulok alá asztali és mobil nézetben.

---

## 10. MÉRFÖLDKŐ: Védett Terület / Széf Modul (Vault / Secure Storage)

### Cél
Külön PIN-kóddal zárolt terület a legérzékenyebb értéktárgyak, számlák, garancialevelek, ékszerek vagy szerződések biztonságos kezelésére.

### Feladatlista
- [x] **10.1. Biztonsági & Adatmodell Tervezés (`20261013_vault_schema.sql`):**
  - [x] `public.vault_settings` tábla (felhasználónkénti sózott PIN hash és zárolási időkorlát).
  - [x] `items.is_vault_protected` flag hozzáadása a tárgyakhoz.
  - [x] RLS védelem: az érzékeny rekordok megtekintése kliensoldalon csak feloldott állapotban jelenik meg.
- [x] **10.2. Munkamenet & Kriptográfia (`src/lib/vault.ts`):**
  - [x] Kliensoldali SHA-256 / PBKDF2 PIN ellenőrzés.
  - [x] Automatikus lezárás 5 perc inaktivitás után a memóriából.
- [x] **10.3. Felhasználói Felület (`src/components/VaultView.tsx`):**
  - [x] PIN megadási képernyő (virtuális numerikus billentyűzet & billentyűzet támogatás).
  - [x] PIN beállítása / módosítása modál.
  - [x] Zárolt tárgyak és dokumentumok exkluzív kezelőfelülete.
  - [x] "Tárgy mozgatása széfbe / széfből leltárba" funkció.
- [x] **10.4. Menü Integráció:**
  - [x] Széf ikon a menüben lakat szimbólummal, zárolt állapot visszajelzéssel.

---

## 11. MÉRFÖLDKŐ: Végponti Rendszerteszt, Hibajavítás & Szinkronizáció

### Cél
Az összes új és meglévő funkció alapos, végponti tesztelése, hibamentesítése, fordítása és a teljes projekt szinkronizálása.

### Feladatlista
- [x] **11.1. Teljes Funkcionális Teszt:**
  - [x] Mind a 15 nézet és modul működése (Dashboard, Tárgyak, Helyszínek, Kategóriák, Dokumentumok, Javítások, Finanszírozás, Család, Jegyzetek, Admin, Kölcsönadás, Gyűjtemények, Spájz, Széf).
  - [x] Keresés, szűrés, lapozás tesztelése az összes modulban.
- [x] **11.2. Reszponzív és Mobil UI Ellenőrzés:**
  - [x] Mobil Bottom Bar, FAB `+` gomb, Mobil Drawer menü működése.
  - [x] Sötét és világos témák, safe-area margók ellenőrzése.
- [x] **11.3. Biztonsági és RLS Ellenőrzés:**
  - [x] Jogosultságok tesztelése (admin vs normál vs néző szerepkörök).
  - [x] Zero-secrets audit a frontend kötegben.
- [x] **11.4. Build & Szinkronizáció:**
  - [x] `npm run build` és `npm run lint` hiba nélküli lefutása.
  - [x] Supabase migrációk alkalmazása.
  - [x] GitHub commit és push a `main` ágra.
