# THINGOR — FEATURE_AUDIT_AND_PLAN.md RÉSZLETES FELÜLVIZSGÁLATA ÉS TERVPONTOSÍTÁSA

**Munkamód:** STRICT READ-ONLY — AUDIT VALIDÁLÁS ÉS TERVPONTOSÍTÁS  
**Felülvizsgálat dátuma:** 2026. október 17.  
**Státusz:** Felülvizsgált és pontosított terv (Fejlesztés NEM indult el, jóváhagyásra vár)  
**Dokumentum célja:** Az 5 érintett funkcionális terület független bizonyítása, a korábbi audit állításainak tény-alapú szétválasztása (Bizonyított tény / Valószínű ok / Nyitott kérdés), a biztonsági kockázatok felmérése, valamint a szigorú függőségeket és ellenőrzéseket tartalmazó végrehajtható fejlesztési terv rögzítése.

---

## 1. VEZETŐI ÖSSZEFOGLALÓ ÉS BIZONYÍTÁSI MÁTRIX

A szigorú read-only audit során minden releváns forráskódot, Postgres sémát, idegen kulcsot, triggert, RLS-policit és a Cloudflare R2 vödrök aktuális állapotát közvetlenül ellenőriztük.

| Terület | Korábbi állítás | Validálási státusz | Bizonyíték / Műszaki tény |
|---|---|---|---|
| **A. Spájz** | Kategóriák fixen beégetve, nincs saját kategória felvétel | **Bizonyított tény** | A `pantry_items.category` adatbázisban sima `text` (nincs táblája). A `PantryView.tsx`-ben a `categoriesList` egy 6 elemű statikus tömb; a modál és a szűrő is csak ezt engedi. |
| **B. Gyűjtemények** | Kötelező az `items` létezése; a gyűjtői tételek elárasztják a fő leltárt | **Bizonyított tény** | `collection_items.item_id` oszlop `UUID NOT NULL REFERENCES items(id)`. Továbbá: a törlés (`removeItemFromCollection`) és hozzáadás (`addItemToCollection`) az `AppContext.tsx`-ben jelenleg kötelezően `isUUID(itemId)`-t követel meg! |
| **C. Kölcsönzés** | Nincs kölcsönadható készlet; a partnerek csak manuális szövegek | **Bizonyított tény** | `item_loans` táblában a partneradatok (`borrower_name`, `borrower_contact`, `borrower_email`) szabad szövegek, nincs címtár; az `items` táblában nincs kölcsönadhatósági flag (`is_lendable`). |
| **D. Jegyzetek** | A jegyzetből konvertált tárgy gombja semmit sem csinál; a tárgy nem jött létre | **Bizonyított tény** | A DB-ben a `quick_notes` rekord: `is_converted: true`, de `converted_item_id: NULL`! Az `items` táblában a tétel nem létezik. A gombon `note.converted_item_id && setSelectedItemId(...)` van, ami `null` esetén le sem fut. |
| **E. Dokumentumok** | A feltöltött dokumentum nem nyílik meg; hiányzik a letöltés funkció | **Bizonyított tény** | A PDF fizikailag épen létezik az R2 `thingor-vault` vödörben. Az Edge Function jogosultság-ellenőrzője egy nem létező oszlopra (`file_path`) szűrt az `item_documents` táblában (`42703: column does not exist`), ami 403 hibát okoz a családtagoknál; a fallback 404 CDN URL-re fut. A felületen nincs Letöltés gomb. |

---

## 2. MODULONKÉNTI RÉSZLETES AUDIT ÉS BIZONYÍTÁS

### A. Spájz és fogyóeszközök — Egyedi kategóriák

