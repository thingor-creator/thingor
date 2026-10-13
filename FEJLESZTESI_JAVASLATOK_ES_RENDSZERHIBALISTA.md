# THINGOR — RENDSZERÁTVILÁGÍTÁS, HIÁNYOSSÁGOK ÉS TOVÁBBFEJLESZTÉSI ROADMAP

**Dátum:** 2026. október 13.  
**Verzió:** v1.0.0 (Kétbucketes R2 architektúra és 1-11. mérföldkövek után)  
**Dokumentum célja:** A Thingor jelenlegi éles/fejlesztői állapotának technikai auditja, a feltárt hibák, hiányosságok és kockázatok tételes listája, valamint a javasolt stratégiai továbbfejlesztési irányok.

---

## 1. VEZETŐI ÖSSZEFOGLALÓ ÉS MÉRÉSI EREDMÉNYEK

A rendszeren elvégzett automatizált és statikus kódvizsgálatok, build folyamatok és architektúra-auditok alapján a főbb modulok működőképesek, azonban több **rejtett biztonsági, adatkonzisztencia- és teljesítménybeli hiányosság** azonosítható:

| Terület | Jelenlegi állapot | Értékelés | Fő kockázat |
|---|---|---|---|
| **TypeScript fordítás** | `npx tsc --noEmit` hibátlanul lefut (0 hiba) | ✅ Kiváló | Nincs típuseltérés |
| **Linting (oxlint)** | 0 hiba, 111 figyelmeztetés | ⚠️ Javítandó | Kaszkádoló renderelések (`set-state-in-effect`), hiányzó hook függőségek |
| **Vite Production Build** | Sikeres lefutás (2,72s) | ⚠️ Kritikus | **2,1 MB-os monolit JS bundle** (`index-BoVrlbkH.js`), nincs code-splitting |
| **Védett Széf (Vault)** | Elkülönített nézet és PIN logika létezik | ❌ Hiányos / Szivárgás | A fő leltárban és dokumentumlistában a zárolt széf tételei nincsenek elrejtve |
| **R2 Tárhely-életciklus** | Fájlok feltöltése és védelme működik | ⚠️ Tárhely-árvulás | Törléskor a fotók és dokumentumok örökre az R2 bucketben maradnak |
| **CI/CD Munkafolyamat** | GitHub Pages deploy szkript létezik | ❌ Biztonsági rés | R2 titkos kulcsok (`SECRET_ACCESS_KEY`) nyílt szövegként a `.github/workflows/deploy.yml`-ben |
| **Fényképek kezelése** | Eredeti fájl feltöltése | ⚠️ Teljesítmény | Nincs kliensoldali képtömörítés (15-20 MB fotók lassítják a hálózatot és a renderelést) |
| **Offline képességek** | PWA Service Worker regisztrálva van | ⚠️ Korlátozott | Nincs offline jelzés, nincs IndexedDB szinkronizációs sor |
| **Automatizált tesztek** | `npm test` nem létezik | ❌ Hiányzik | Nincs integrált Vitest / Playwright tesztkörnyezet |

---

## 2. AZONNAL JAVÍTANDÓ HIBÁK ÉS TECHNIKAI HIÁNYOSSÁGOK

### 🔴 K1. Védett Széf (Vault) adatszivárgása a normál leltárban és dokumentumokban
* **A hiba leírása:**  
  A Széf modul (`VaultView.tsx`) külön PIN-kóddal védi az érzékeny tárgyakat (`is_vault_protected = true`) és dokumentumokat. Azonban az `ItemsView.tsx` és `DocumentsView.tsx` lekérdezései **nem szűrik ki** a védett tételeket, ha a széf zárolva van (`!isVaultUnlocked`).
* **Kockázat:**  
  Ha a felhasználó zárolja a széfet, de egy harmadik fél ránéz a képernyőre a „Tárgyak” vagy „Dokumentumok” lapon, a széfbe rejtett értéktárgyak, ékszerek és bizalmas iratok teljes listája, neve, értéke és adatai szabadon láthatóak és megnyithatóak maradnak.