#### 1. Bizonyított tények
- **Séma vizsgálat:** A `pantry_items` táblában a `category` mező típusa `text`, `is_nullable: YES`, alapértelmezett értéke `null`. Nincs idegen kulcs kényszer és nincs ENUM/CHECK megszorítás.
- **Entitás vizsgálat:** Nincs külön `pantry_categories` vagy hasonló tábla az adatbázisban. A kategória kizárólag a tételek sorában lévő szöveg.
- **Forráskód vizsgálat:** A [`src/components/PantryView.tsx`](file:///c:/Users/User/thingor/src/components/PantryView.tsx#L65-L74) komponensben a `categoriesList` egy fix memóriabeli konstans:
  `['Élelmiszer', 'Tisztítószer', 'Higiénia & Kozmetikum', 'Irodaszer', 'Barkács & Műhely', 'Egyéb']`.
- **Form és szűrő vizsgálat:** Mind a modál kategóriaválasztója (`<select>` a 620. sornál), mind a fejlécszűrő (`<select>` a 332. sornál) kizárólag a fenti 6 statikus elemet járja be `categoriesList.map(...)`-pal.
- **Meglévő adatok:** A táblában jelenleg 1 tétel található (`"Dymista szuszpenziós orrspray"`), amelynek kategóriája `"Egyéb"`.

#### 2. Valószínű okok és működési korlátok
- Mivel a kategóriák nincsenek külön perzisztálva, ha egy kategóriát tisztán a meglévő tételekből gyűjtünk ki, akkor egy újonnan felvett kategória addig marad a listában, amíg létezik hozzá rendelt tétel. Ha az utolsó tételt is törlik, a kategória automatikusan kikerül a listából.

#### 3. Nyitott kérdések
- Szükséges-e a felhasználó által begépelt egyedi kategóriák megőrzése akkor is, ha jelenleg 0 tétel van bennük? (Javaslat: nem indokolt új adatbázistáblát létrehozni; az alapértelmezett 6 kategória fix gyári készletként megmarad, a meglévő tételek kategóriái dinamikusan hozzáadódnak, a kliens pedig ideiglenesen megőrzi a frissen hozzáadott kategóriát a session során).

#### 4. Javasolt minimális és biztonságos megoldás
1. A `PantryView.tsx`-ben a kategóriák listáját dinamikusan származtatjuk:
   `Array.from(new Set([...categoriesList, ...pantryItems.map(i => i.category).filter(Boolean)]))`.
2. A készletcikk modálban a kategória választó kap egy `+ Új kategória megadása...` opciót, amelynek kiválasztásakor megjelenik egy tiszta szöveges beviteli mező (`newCategoryInput`).
3. Mentéskor közvetlenül ez a szöveg íródik a `pantry_items.category` mezőbe.

---

### B. Gyűjtemények és katalógusok — Önálló tételek és dinamikus szűrők

#### 1. Bizonyított tények
- **Adatbázis séma és megszorítások:**
  - `collection_items.collection_id`: `UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE`.
  - `collection_items.item_id`: `UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE`.
  - Megszorítás: `uq_collection_item UNIQUE (collection_id, item_id)`.
- **RLS-szabályok vizsgálata:**
  - A `collection_items` RLS szabályai (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) KIZÁRÓLAG a `collections` táblához kapcsolódnak (`WHERE c.id = collection_items.collection_id AND (c.user_id = auth.uid() OR c.is_public = true OR is_admin())`).
  - Az RLS szabályok NEM hivatkoznak az `items` táblára.
- **Kliensoldali korlátok az AppContext-ben:**
  - [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L2611): Az `addItemToCollection` kötelezően vizsgálja: `isUUID(itemId)`. Ha `itemId` hiányzik, az adatbázisba nem ír semmit.
  - [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L2644): A `removeItemFromCollection` paraméterként `itemId: string`-et vár, és `collection_id = ... AND item_id = itemId` alapján töröl.
  - [`src/components/CollectionsView.tsx`](file:///c:/Users/User/thingor/src/components/CollectionsView.tsx#L523): A törlés gomb: `onClick={() => removeItemFromCollection(selectedCollectionId, ci.item_id)}`.
- **Megjelenítési korlát:**
  - A `CollectionsView.tsx` 101. során: `const item = items.find(i => i.id === rel.item_id);`. A kártya renderelése az `item.photo_url`-t és `item.name`-et várja. Önálló tétel esetén az `item` undefined.

#### 2. Valószínű okok
- A gyűjtemény modult eredetileg relációs kapcsolótáblának tervezték a leltári tárgyak rendszerezésére. A gyűjtői igény (szalvéták, bélyegek, ásványok, amelyek nem háztartási vagyontárgyak) miatt ez a modell szűk keresztmetszetté vált.

#### 3. Nyitott kérdések
- Mi történjen a meglévő egyedi megszorítással (`uq_collection_item`)?
  - PostgreSQL-ben a standard B-tree UNIQUE index megengedi a több `NULL` értéket az `item_id` oszlopban. Így az önálló tételek felvételekor nem keletkezik ütközés.
- Hogyan törlünk egy önálló gyűjteményi tételt?
  - A törlést át kell állítani az elsődleges kulcs (`collection_items.id`) alapú törlésre!

#### 4. Javasolt minimális és biztonságos megoldás
1. **Séma módosítás:**
   - `ALTER TABLE collection_items ALTER COLUMN item_id DROP NOT NULL;`
   - Oszlopok hozzáadása: `name TEXT`, `description TEXT`, `photo_url TEXT`, `quantity INTEGER DEFAULT 1`.
2. **Kliensoldali függvények bővítése:**
   - `deleteCollectionItem(collectionItemId: string)`: a rekord `id`-ja alapján töröl az adatbázisból és a memóriából.
   - `addStandaloneCollectionItem(collectionId, data)` vagy hibrid `addItemToCollection`, amely támogatja a közvetlen mezők mentését.
3. **UI megjelenítés:**
   - A tétel kártyán: `const title = ci.item?.name || ci.name || 'Névtelen tétel';`.
   - A fotónál: `const photo = ci.item?.photo_url || ci.photo_url;`.
4. **Dinamikus szűrősáv:**
   - Csak az `all` fül és a `Array.from(new Set(collections.map(c => c.collection_type)))` jelenjen meg gombként a gyűjtemények főoldalán.

---

### C. Kölcsönzés és megosztás

#### 1. Bizonyított tények
- **Adatbázis séma:**
  - `item_loans` mezői: `borrower_name` (text, NOT NULL), `borrower_contact` (text, nullable), `borrower_email` (text, nullable).
  - Nincs idegen kulcs partner- vagy címtártáblára.
- **Leltári tárgyak vizsgálata:**
  - Az `items` táblában nincs kölcsönzési jelölő (`is_lendable`) vagy feltétel (`lending_terms`) oszlop.
- **Háztartási modell korlátai:**
  - A `household_members` tagjai belső jogosultságokkal (teljes vagy szűrt leltár-hozzáféréssel) rendelkeznek. Külső barátokat, szomszédokat oda felvenni súlyos biztonsági hiba lenne, mert hozzáférnének a privát leltári adatokhoz.

#### 2. Biztonsági követelmények és kockázatok
- **Kockázat:** Egy nyilvános vagy tokenes link felületén véletlenül kiszivároghatnak olyan tárgyadatok, amelyek nem publikusak (pl. vételár, számlák, garanciák, pontos helyiség, egyéb privát tárgyak).
- **Követelmény:**
  - Külső megosztásnál KIZÁRÓLAG a felhasználó által explicit `is_lendable = true`-ra jelölt tárgyak neve, leírása, fotója és kölcsönzési feltétele jelenhet meg.
  - A megosztásnak bármikor egyetlen kattintással visszavonhatónak kell lennie (`is_lendable = false`).

#### 3. Nyitott kérdések
- Szükséges-e azonnal külső webes nyilvános linket készíteni, vagy első lépésként a belső címtár és a formázott csevegő-üzenet (Messenger/WhatsApp szöveges kivonat másolása) a biztonságosabb?
  - **Döntési javaslat:** 1. lépésként a belső címjegyzék (`lending_contacts`) és az `is_lendable` katalógus + csevegőbe másolható megosztás készítendő el, ami 100%-ban zárt és biztonságos. A webes publikus nézet külön emberi jóváhagyáshoz kötött.

#### 4. Javasolt minimális és biztonságos megoldás
1. **Adatbázis:**
   - `items` bővítése: `is_lendable BOOLEAN DEFAULT false`, `lending_terms TEXT`.
   - Új `lending_contacts` tábla a barátoknak (RLS: csak a létrehozó `user_id` férhet hozzá).
2. **UI:**
   - Kétfülös felület a `LendingView.tsx`-ben:
     - 1. fül: „Kiadott tárgyak naplója” (a jelenlegi funkció, de a kölcsönvevő neve kiválasztható a barátok közül).
     - 2. fül: „Kölcsönadható eszközeim” (gyors bejelölés a leltárból, feltételek szerkesztése, lista vágólapra másolása megosztáshoz).

---

### D. Gyors jegyzetek — Tárggyá alakítás és megnyitási hiba

#### 1. Bizonyított tények
- **A konkrét rekord vizsgálata az adatbázisban:**
  - Lekérdezés: `SELECT id, title, is_converted, converted_item_id FROM quick_notes;`
  - Eredmény: `id: "08ce955e-dffd-4340-b500-ca242feb92da"`, `title: "lapos Vas"`, `is_converted: true`, `converted_item_id: null`.
- **Az items tábla vizsgálata:**
  - Nincs "lapos Vas" vagy "Vas" nevű rekord az `items` táblában!
- **A gomb viselkedése a kódban:**
  - [`src/components/NotesView.tsx`](file:///c:/Users/User/thingor/src/components/NotesView.tsx#L230):
    `onClick={() => note.converted_item_id && setSelectedItemId(note.converted_item_id)}`.
  - Mivel `note.converted_item_id` értéke `null`, a feltétel hamis, így a kattintásra semmi sem történik!
- **Séma kényszerek:**
  - `quick_notes.converted_item_id` típusa `UUID`.
  - Ha az `addItem` bármilyen okból fallback ágra futott, az `item-' + Date.now()` stringet adott vissza, amit a Postgres UUID oszlopa elutasított vagy nullként kezelt.

#### 2. Valószínű okok
- Az átalakítás során az `addItem` nem generált valódi Postgres UUID-t vagy a hálózati/kliens állapot miatt a kérés nem íródott be az `items` táblába, de a `quick_notes.update` lefutott `is_converted: true`-val.
- Az átalakítási logikában hiányzik a tranzakció-biztonság: a jegyzet státusza úgy váltott "konvertáltra", hogy a cél-rekord nem jött létre.

#### 3. Nyitott kérdések
- Mi történjen a meglévő elárvult jegyzettel?
  - Biztonságos read-only megállapítás: a jegyzet visszaállítható `is_converted = false`-ra, így újra megnyomhatóvá válik a tárggyá alakítás.

#### 4. Javasolt minimális és biztonságos megoldás
1. **Atomi átalakítási logika (`AppContext.tsx`):**
   - Először az `items.insert` fut le.
   - Szigorúan ellenőrizni kell: `data?.id && isUUID(data.id)`.
   - Csak sikeres beszúrás és valós UUID esetén fut le a `quick_notes.update({ is_converted: true, converted_item_id: data.id })`.
   - Ha a tárgy létrehozása elbukik, a jegyzet marad `is_converted: false`, és a felhasználó hibaüzenetet kap (Toast).
2. **UI navigáció javítása (`NotesView.tsx`):**
   - A gomb ellenőrzi a kapcsolt ID-t: ha létezik, beállítja a `setSelectedItemId(id)`-t ÉS átváltja a nézetet: `setCurrentView('items')`.
   - Ha az ID hiányzik vagy érvénytelen, felajánlja az azonnali újrakonvertálást.

---

### E. Dokumentumok és R2

#### 1. Bizonyított tények
- **Fizikai tárolás ellenőrzése:**
  - A dokumentum (`Regisztralt_gep_adatlap.pdf`, 481 976 bájt) 100%-ban épen és olvashatóan létezik a Cloudflare R2 `thingor-vault` vödrében.
- **Séma vizsgálat:**
  - Az `item_documents` táblában létező oszlopok: `id`, `item_id`, `user_id`, `file_name`, `file_url`, `document_type`, `created_at`, `is_vault_protected`.
  - **NINCS `file_path` oszlop!**
- **Edge Function forráskód vizsgálat:**
  - A `storage-r2/index.ts` 140-160 soraiban a `checkItemDocumentAccess` függvény ezt a kódot tartalmazza:
    `supabaseUserClient.from("item_documents").select("id, is_vault_protected").eq("file_path", filePath).maybeSingle()`
  - Mivel a `file_path` oszlop nem létezik, a lekérdezés mindig hibát dob (`Postgres error: column "file_path" does not exist`).
  - Emiatt minden olyan felhasználó, aki nem az eredeti tulajdonos (pl. családtagok), 403 Forbidden választ kap.
- **Fallback és popup hiba:**
  - Ha az Edge Function nem ad signed URL-t, a kliensoldali `getR2FileSignedUrl` visszaadja a nyers `doc.file_url`-t (`https://media.thingor.com/...`).
  - Mivel a dokumentumok szándékosan privátak és nincsenek publikus CDN-en, a böngészőben **404 Not Found** jelenik meg.
  - A felületen nincs Letöltés gomb, csak Megtekintés.

#### 2. Külön biztonsági elemzés: `file_path` vs `file_url` és az ILIKE kockázatai
- **A korábbi terv hiányossága:** A korábbi tervezetben felmerült az `ilike '%filePath%'` keresés.
- **Bizonyított biztonsági kockázat:** Az `ILIKE '%...%'` részleges szövegegyezést vizsgál. Ha egy felhasználó fájlneve egy másik fájl elérési útjának részletét képezi, a részleges egyezés jogosulatlan hozzáféréshez (Insecure Direct Object Reference - IDOR) vezethet!
- **Biztonságos megoldás:**
  - Az `item_documents` táblához hozzá kell adni a `file_path TEXT` oszlopot (amely pontosan az R2 objektumkulcsot tartalmazza: `<user_id>/documents/<timestamp>_<filename>`), és a meglévő rekordot fel kell tölteni a `file_url`-ből kinyert útvonallal.
  - Az Edge Functionben KIZÁRÓLAG pontos, indexelt egyezést (`.eq("file_path", filePath)`) szabad használni!

#### 3. Letöltés követelmény
- A megtekintés (`inline`) és a letöltés (`attachment`) két külön művelet:
  - Megtekintésnél az S3 `ResponseContentDisposition: inline`.
  - Letöltésnél az S3 `ResponseContentDisposition: attachment; filename="<eredeti_fájlnév>"`.
  - A felületen mindkét gombnak helyet kell kapnia (`Megtekintés` és `Letöltés`).

---

## 3. PONTOSÍTOTT, FÜGGŐSÉGEKET KÖVETŐ VÉGREHAJTÁSI TERV

### 0. Előfeltételek és Emberi Jóváhagyási Pontok
> [!IMPORTANT]
> Az alábbi lépések bármelyikének megkezdése előtt emberi jóváhagyás szükséges:
> 1. Jóváhagyás a Supabase migráció futtatására (`ALTER TABLE` és új táblák).
> 2. Jóváhagyás a `storage-r2` Supabase Edge Function frissített verziójának deployolására.

---

### 1. Fázis: Adatbázis sémák bővítése (Supabase DDL)

**Cél:** A hiányzó mezők és kapcsolatok létrehozása az adatok integritásának sérelme nélkül.

#### Előzetes ellenőrzés (Pre-check):
- Ellenőrizni, hogy fut-e aktív tranzakció vagy zárolás a táblákon.
- Ellenőrizni a meglévő sorok számát.

#### Végrehajtandó DDL (`supabase/migrations/20261017_audit_improvements.sql`):
```sql
-- 1. GYŰJTEMÉNYEK: Önálló tételek támogatása
ALTER TABLE public.collection_items ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- 2. DOKUMENTUMOK: Pontos és biztonságos objektumazonosítás (ILIKE helyett!)
ALTER TABLE public.item_documents
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Meglévő rekord adatának biztonságos kitöltése a tárolt file_url-ből
UPDATE public.item_documents
SET file_path = substring(file_url from '([^/]+/[^/]+/[^/]+)$')
WHERE file_path IS NULL AND file_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_item_documents_file_path ON public.item_documents(file_path);

-- 3. KÖLCSÖNZÉS: Kölcsönadható tárgyak attribútumai
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_lendable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lending_terms TEXT;

-- 4. KÖLCSÖNZÉS: Címjegyzék külső partnereknek
CREATE TABLE IF NOT EXISTS public.lending_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'friend',
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lending_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lending contacts"
  ON public.lending_contacts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. HIBAJAVÍTÁS: Elárvult quick_notes rekord visszaállítása
UPDATE public.quick_notes
SET is_converted = false, converted_item_id = NULL
WHERE id = '08ce955e-dffd-4340-b500-ca242feb92da' AND converted_item_id IS NULL;
```

#### Utólagos ellenőrzés (Post-check):
- Ellenőrizni, hogy a `collection_items.item_id` valóban nullable lett.
- Ellenőrizni, hogy az `item_documents.file_path` értéke `eeb68bcf-005c-4353-9042-4fc7fa26a888/documents/1791565210692_Regisztralt_gep_adatlap.pdf` lett.
- Ellenőrizni, hogy a `quick_notes` rekord `is_converted` értéke `false` lett.

---

### 2. Fázis: Backend / Edge Function javítás és deploy (`storage-r2`)

**Érintett fájl:** `supabase/functions/storage-r2/index.ts`

1. **Jogosultsági ellenőrzés javítása:**
   - A `checkItemDocumentAccess` függvényben a lekérdezés a frissen hozzáadott és indexelt `file_path` oszlopra vált:
     `.eq("file_path", filePath)`.
   - Ezzel a pontos, egzakt egyezés valósul meg, kizárva az ILIKE biztonsági kockázatát.
2. **Letöltési opció támogatása:**
   - A `get-signed-url` kérés paraméterként fogadja az `isDownload: boolean` és `fileName: string` mezőket.
   - S3 Command konfigurálása:
     `ResponseContentDisposition: isDownload ? "attachment; filename=\"...\"" : "inline; filename=\"...\""`.
3. **Deploy:** `supabase functions deploy storage-r2`.

---

### 3. Fázis: Kliensoldali hibajavítások (Jegyzetek & Dokumentumok)

#### 3.1. Gyors Jegyzetek javítása
- **Fájlok:** `src/context/AppContext.tsx`, `src/components/NotesView.tsx`.
- **Lépések:**
  1. `convertNoteToItem` átírása szigorú atomi ellenőrzésre (`isUUID(createdItem.id)`).
  2. Ha sikeres: `updateQuickNote` beállítja az azonosítót.
  3. Ha sikertelen: a jegyzet nem vált státuszt, Toast értesíti a felhasználót.
  4. `NotesView.tsx` "Tárgy megtekintése" gomb: `setCurrentView('items')` + `setSelectedItemId(id)`. Ha az ID hiányzik, felajánlja az azonnali újrakonvertálást.

#### 3.2. Dokumentumok megnyitása és letöltése
- **Fájlok:** `src/lib/r2.ts`, `src/components/DocumentsView.tsx`, `src/components/ItemDetailModal.tsx`.
- **Lépések:**
  1. `downloadR2DocumentSecurely(fileUrl, fileName)` megírása (Edge Function `isDownload: true` hívással és automatikus letöltés triggereléssel).
  2. `openR2DocumentSecurely` stabilizálása: betöltési állapot (Spinner) jelzése, hibás URL esetén világos hibaüzenet megjelenítése popup-bezárás helyett.
  3. A felületen a "Megtekintés" gomb mellett a "Letöltés" gomb elhelyezése mind a dokumentumtárban, mind a tárgy adatlapján.

---

### 4. Fázis: Felhasználói funkcióbővítések (Spájz, Gyűjtemények, Kölcsönzés)

#### 4.1. Spájz kategóriakezelés
- **Fájl:** `src/components/PantryView.tsx`.
- **Lépések:**
  1. Dinamikus kategórialista képzése a meglévő tételekből.
  2. "+ Új kategória megadása" opció és beviteli mező beépítése a modálba.
  3. A szűrő automatikus frissülése az új kategóriával.

#### 4.2. Gyűjtemények önálló tételfelvevője és dinamikus szűrői
- **Fájlok:** `src/context/AppContext.tsx`, `src/components/CollectionsView.tsx`.
- **Lépések:**
  1. `deleteCollectionItem(id)` implementálása (rekord azonosító alapján töröl).
  2. Új tétel felvétele modálban két választható mód:
     - "Önálló tétel felvétele" (közvetlen név, leírás, fotó, ritkaság, becsült érték).
     - "Leltári tárgy hozzáadása" (a meglévő leltárból választ).
  3. Új gyűjtemény létrehozásakor egyedi típus megadása.
  4. Felső szűrősáv dinamizálása: csak a létező gyűjteménytípusok jelennek meg.

#### 4.3. Kölcsönadott tárgyak, kölcsönadható készlet és barátok
- **Fájlok:** `src/context/AppContext.tsx`, `src/components/LendingView.tsx`.
- **Lépések:**
  1. `lending_contacts` CRUD függvények implementálása az `AppContext`-ben.
  2. `LendingView.tsx` fülrendszerének kialakítása:
     - 1. fül: Kiadott tárgyak naplója (partner kiválasztása a címtárból).
     - 2. fül: Kölcsönadható eszközeim (tárgyak megjelölése, feltételek, lista vágólapra másolása).
     - 3. fül: Barátok & Ismerősök kezelése.

---

## 4. KÖTELEZŐ TESZTMÁTRIX ÉS ELFOGADÁSI KRITÉRIUMOK

| Teszteset | Művelet / Bemenet | Elvárt viselkedés | Elfogadási kritérium |
|---|---|---|---|
| **P-01** | Új spájzcikk meglévő kategóriával | A tétel mentése meglévő kategóriával sikeres. | A tétel megjelenik a kategória alatt. |
| **P-02** | Új spájzcikk egyedi kategóriával | "+ Új kategória": "Fűszerek" beírása és mentés. | A tétel létrejön, a szűrőben megjelenik a "Fűszerek". |
| **P-03** | Üres kategória és kategória nélküli tétel | Kategória mező törlése vagy üresen hagyása. | A rendszer alapértelmezett kategóriát ad, nem omlik össze. |
| **C-01** | Önálló gyűjteményi tétel felvétele | "Szalvéták" gyűjteményben új tétel névvel és fotóval. | A tétel létrejön a gyűjteményben, de NEM jelenik meg a nagy leltárban (`items`). |
| **C-02** | Meglévő leltári tárgy hozzáadása | Egy meglévő óra vagy festmény kiválasztása leltárból. | A reláció létrejön, a tárgy a fő leltárban és a gyűjteményben is látható. |
| **C-03** | Önálló gyűjteményi tétel törlése | Önálló tétel törlése a gyűjteményből. | A `collection_items` rekord törlődik, nincs idegen kulcs hiba. |
| **C-04** | Jogosulatlan gyűjtemény-hozzáférés | Nem publikus gyűjtemény lekérdezése másik felhasználóval. | Az RLS 0 rekordot ad vissza, hozzáférés megtagadva. |
| **L-01** | Kölcsönadható tárgy bejelölése | Tárgy adatlapon `is_lendable: true` és feltételek mentése. | Megjelenik a "Kölcsönadható eszközeim" fülön. |
| **L-02** | Kölcsönzési lista megosztása | Vágólapra másolás gomb megnyomása. | Formázott, olvasható szöveges lista másolódik ki, egyéb adatok nélkül. |
| **L-03** | Partner kiválasztása címtárból | Új kölcsönadásnál partner kiválasztása legördülőből. | Név, telefon és e-mail automatikusan kitöltődik. |
| **N-01** | Jegyzetből tárgy sikeres létrehozása | "lapos Vas" jegyzet átalakítása tárggyá. | Az item létrejön az `items` táblában, `converted_item_id` mentődik, a nézet a tárgyra navigál. |
| **N-02** | Ismételt kattintás és duplikációvédelem | Dupla kattintás az "Átalakítás" gombra. | A gomb inaktívvá válik a folyamat alatt, nem jön létre dupla tárgy. |
| **N-03** | Hálózati hiba átalakítás közben | Szimulált megszakadás a tárgy mentésekor. | A jegyzet marad `is_converted: false`, hibaüzenet jelenik meg. |
| **D-01** | Meglévő dokumentum megnyitása | `Regisztralt_gep_adatlap.pdf` megtekintése. | Aláírt URL sikeresen lekérve, PDF új lapon inline megnyílik. |
| **D-02** | Dokumentum letöltése | Letöltés gomb megnyomása a PDF mellett. | A fájl közvetlenül lementődik az eredeti fájlnévvel. |
| **D-03** | Családtag dokumentum-hozzáférése | Családtag próbálja megnyitni a háztartási tárgy dokumentumát. | A pontos `file_path` egyezés miatt a signed URL megérkezik, nincs 403. |
| **D-04** | Jogosulatlan dokumentum-hozzáférés | Idegen felhasználó kísérli meg elérni a privát fájlt. | Az Edge Function és RLS azonnal 403 Forbidden hibát ad. |

---

## 5. BIZTONSÁGI ÉS VISSZAÁLLÍTÁSI TERV (ROLLBACK)

1. **Adatbázis visszaállítás:**
   - Ha a migráció bármely ponton hibát dob, az egész migráció egyetlen tranzakcióban visszagörgethető (`ROLLBACK`).
   - A meglévő adatok nem vesznek el: az `ALTER TABLE ... DROP NOT NULL` nem töröl adatot, az `ADD COLUMN` mezők mind nullable vagy defaultos értékűek.
2. **Edge Function visszaállítás:**
   - A Supabase CLI/Management API verziózást biztosít. Bármilyen probléma esetén a korábbi verzió (v6) azonnal visszaállítható.
3. **Frontend visszaállítás:**
   - Git commit pontok mentése minden almodul elkészülte után.

---

## 6. ÖSSZEFOGLALÓ: MI BIZONYÍTOTT, MI MARADT NYITVA ÉS MIÉRT NEM SZABAD ELINDÍTANI A FEJLESZTÉST?

### Mi bizonyított?
1. A Spájz kategóriaválasztója tisztán frontend-oldali korlát (fix 6 elemű tömb), a DB elfogadja az egyedi szövegeket.
2. A Gyűjtemények jelenleg kötelezően `items` rekordot követel meg adatbázis- és kód-szinten is; önálló tételek tárolásához séma- és kód-módosítás kell.
3. A Kölcsönzésnél nincsenek partnertáblák és nincs kölcsönadhatósági jelölő a tárgyakon.
4. A Gyors Jegyzeteknél a "lapos Vas" jegyzetből sosem jött létre tárgy a DB-ben, a `converted_item_id` értéke `NULL`, emiatt a gomb short-circuit miatt nem csinál semmit.
5. A Dokumentumoknál a PDF fizikai állománya 100%-ban épp a `thingor-vault` vödörben, a megnyitási hiba oka a nem létező `file_path` oszlopra való szűrés az Edge Functionben és a kliensoldali fallback 404 URL.

### Mi maradt nyitva?
1. **Kölcsönzési megosztás hatóköre:** A felhasználó preferenciája, hogy a baráti megosztást első lépésben biztonságos formázott vágólapi másolással (üzenetküldőkbe szánt szöveg), vagy azonnali publikus webes linkkel kéri (amely további autentikációs/tokenes védelmet igényel).
2. **Gyűjteményi tétel fotók:** A gyűjteményi önálló tételek fotóit az R2 `photos` mappájába töltsük-e fel ugyanúgy, mint a normál tárgyak fotóit (javasolt).

### Miért nem szabad elindítani a végrehajtást?
A felhasználó explicit utasítása szerint:
- A munkamód **STRICT READ-ONLY**.
- Semmilyen kód-, séma-, adat-, vagy Edge Function módosítás nem futhat le felhatalmazás nélkül.
- A fejlesztési lépések megkezdése előtt a felhasználónak át kell tekintenie ezt a pontosított tervet, és jóvá kell hagynia a végrehajtási sorrendet.