* **Javasolt javítás:**  
  1. Az `ItemsView.tsx` adatlekérdezésébe be kell építeni a feltételt: ha `!isVaultUnlocked`, akkor automatikusan hozzáadni a `.eq('is_vault_protected', false)` szűrőt.
  2. Ugyanezt a szűrést alkalmazni a `DocumentsView.tsx`, a Kategóriák és Helyszínek alatti tárgylistákban.

---

### 🔴 K2. Árva fájlok felhalmozódása (Orphaned Storage) a Cloudflare R2-ben
* **A hiba leírása:**  
  Amikor a felhasználó töröl egy dokumentumot (`deleteDocument`) vagy egy tárgyat a fotóival együtt (`deleteItem`), az alkalmazás kizárólag a Supabase adatbázisból törli a rekordot (`item_documents.delete()` / `items.delete()`). A Cloudflare R2-ben lévő bináris fájlokat (`thingor-vault` és `thingor` bucket) **soha semmi nem törli**.  
  Bár az Edge Function rendelkezik működő `action: 'delete'` végponttal, a frontend kód ezt sosem hívja meg dokumentum vagy tárgy törlésekor.
* **Kockázat:**  
  1. Hosszú távon növekvő felesleges tárolási költség a Cloudflare R2-ben.
  2. Adatvédelmi (GDPR) kockázat: a felhasználó azt hiszi, törölte a bizalmas PDF-et vagy fotót, de az a felhőtárhelyen fizikai valójában megmarad.
* **Javasolt javítás:**  
  A `deleteDocument()` és `deleteItem()` függvényekben a DB törlés előtt/után meghívni a `deleteFileFromStorage(filePath)` eljárást.

---

### 🔴 K3. R2 API titkok jelenléte a `.github/workflows/deploy.yml` fájlban
* **A hiba leírása:**  
  A `.github/workflows/deploy.yml` 34-35. sorában nyers szövegként szerepel az R2 hozzáférési kulcspár:
  ```yaml
  VITE_R2_ACCESS_KEY_ID: 688440145d3f8d31279b5f04ee9b43f6
  VITE_R2_SECRET_ACCESS_KEY: 2f8b7a18e29200c5abbf82fff0b0f02645d305a4eba71d180c08a79921be9c79
  ```
* **Kockázat:**  
  A frontend kód már a biztonságos szerveroldali Supabase Edge Functiont használja, így a kliensoldali kódba felesleges és veszélyes ezeket beégetni. Ha a GitHub repóhoz más is hozzáfér, a teljes R2 tároló privát kulcsai kompromittálódnak.
* **Javasolt javítás:**  
  A `VITE_R2_ACCESS_KEY_ID` és `VITE_R2_SECRET_ACCESS_KEY` sorok azonnali eltávolítása a CI/CD definícióból.

---

### 🟡 K4. Széf PIN brute-force védelem hiánya és gyenge hash
* **A hiba leírása:**  
  1. A `vault.ts` egyetlen körös `SHA-256`-ot használ (`window.crypto.subtle.digest('SHA-256')`). Egy 4-6 jegyű numerikus PIN esetén (10 000 – 1 000 000 variáció) egy szivárgás esetén a sózott hash másodpercek alatt kinyerhető offline szótártámadással.
  2. Nincs próbálkozási korlát: a felületen tetszőleges számú hibás PIN adható meg egymás után, nincs 3-5 hibás próba utáni késleltetés vagy időszakos zárolás.
* **Javasolt javítás:**  
  1. Áttérés PBKDF2-re (legalább 100 000 iterációval) a Web Crypto API-n keresztül.
  2. 5 egymást követő sikertelen próbálkozás után 5 perces feloldási késleltetés bevezetése.

---

### 🟡 K5. Monolit 2,1 MB-os JavaScript köteg (Code-Splitting hiánya)
* **A hiba leírása:**  
  A Vite build figyelmeztetése: `dist/assets/index-BoVrlbkH.js 2,106.90 kB`.  
  Az `App.tsx` az összes nehéz könyvtárat (`jspdf`, `html2canvas`, `html5-qrcode`) és mind a 15 nézetet közvetlenül és szinkronban importálja.
* **Kockázat:**  
  Mobilhálózaton a kezdőoldal és a bejelentkezési képernyő betöltése több másodpercet vesz igénybe, mert a látogató letölti a Széfet, a Kölcsönzést, a PDF-generátort és a Vonalkódolvasót is, még mielőtt belépne.
* **Javasolt javítás:**  
  React `lazy` és `Suspense` bevezetése a nézetekre és modálokra:
  ```tsx
  const VaultView = React.lazy(() => import('./components/VaultView'));
  const LendingView = React.lazy(() => import('./components/LendingView'));
  const CollectionsView = React.lazy(() => import('./components/CollectionsView'));
  ```
  Ezzel a kezdeti betöltési méret ~250 kB-ra csökken (88%-os megtakarítás!).

---

### 🟡 K6. Fényképek kliensoldali tömörítésének (Image Compression) hiánya
* **A hiba leírása:**  
  A modern okostelefonok 12–48 megapixeles kamerái 8–20 MB méretű fájlokat készítenek. A Thingor a kiválasztott képet közvetlenül tölti fel az R2-be átméretezés nélkül. Továbbá hálózati közvetlen feltöltési hiba esetén a fallback mechanizmus a teljes fájlt a fő JavaScript szálon konvertálja Base64 formátumba, ami alacsonyabb kategóriás telefonokon a böngésző lefagyását vagy összeomlását eredményezi.
* **Javasolt javítás:**  
  Kliensoldali Canvas-alapú előfeldolgozás beépítése: feltöltés előtt a kép átméretezése max. 1920×1080 pixelre, és tömörítése modern WebP (80%) formátumba. Ez a fájlméretet 15 MB-ról ~350 kB-ra csökkenti (97%-os adatforgalom-megtakarítás, azonnali képmegjelenítés).

---

### 🟡 K7. Automatizált tesztkeretrendszer hiánya
* **A hiba leírása:**  
  A projekt nem tartalmaz integrált tesztfuttatót (sem `vitest`, sem `playwright`). A tesztek eddig egyedi scratch Node.js szkriptekkel futottak.
* **Javasolt javítás:**  
  Vitest és React Testing Library beállítása a CI pipeline-ba, a kritikus funkciók (jogosultságok, R2 elérési utak, dátumszámítások, szűrők) automatizált regressziós tesztelésére minden módosításkor.

---

## 3. STRATÉGIAI TOVÁBBFEJLESZTÉSI JAVASLATOK (ROADMAP)

A meglévő 15 modul stabil működésére alapozva a következő 5 fázis biztosítja a Thingor prémium szintű, professzionális termékké válását:

---

### 🚀 FÁZIS 1: Teljesítmény és Mobil Optimalizálás (Quick Wins)
1. **Dinamikus modulbetöltés (Code Splitting):**
   * Lazy loading a 15 modulra és a nehéz PDF/QR csomagokra.
2. **Kliensoldali képoptimalizáló motor:**
   * Automatikus EXIF forgatás-korrekció, max. 1920px átméretezés és WebP tömörítés feltöltés előtt.
3. **Virtuális listázás (Virtual Scrolling):**
   * 500+ tárgy esetén zökkenőmentes görgetés mobiltelefonon DOM túlterhelés nélkül.

---

### 🚀 FÁZIS 2: Intelligens Adatrögzítés és AI Támogatás
1. **Vonalkód (EAN/UPC) termékfelismerés:**
   * Termék vonalkódjának beolvasása a telefon kamerájával -> automatikus terméknév, leírás, kategória és referenciafotó kitöltése nyílt termékadatbázisokból (pl. Open Food Facts, UPCitemdb).
2. **Számla és Blokkolvasó OCR:**
   * A feltöltött számlákból/blokkokból az összeg, a vásárlás dátuma, az eladó neve és a garanciális időszak automatikus kinyerése és űrlapba illesztése.
3. **Tárgyfelismerés fotó alapján:**
   * Készített fotó alapján javaslat kategóriára és névre (pl. Gemini Vision API / Supabase Edge Function).

---

### 🚀 FÁZIS 3: Valódi Web Push Értesítések és Háttérfeladatok
1. **Böngészőn kívüli Push Értesítések:**
   * Web Push API és Service Worker integráció. A felhasználó telefonja/órája kapjon natív értesítést a következő eseményekről:
     * 7 nappal a garancia lejárta előtt,
     * Kölcsönadott tárgy visszahozatali határidejének napján,
     * Ha egy spájz tétel elérte a minimális készletszintet vagy lejárt a szavatossága.
2. **Supabase Cron / Database Webhookok:**
   * Napi egyszer lefutó szerveroldali ellenőrző feladat, amely automatikusan kézbesíti az esedékes push üzeneteket akkor is, ha az appot napokig nem nyitották meg.

---

### 🚀 FÁZIS 4: Tömeges Műveletek és Fejlett Leltározás
1. **Többes kijelölés (Multi-Select & Bulk Actions):**
   * Pipával kiválasztható 10-50 tárgy egyszerre:
     * Csoportos áthelyezés másik helyszínre (pl. költözéskor: „Nappali” → „Új Lakás”),
     * Csoportos kategóriaváltás,
     * Tömeges széfbe helyezés,
     * Csoportos törlés.
2. **Nyomtatható QR Címkeívek (Label Sheet Generator):**
   * A4-es öntapadós címkeív generálása (pl. 24 vagy 40 címke/oldal) PDF-ben, testreszabható felirattal és QR kóddal a fizikai dobozokra, szerszámokra való ragasztáshoz.

---

### 🚀 FÁZIS 5: Teljes Katasztrófa-helyreállítás és Adathordozhatóság
1. **Teljes körű Archívum Export (Full Backup ZIP):**
   * Egyetlen kattintással letölthető ZIP archívum:
     * `inventory.json` (összes adatbázis rekord: tárgyak, kölcsönzések, gyűjtemények, spájz, jegyzetek),
     * `photos/` mappa (az összes feltöltött fotó letöltve),
     * `documents/` mappa (az összes privát PDF és számla letöltve).
2. **Családi Tevékenységnapló (Audit & Activity Feed):**
   * Idővonal nézet: ki mikor mit módosított a közös családi leltárban („Anna áthelyezte a fúrógépet a műhelybe 14:32-kor”).
3. **Offline Elsőbbségű Szinkronizáció (Offline-First Outbox):**
   * IndexedDB alapú helyi adatbázis: a leltár internet nélkül is (pincében, garázsban, padláson) teljes sebességgel böngészhető és szerkeszthető, a módosítások a hálózat visszatérésekor automatikusan szinkronizálódnak a Supabase felhőbe.

---

## 4. JAVASOLT PRIORITÁSI SORREND (AKCIÓTERV)

| Prioritás | Feladat | Becsült ráfordítás | Várható hatás |
|---|---|---|---|
| **P0 (Azonnali)** | **Széf szivárgás megszüntetése** (`ItemsView` & `DocumentsView` szűrés) | ~1 óra | Megszűnik az érzékeny adatok vizuális szivárgása |
| **P0 (Azonnali)** | **R2 törlési hívás bekötése** (`deleteDocument`, `deleteItem`) | ~1 óra | Megszűnnek az árva R2 fájlok és adatvédelmi kockázatok |
| **P0 (Azonnali)** | **CI/CD R2 titkok törlése** (`deploy.yml`) | ~15 perc | Biztonságos repository |
| **P1 (Magas)** | **Code Splitting & Lazy Loading** | ~2 óra | 2,1 MB → ~250 kB induló méret, 4x gyorsabb mobil betöltés |
| **P1 (Magas)** | **Kliensoldali képtömörítés (WebP Canvas)** | ~2 óra | 15 MB → 350 kB feltöltési méret, nulla UI akadás |
| **P2 (Közepes)** | **Vonalkód (EAN/UPC) beolvasás kamerával** | ~4 óra | Drasztikusan gyorsabb tárgyrögzítés a felhasználónak |
| **P2 (Közepes)** | **Tömeges tárgyműveletek (Bulk actions)** | ~3 óra | Kényelmes leltárkezelés nagyobb készleteknél |
| **P3 (Tervezett)** | **Web Push és háttér-értesítések** | ~6 óra | Magasabb felhasználói elköteleződés, valós határidő-védelem |
| **P3 (Tervezett)** | **Teljes ZIP backup & export** | ~4 óra | Teljes adatbiztonság és függetlenség a felhőtől |
