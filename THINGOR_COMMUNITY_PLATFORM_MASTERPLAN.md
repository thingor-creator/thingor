# THINGOR — KÖZÖSSÉGI PLATFORM MESTERTERV ÉS ARCHITEKTÚRA
## Személyre Szabható, Mobilközpontú, Többnyelvű Közösségi Rendszer

**Dátum:** 2026. október 24.  
**Státusz:** JÓVÁHAGYOTT ARCHITEKTÚRATERV (Execution Roadmap)  
**Dokumentum azonosító:** `THINGOR_COMMUNITY_PLATFORM_MASTERPLAN.md`  
**Célrendszer:** Thingor Web Application (React PWA, Supabase PostgreSQL, Cloudflare R2)  

---

## 1. VEZETŐI ÖSSZEFOGLALÓ

A Thingor eddigi fejlesztése egy kiemelkedően alapos, biztonságtudatos és részletgazdag személyes és háztartási vagyontárgy-kezelő alkalmazást (Personal Inventory Management System) hozott létre. A legutóbbi fázisban sikeresen megvalósult a közösségi piactér (Social Marketplace) adásvételi, bérleti és cserefunkciója is.

**A projekt stratégiai iránya azonban ennél sokkal tágabb és értékesebb:**
A Thingor valódi célja, hogy **személyre szabható, mobilközpontú, többnyelvű közösségi platformmá** fejlődjön.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      THINGOR KÖZÖSSÉGI PLATFORM                        │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      KÖZÖSSÉGI ÉLMÉNY RÉTEG                    │   │
│   │  Hírfolyam • Érdeklődési Csoportok • Tapasztalatcsere • Q&A   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐   │
│   │                 SZEMÉLYRE SZABÁS ÉS MUNKATERÜLETEK             │   │
│   │  Magán • Családi • Műhely / Barkács • Szakmai / Vállalkozói   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐   │
│   │                   MEGLÉVŐ PRIVÁT ALAPOK (SZIKLA)               │   │
│   │  Tárgyleltár • Tárolók • Dokumentumok • Garanciák • Kamra      │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────┴────────────────────────────────┐   │
│   │                KIEGÉSZÍTŐ TRANZAKCIÓS SZOLGÁLTATÁSOK           │   │
│   │  Adásvétel • Bérlés • Csere • Kölcsönadás • Szolgáltatók       │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Fő stratégiai döntések:
1. **A közösségi hírfolyam és a csoportok alkotják a platform szívét:** A felhasználók közötti kapcsolatok, a tárgyakhoz kapcsolódó valós tudásmegosztás (DIY projektek, restaurálás, karbantartási tapasztalatok, megbízhatósági vélemények) teremtik meg a mindennapi elköteleződést.
2. **A magánvagyon a legszigorúbban védett mag:** A leltár, a pontos lakóhely, a számlák, a garancialevelek és a privát dokumentumok soha, semmilyen körülmények között nem keverednek a nyilvános felületekkel. A felhasználó kizárólag szándékos, tételes publikálással emelhet ki egy tárgyat a közösségi térbe.
3. **A tranzakciók (piactér, kölcsönzés) kiegészítő eszközök:** Nem adásvételi portál épül, hanem olyan tudásközösség, amelyben a felhalmozott értékek megosztása, bérbeadása vagy eladása természetes, de másodlagos funkció.
4. **Moduláris, előfizetés-alapú monetizáció:** A fenntarthatóságot nem a felhasználói adatok kiárusítása, hanem prémium képességek (megnövelt tárhely, korlátlan csoportok, professzionális műhely/vállalkozói eszközök, partneri integrációk) és előfizetési csomagok (Free, Plus, Family, Business) biztosítják.

---

## 2. A PLATFORM VÉGLEGESÍTETT CÉLJA ÉS ALAPELVEI

### 2.1. Alapelvek (Core Tenets)

| Alapelv | Jelentése a gyakorlatban |
|---|---|
| **1. Privacy by Architecture** | A privát leltár (`items`, `storage_containers`, `vault_items`, `item_documents`) alapértelmezésben 100%-ban láthatatlan a nyilvánosság számára. Nincs véletlen publikálás. |
| **2. Mobile-First Ergonomia** | A felületet egykezes, hüvelykujjal történő mobilhasználatra tervezzük: alsó sáv, lapozható kártyák, optimalizált modális lapok (bottom sheet), gyorsfotós feltöltés. |
| **3. Content over Commerce** | A felhasználói hírfolyamban a segítőkészség, a tudás és az inspiráció az első; a kereskedelmi hirdetések diszkrét, dedikált kártyaként, kiegészítőként jelennek meg. |
| **4. Modular Subscriptions** | Minden funkció tiszta feature-flag vagy kvótakorlát mögé rendezhető, amely a szerveroldalon (Supabase RLS és Edge Functions) ellenőrzött, így a kliens nem tudja kijátszani a csomaghatárokat. |
| **5. Native Localization** | A platform nem utólagos fordítási toldozgatás: a többnyelvűség (kezdetben HU és EN, majd DE és regionális nyelvek) az adatmodelltől a dátum- és pénznemformátumokig natívan beépített. |

---

## 3. A JELENLEGI PROJEKT TÉNYSZERŰ ÁLLAPOTFELMÉRÉSE

A kódbázis, a migrációk és a dokumentáció közvetlen vizsgálata alapján a funkciók állapota az alábbiak szerint kategorizálható:

### 3.1. Rendszerállapot mátrix

| Terület | Tényleges állapot | Érintett forrásfájlok és DB objektumok | Megállapítás / Szűk keresztmetszet |
|---|---|---|---|
| **Személyes leltár (`items`)** | **Ellenőrzött, működő funkció** | [`src/components/ItemsView.tsx`](file:///c:/Users/User/thingor/src/components/ItemsView.tsx), `public.items` tábla | Stabil szerveroldali lapozás, kategória és helyszín hozzárendelés. Szigorúan védett RLS. |
| **Fizikai tárolók (`storage`)** | **Ellenőrzött, működő funkció** | [`src/components/StorageView.tsx`](file:///c:/Users/User/thingor/src/components/StorageView.tsx), `storage_containers`, `container_items` | QR-kódos doboz- és polckezelés, ömlesztett tételek. |
| **Dokumentumok & Vault** | **Ellenőrzött, működő funkció** | [`src/components/DocumentsView.tsx`](file:///c:/Users/User/thingor/src/components/DocumentsView.tsx), [`src/components/VaultView.tsx`](file:///c:/Users/User/thingor/src/components/VaultView.tsx), R2 `thingor-vault` | Kétlépcsős PIN védelem, presigned URL letöltés Cloudflare R2-ből. |
| **Családi háztartás (`households`)** | **Részben megvalósított funkció** | [`src/components/HouseholdView.tsx`](file:///c:/Users/User/thingor/src/components/HouseholdView.tsx), `households`, `household_members` | Működik a meghívás és a jogosultsági szűrés, de a kliens egyszerre kizárólag **egyetlen aktív háztartást** tud kezelni LocalStorage-ból ([`AppContext.tsx:1902`](file:///c:/Users/User/thingor/src/context/AppContext.tsx#L1902)). |
| **Piactér frontend & adatbázis** | **Frissen elkészült, működő modul** | [`src/components/marketplace/`](file:///c:/Users/User/thingor/src/components/marketplace/), [`src/lib/marketplace.ts`](file:///c:/Users/User/thingor/src/lib/marketplace.ts), `marketplace_listings`, `public_profiles`, `marketplace_offers`, `marketplace_conversations` | 9 db komponens, hirdetésfeladás, keresés, szűrés, chat, ajánlattétel, R2 fotóvalidáció, tiltás, jelentés. Stagingen sikeresen tesztelve. |
| **Közösségi hírfolyam (Feed)** | **Dokumentált elképzelés (Hiányzik)** | Nincs forráskód | Nincs bejegyzés (Post), nincs hírfolyam-algoritmus, nincs idővonal. |
| **Csoportok (Groups)** | **Dokumentált elképzelés (Hiányzik)** | Nincs forráskód | Nincs csoporttábla, nincs csatlakozási folyamat, nincsenek csoportjogok. |
| **Felhasználói kapcsolatok (Social Graph)** | **Még nem létező funkció** | Nincs forráskód | Nincs ismerős, nincs követés (Follow), nincs kontaktlista a háztartási e-maileken kívül. |
| **Állapotkezelés (`AppContext.tsx`)** | **Kritikus architekturális adósság** | [`src/context/AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx) (5650+ sor) | Monolitikus állapot: belépéskor 12+ tábla teljes tartalmát lekéri és LocalStorage-ba menti. Közösségi méretnél azonnali memóriatúlcsordulást okoz. |
| **Többnyelvűség (`translations.ts`)** | **Részben megvalósított funkció** | [`src/i18n/translations.ts`](file:///c:/Users/User/thingor/src/i18n/translations.ts) (2 nyelvi szótár) | Keménykódolt szótárak egy fájlban. Új nyelvek vagy dinamikus fordítások skálázhatatlanok lennének refaktor nélkül. |

---

## 4. A KÍVÁNT INFORMÁCIÓS ARCHITEKTÚRA (IA)

A platform 11 funkcionális zónára oszlik, amelyek logikailag elkülönülnek, de szervesen kommunikálnak egymással.

```
                               ┌───────────────────────────┐
                               │   THINGOR KÖZÖSSÉGI PLATFORM │
                               └─────────────┬─────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
┌─────▼───────────────┐            ┌─────────▼───────────┐                ┌─────────▼───────────┐
│  KÖZÖSSÉG & TARTALOM│            │   SZEMÉLYES TÉR     │                │   ÖKOSZISZTÉMA      │
├─────────────────────┤            ├─────────────────────┤                ├─────────────────────┤
│ 1. Hírfolyam (Feed) │            │ 6. Tárgyleltár      │                │ 9. Piactér (Market) │
│ 2. Csoportok        │            │ 7. Tárolók & QR     │                │ 10. Szolgáltatók    │
│ 3. Felfedezés / Keresés│         │ 8. Kamra & Széf     │                │ 11. Előfizetések    │
│ 4. Üzenetek & Értesítések│       │                     │                │                     │
│ 5. Publikus Profilok│            │                     │                │                     │
└─────────────────────┘            └─────────────────────┘                └─────────────────────┘
```

### 4.1. Az egyes területek részletes specifikációja

#### 1. Személyre szabható kezdőlap (Home Dashboard)
- **Célja:** A felhasználó napi irányítópultja, amely összefogja a friss közösségi interakciókat, a csoportok eseményeit és a személyes teendőket (lejáró garanciák, alacsony készletek, kölcsönadott tárgyak).
- **Kik használják:** Minden regisztrált felhasználó belépés után.
- **Kapcsolódás:** Összeköti a hírfolyamot a személyes riasztásokkal.
- **V1 hatókör:** Moduláris widget-kártyák (Friss bejegyzések, Én csoportjaim, Riasztások, Gyorsgombok).
- **Későbbi bővítés:** Teljes drag-and-drop widget-testreszabás, külső időjárás/naptár widgetek.

#### 2. Közösségi hírfolyam (Community Feed)
- **Célja:** Időrendi és relevancián alapuló tartalomfolyam, ahol a felhasználók bejegyzéseket, tapasztalatokat, projekt-naplókat és kérdéseket tesznek közzé.
- **Kik használják:** Közösségi tagok, hobbi-barkácsolók, szakemberek, vásárlás előtt állók.
- **V1 hatókör:** 
  - Két fül: `Követettek & Csoportjaim` és `Felfedezés (Globális)`.
  - Bejegyzés-típusok: `Általános poszt`, `Projekt / DIY bemutató`, `Kérdés / Segítségkérés`.
  - Reakciók (Like/Hasznos/Inspiráló), kommentezés, bejegyzés mentése könyvjelzők közé.
- **Későbbi bővítés:** Videós bejegyzések, AI-alapú relevanciaszűrés, szavazások (Polls).

#### 3. Csoportok és érdeklődési közösségek (Groups)
- **Célja:** Tematikus terek (pl. *Vintage Hifi Rajongók*, *Kerti Gépek és Karbantartás*, *3D Nyomtatás & DIY*, *Helyi Társasházi Közösség*).
- **Kik használják:** Egy adott téma iránt érdeklődő felhasználók.
- **V1 hatókör:** Nyilvános és zárt csoportok, tagfelvétel, moderátori szerepkör, csoporton belüli hírfolyam.
- **Későbbi bővítés:** Titkos csoportok, csoportos közös leltár (pl. barkácsklub közös szerszámkészlete).

#### 4. Felhasználói profilok és kapcsolatok (Social Graph)
- **Célja:** A felhasználó közösségi jelenléte: bemutatkozás, elért bizalmi pontszám, publikus bejegyzések, nyilvános tárgy-bemutatók (Showcase), kitüntetések.
- **Kik használják:** Bárki, aki kíváncsi egy tag szakértelmére vagy hitelességére.
- **V1 hatókör:** Követés (Follow), követők/követettek listája, publikus profil szerkesztése.
- **Későbbi bővítés:** Szakmai hitelesítés (Verified Pro badge), ajánlások (Endorsements).

#### 5. Keresés és felfedezés (Search & Discovery)
- **Célja:** Univerzális kereső, amely megkülönbözteti a közösségi tartalmakat (bejegyzések, csoportok, emberek) a személyes tárgyaktól.
- **V1 hatókör:** Füles globális kereső: `Minden`, `Bejegyzések`, `Csoportok`, `Tagok`, `Piactér`.
- **Későbbi bővítés:** Szemantikus keresés, címke (hashtag) trendek.

#### 6. Privát üzenetek és értesítések (Messaging & Notifications)
- **Célja:** Felhasználók közötti közvetlen kapcsolatfelvétel és rendszerértesítések.
- **V1 hatókör:** A már elkészült [`ConversationsModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/ConversationsModal.tsx) általánosítása, hogy ne csak piactéri tárgyhoz, hanem csoportos vagy közvetlen beszélgetéshez is kapcsolódhasson.
- **Későbbi bővítés:** Csoportos csevegés, hangüzenetek.

#### 7. Saját tárgynyilvántartás és modulok (Private Inventory Core)
- **Célja:** A meglévő értékek nyilvántartása (tárgyak, szerszámok, dokumentumok, garancia, kamra, széf).
- **Kik használják:** A tulajdonos és meghívott háztartási tagjai.
- **Szigorú szabály:** Privát marad, nincs automatikus közösségi kitettség.

#### 8. Közösségi piactér és tranzakciók (Marketplace Auxiliary)
- **Célja:** A meglévő modul szerinti eladás, bérbeadás, csere és ingyenes átadás.
- **Pozicionálás:** Nem a nyitólap, hanem egy dedikált ökoszisztéma-szolgáltatás.

---

## 5. MOBILOS ÉS ASZTALI FELÜLET TERVE

### 5.1. Mobilközpontú ergonómia (Mobile UI Plan)

Mobilon a hüvelykujj-zóna az elsődleges. A túlterhelt alsó sáv helyett egy 5 elemű, ergonomikus rendszert vezetünk be:

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Thingor               [Keresés] [Csengő] [Avatar]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│                GÖRGETHETŐ FŐTARTALOM                    │
│                                                         │
│   - Hírfolyam / Kezdőlap / Csoportok / Leltár           │
│   - Nagy érintési felületek (min. 44×44px)              │
│   - Kártyás elrendezés lekerekített sarkokkal (14px)   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ [Hírfolyam]  [Csoportok]   [ ( + ) ]   [Leltáram]  [Menü] │
│   (Feed)      (Groups)       (FAB)     (Inventory) (More) │
└─────────────────────────────────────────────────────────┘
```

#### A kontextusérzékeny FAB gomb működése:
- Ha a felhasználó a **Hírfolyamban** van: `+ Új bejegyzés` (posztírás modál).
- Ha a **Csoportokban** van: `+ Csoport létrehozása` vagy `+ Poszt a csoportba`.
- Ha a **Leltárban** van: `+ Új tárgy hozzáadása`.
- Ha a **Piactéren** van: `+ Hirdetés feladása`.

#### Az 5. gomb ("Több / Menü") tartalma:
Egy modern, alulról felcsúszó lap (Bottom Sheet), amely áttekinthető kategóriákba szervezi a kiegészítő modulokat:
1. **Közösség:** Piactér, Mentett bejegyzések, Ismerősök keresése.
2. **Saját Értékek:** Fizikai tárolók (QR scanner), Spájz, Széf & Védett iratok, Kölcsönadás.
3. **Pénzügy & Karbantartás:** Részletfizetések, Javítási napló, Családi megosztás.
4. **Beállítások:** Nyelv, Téma, Munkaterület váltása, Előfizetés.

### 5.2. Asztali felület (Desktop Responsive Grid)

Asztali nézetben 3 oszlopos elrendezést alkalmazunk:
- **Bal oldalsáv (260px):** Fix navigáció (Kezdőlap, Hírfolyam, Csoportjaim, Saját Leltár, Tárolók, Piactér, Beállítások).
- **Középső tartalomoszlop (max. 680px):** Hírfolyam, bejegyzések görgethető folyamata, vagy az éppen aktív modul teljes nézete.
- **Jobb oldalsáv (320px):** Kontextuális információk:
  - Aktív háztartás állapota / Riasztások (lejáró garanciák).
  - Népszerű csoportok & témák (Trending topics).
  - Ajánlott tagok követésre.
  - Gyors elérés a mentett könyvjelzőkhöz.

---

## 6. KÖZÖSSÉGI FUNKCIÓK TERVE (COMMUNITY CORE)

### 6.1. Bejegyzések és tartalomtípusok

A közösségi térben négy jól megkülönböztethető bejegyzéstípust vezetünk be:

```sql
-- Javasolt bejegyzéstípus ENUM
CREATE TYPE public.community_post_type AS ENUM (
  'general',      -- Általános eszmecsere, gondolat
  'showcase',     -- Tárgybemutató (leltárból kiemelt nyilvános tárggyal)
  'question',     -- Kérdés / Segítségkérés (tapasztalat, hibakeresés)
  'project_log'   -- Barkács / Restaurálás / DIY projekt napló
);
```

#### 1. Tárgybemutató (Showcase Post):
- A felhasználó a leltárából kiválaszt egy tárgyat (pl. egy restaurált 1974-es Marantz erősítőt vagy egy egyedi készítésű tölgyfa asztalt).
- A rendszer **kizárólag** a nyilvános adatokat köti össze: megnevezés, fotók, leírás.
- A sorozatszám, a vételár, a pontos lakáson belüli hely és a beszerzési számla **rejtve marad**.

#### 2. Kérdés és segítségkérés (Q&A Post):
- Kifejezetten problémamegoldásra optimalizált bejegyzés (pl. *"Hogyan távolítsam el a rozsdát anélkül, hogy sérülne a krómozás?"*).
- A hozzászólások között a kérdező megjelölheti a **Megoldásnak választott választ** (Accepted Answer), ami növeli a segítő tag bizalmi pontszámát (`trust_score`).

#### 3. Projekt-napló (Project Log):
- Lépésről lépésre dokumentált folyamat (előtte-utána fotók, felhasznált szerszámok listája, buktatók).

---

## 7. SZEMÉLYRE SZABÁS ÉS MUNKATERÜLETEK

A Thingor felhasználói nem egyformák: egy egyedülálló diák, egy 4 fős család, egy asztalosműhely és egy kisvállalkozás teljesen más funkciókat igényel.

### 7.1. Induló munkaterület-profilok (Workspace Profiles)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    SZEMÉLYES    │  │     CSALÁDI     │  │  MŰHELY / DIY   │  │   VÁLLALKOZÁS   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ - Hírfolyam     │  │ - Családi leltár│  │ - Szerszámleltár│  │ - Eszköznyilvánt.│
│ - Saját leltár  │  │ - Közös kamra   │  │ - Tárolórekeszek│  │ - QR azonosítás │
│ - Csoportok     │  │ - Garanciák     │  │ - Javítási napló│  │ - Dokumentumtár │
│ - Piactér       │  │ - Részletfizetés│  │ - Projekt-poszt │  │ - Munkatárs jogok│
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 7.2. Modulkezelés és UI konfiguráció

A meglévő `UserPreferences` struktúrát ([`src/types/index.ts:202`](file:///c:/Users/User/thingor/src/types/index.ts#L202)) kiterjesztjük, szigorúan elválasztva a **megjelenést** a **biztonsági jogosultságoktól**:

```typescript
export interface ExtendedUserPreferences extends UserPreferences {
  active_workspace_type: 'personal' | 'family' | 'workshop' | 'business';
  dashboard_layout: {
    widget_id: string;
    visible: boolean;
    order: number;
  }[];
  content_languages: ('hu' | 'en' | 'de')[]; // Milyen nyelvű posztokat lát a hírfolyamban
  feed_filter_default: 'following' | 'all';
}
```

> [!IMPORTANT]
> **Biztonsági szabály:** Egy modul elrejtése a felületen (pl. `hidden_modules: ['vault']`) kizárólag a navigációt és a dashboardot módosítja. Az adatbázis RLS szabályait és a REST végpontok védelmét a felületi beállítás soha nem befolyásolhatja.

---

## 8. TÖBBNYELVŰSÉGI TERV (I18N SCALING)

### 8.1. A jelenlegi rendszer korlátai
A jelenlegi implementáció ([`src/i18n/translations.ts`](file:///c:/Users/User/thingor/src/i18n/translations.ts)) egyetlen fájlban tartja a teljes magyar és angol szótárat. Ez jelenleg ~300 sor, de a közösségi platform 1500+ kulcsánál és 3-4 nyelvnél kezelhetetlenné válna, és növelné az induló JavaScript bundle méretét.

### 8.2. Fokozatos átállási stratégia (No Breaking Change)
1. **1. Lépés (Megtartó integráció):** Megtartjuk a meglévő `t(key)` API hívást a komponensekben, így a kód nem igényel átírást.
2. **2. Lépés (Névterek szerinti bontás):** A szótárakat domainek szerinti modulokra osztjuk:
   - `common.json`: navigáció, gombok, dialógusok
   - `inventory.json`: tárgyak, állapotok, kategóriák, helyszínek
   - `community.json`: hírfolyam, csoportok, posztok, kommentek
   - `marketplace.json`: piactér, ajánlatok, licitek
3. **3. Lépés (Dinamikus formázás):** A dátumok, pénznemek és számok formázására a natív `Intl.DateTimeFormat` és `Intl.NumberFormat` API-t használjuk a felhasználó nyelve szerint.
4. **4. Lépés (Felhasználói tartalmak kezelése):** A felhasználói posztok és hozzászólások az eredeti nyelven tárolódnak. A bejegyzés fejlécében tároljuk a detektált nyelvkódot (`content_language: 'hu'`). Később opcionálisan bekapcsolható kliensoldali fordítási API integrálható.

---

## 9. MODUL- ÉS JOGOSULTSÁGI ARCHITEKTÚRA

### 9.1. Monolitikus állapot bontása (Decoupling AppContext)

A jelenlegi [`AppContext.tsx`](file:///c:/Users/User/thingor/src/context/AppContext.tsx) (5650+ sor) a legnagyobb technológiai adósság. Az alábbi koncepcionális bontást kell megvalósítani több lépésben:

```
┌────────────────────────────────────────────────────────┐
│                      APP PROVIDER                      │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │ AuthContext (User, Session, Roles, Admin)      │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│   ┌───────────────────────┴────────────────────────┐   │
│   │ UIContext (Theme, Language, ActiveView, Toast) │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│   ┌───────────────────────┴────────────────────────┐   │
│   │ InventoryContext (Items, Storage, Vault)       │   │
│   │ - Lapozott, igény szerinti betöltés (on-demand)│   │
│   └───────────────────────┬────────────────────────┘   │
│                           │                            │
│   ┌───────────────────────┴────────────────────────┐   │
│   │ CommunityContext (Feed, Posts, Groups, Social) │   │
│   │ - Realtime feliratkozások, cache kezelés       │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### 9.2. Szerveroldali jogosultsági és kvótaarchitektúra (Server-Side Entitlements)

A csomagkorlátok betartatása nem alapulhat a kliensoldali felület viselkedésén vagy menüpontok elrejtésén `[Következtetés]`. A kliens tetszőlegesen manipulálható, ezért a jogosultság- és kvótavédelem kizárólag a Supabase PostgreSQL motor és a Cloudflare R2 proxy Edge Function szintjén garantálható `[Következtetés]`.

#### 9.2.1. Alapelvek és elhatárolások
1. **Előfizetési csomag vs. Rendszeradminisztrátor:** Az előfizetési csomag (`plan_id`) és az adminisztrátori szerepkör (`profiles.role = 'admin'`) szigorúan elkülönül `[Ellenőrzött tény]`. Egyetlen fizetős csomag sem adhat platform-adminisztrátori vagy moderátori privilégiumot `[Következtetés]`.
2. **Kliensoldali elrejtés vs. Szerveroldali biztonság:** A frontend komponensek elrejtése vagy letiltása kizárólag kényelmi funkció (UX). Minden adatbázis-műveletet és fájlfeltöltést az adatbázisban és az Edge Functionökben kell validálni, megakadályozva a közvetlen PostgREST API-hívásokkal történő visszaéléseket `[Következtetés]`.
3. **RLS vs. Csomagjogosultság (Termékfunkció):**
   - A Row Level Security (RLS) határozza meg, hogy a felhasználó *jogosult-e egyáltalán* látni vagy módosítani egy adott rekordot (adatbiztonság) `[Ellenőrzött tény]`.
   - Az előfizetési jogosultság (Entitlement) kizárólag azt szabályozza, hogy a felhasználó *hány darab* erőforrást hozhat létre, mekkora tárhelyet foglalhat el, és milyen emelt szintű kényelmi eszközöket (pl. hivatalos biztosítási PDF) érhet el `[Javaslat]`.
   - Egyetlen előfizetési csomag sem gyengítheti vagy írhatja felül az RLS adatizolációt `[Következtetés]`.
4. **Idempotens állapotkezelés és tranzakcióbiztonság:**
   - Nem elegendő egy naiv `used_bytes + new_file_size` ellenőrzés: párhuzamos feltöltések és egyidejű kérések esetén tranzakciós zárolás (`FOR UPDATE`) vagy atomi kvóta-előfoglalási (reservation) mechanizmus szükséges `[Következtetés]`.

#### 9.2.2. A szolgáltatásvédelmi architektúra 5 rétege (Túlterhelés és visszaélés elleni védelem)
A platform stabilitásának garantálására a tesztidőszakban és azt követően 5 önálló védelmi réteg kerül kialakításra `[Javaslat]`.
*Fontos megkülönböztetés:* a jelenlegi kódbázisban kizárólag az alapvető RLS házirendek, a Supabase Auth session-ellenőrzés és a fájlonkénti 15 MB-os határ érvényesül `[Ellenőrzött tény]`; a többi védelmi mechanizmus tervezett, a megfelelő fázisban implementálandó feladat `[Következtetés]`.

1. **Regisztrációs védelem (Registration Shield):**
   - Szerveroldali sebességkorlátozás (Rate Limiting) IP-cím és kliens-ujjlenyomat alapján az automatizált regisztrációs kísérletek ellen `[Javaslat]`.
   - Ideiglenes regisztrációs lezárási mechanizmus (Emergency Registration Freeze), amellyel az adminisztrátor rendkívüli terheléses támadás esetén azonnal felfüggesztheti az új fiókok nyitását `[Javaslat]`.
2. **Fájlkezelési védelem (Storage Enforcement):**
   - Személyes (100 MB), háztartási (5 GB), szervezeti és globális (10 GB) R2-tárhelykeretek szerveroldali kikényszerítése a `storage-r2` Edge Functionben `[Javaslat]`.
   - Fájltípus- és kiterjesztés-ellenőrzés mime-type alapján, kártékony futtatható állományok kizárásával `[Ellenőrzött tény]`.
3. **Párhuzamos műveletek védelme (Concurrency & Race Condition Guard):**
   - Atomi kvóta-előfoglalási eljárás (`storage_reservations`), amely 15 perces lejáró zárolással követi a folyamatban lévő feltöltéseket `[Javaslat]`.
   - Félbeszakadt vagy hibás feltöltések esetén a foglalások automatikus felszabadítása, megakadályozva a fantom-fogyasztást `[Javaslat]`.
4. **Szolgáltatásfelügyelet és telemetria (Service Telemetry & Monitoring):**
   - Rendszerszintű össztárhely- és adatforgalom-figyelés.
   - Szigorúan definiált **9 GB-os (9 000 000 000 bájt) figyelmeztetési küszöb**, amelynél az adminisztrátor azonnali riasztást kap, és a rendszer a Free fiókok feltöltéseit korlátozza a fizetős kapacitás védelmére `[Javaslat]`.
   - Dokumentált vészhelyzeti protokoll a szolgáltatás azonnali stabilizálására `[Javaslat]`.
5. **Jogosultságvédelem (Entitlement Gatekeeper):**
   - Minden prémium funkció (Széf, Biztosítási PDF), VIP-jogosultság és adminisztrátori művelet előtt szerveroldali PostgreSQL trigger vagy RPC ellenőrzi a hatályos csomagot; a kliens kérései közvetlen API hívás esetén is elutasításra kerülnek (`P0001: Access denied`) `[Javaslat]`.

---

## 10. ELŐFIZETÉSI CSOMAGOK, FUNKCIÓMÁTRIX ÉS JOGOSULTSÁGI RENDSZER

### 10.1. A nyilvános tesztidőszak (Public Beta) kötelező üzleti szabályai, árazás és kvóták

#### 10.1.1. Kötelező üzleti szabályok a tesztidőszakra
A Thingor jelenlegi életszakaszában a stabilitás, az adatbiztonság és a valós terhelés tesztelése a kizárólagos prioritás `[Elfogadott döntés]`:
1. **Free-only nyilvános regisztráció:** Minden új, nyilvános regisztráció **kizárólag Free jogosultságot kaphat** `[Elfogadott döntés]`.
2. **Fizetős csomagok zárolása a tesztidőszakban:** A Plus, Family és Business csomagok a tesztidőszak alatt **nem vásárolhatók meg, és a normál felhasználói felületen letiltottak** (nem aktiválhatók) `[Elfogadott döntés]`.
3. **Lemon Squeezy fizetési integráció tilalma:** Az éles Merchant of Record fizetési integráció nem aktiválható a tesztidőszak lezárása és külön kifejezett jóváhagyás előtt `[Elfogadott döntés]`.
4. **VIP- és promóciós kódok célja:** A kódrendszer kizárólag az adminisztrátor által vezérelt tesztelési kivételt jelenti a funkcióhozzáférés ellenőrzésére; nem nyithatja meg a fizetős csomagokat a nyilvános regisztráció számára `[Elfogadott döntés]`.
5. **Automatikus élesítés tilalma:** A tesztidőszak lezárása után sem indulhat el automatikusan a fizetős értékesítés; ehhez a 10.10. pontban részletezett előzetes ellenőrzési kapu sikeres lezárása és külön döntés szükséges `[Elfogadott döntés]`.
6. **Három kategória szigorú elhatárolása a dokumentumban:**
   - *Jelenleg érvényes tesztidőszaki szabályok:* Free-only regisztráció, fizetős vásárlás letiltása, VIP-tesztelés admin kódokkal `[Ellenőrzött tény]`.
   - *Tervezett későbbi funkciók:* PostgreSQL kvótatriggerek, Quota Reservation, Lemon Squeezy webhookok `[Javaslat]`.
   - *Jóváhagyásra váró üzleti döntések:* végleges havidíjak, éves kedvezmények, Business limitek `[Nyitott kérdés]`.

#### 10.1.2. Csomagok és kvóták a tesztidőszakban

| Csomag | Tervezett tárgykeret | Tervezett fájlkvóta | Tesztidőszaki nyilvános elérhetőség |
|---|---:|---:|---|
| **Free** | **50 tárgy** | **100 000 000 bájt (100 MB)** | **Elérhető** `[Elfogadott döntés]` |
| **Plus** | **1 000 tárgy** `[Javaslat]` | **2 GB** `[Javaslat]` | **Letiltva** `[Elfogadott döntés]` |
| **Family** | **3 000 tárgy** `[Javaslat]` | **5 GB közös háztartási keret** `[Javaslat]` | **Letiltva** `[Elfogadott döntés]` |
| **Business** | Fair-use mellett tervezett korlátlan tárgykezelés *(20 000 fair use)* `[Javaslat]` | Szervezeti keret és globális kapacitás szerint `[Javaslat]` | **Letiltva** `[Elfogadott döntés]` |

**További Free korlátok:**
- Legfeljebb **5 dokumentumrekord** `[Elfogadott döntés]`.
- Legfeljebb **3 fizikai tároló** `[Elfogadott döntés]`.
- Legfeljebb **3 aktív piactéri hirdetés** (tervezési javaslat) `[Javaslat]`.
- Háztartási tagok meghívása: **Tiltva (0 fő)** `[Elfogadott döntés]`.

#### 10.1.3. A négy független kvótatípus szigorú szétválasztása
A rendszerben az alábbi 4 mérőszám egymástól teljesen függetlenül kezelendő `[Következtetés]`:
1. **Saját tárgyak darabszáma (`items`):** A rögzített leltári tételek száma.
2. **Dokumentumrekordok száma (`item_documents`):** A csatolt irat-metaadatok száma.
3. **Fizikai tárolók darabszáma (`storage_containers`):** A nyilvántartott dobozok, polcok száma.
4. **R2-ben ténylegesen tárolt fizikai bájtok száma:** A feltöltött fotók és dokumentumok mérete decimális alapon (a 100 MB szigorúan **100 000 000 bájt**, nem 104 857 600 MiB).

#### 10.1.4. Előzetes csomagárak státusza
A korábban felmerült havi árak kizárólag előzetes javaslatok, amelyek **a tesztidőszak alatt nem jelenhetnek meg megvásárolható ajánlatként a felületen** `[Elfogadott döntés]`:
- Free: 0 Ft / hó
- Plus: ~1 490 Ft / hó `[Javaslat]`
- Family: ~2 990 Ft / hó `[Javaslat]`
- Business: ~7 990 Ft / hó `[Javaslat]`

---

### 10.2. Az R2-tárhely valódi szerepe és költségvédelme

#### 10.2.1. Technikai háttértár vs. Tárhelytermék
- **Alapelv:** A Cloudflare R2 a Thingor technikai fájltárolója a felhasználói tárgyfotók és dokumentumok számára, **nem önállóan értékesített felhőtárhely-szolgáltatás** `[Következtetés]`.
- A csomagokban megadott méretértékek (pl. 100 MB, 2 GB, 5 GB) a Thingor leltárfunkcióinak kiszolgálására biztosított belső használati kvóták, nem külön megvásárolható gigabájtok `[Javaslat]`.
- A fizikai foglalást pontos, decimális bájtszám alapján kell mérni: a Free 100 MB kvóta szigorúan **100 000 000 bájt**, nem bináris MiB `[Következtetés]`.

#### 10.2.2. Duplikációmentes elszámolás és hatókörök
- **Egyedi fizikai elszámolás:** Egy adott fájl fizikai mérete az R2-ben **kizárólag egyszeresen kerül felszámításra**, függetlenül attól, hogy a kapcsolótáblákon keresztül hány tárgyhoz, dokumentumrekordhoz vagy háztartási taghoz van hozzárendelve `[Következtetés]`.
- **Kvóták szétválasztása:** A személyes és közös háztartási kvóták soha nem adódnak össze automatikusan a tagok között `[Javaslat]`.
  - *Személyes fájlok:* Az egyéni leltárhoz tartozó fotók és iratok a felhasználó személyes 100 MB (Free) vagy 2 GB (Plus) keretét terhelik.
  - *Háztartási fájlok:* A háztartás közös leltárába feltöltött fotók és iratok a háztartás közös 5 GB-os (Family) keretét terhelik, függetlenül attól, hogy melyik családtag hajtotta végre a feltöltést.
  - *Üzleti fájlok:* A vállalati munkaterülethez rendelt tételek a szervezeti kvótát terhelik.

#### 10.2.3. Szolgáltatói kapacitásplafon és költségvédelem
- **Globális fizikai kapacitásplafon:** A szolgáltató kezdeti globális R2-tárolási kerete **összesen 10 000 000 000 bájt (10 GB)** `[Ellenőrzött tény]`.
- **Kapacitást meghaladó ígéretek tilalma:** Tilos a rendszerben olyan összesített csomagkereteket garantáltként hirdetni, amelyek meghaladják a szolgáltató ténylegesen finanszírozott és rendelkezésre álló fizikai kapacitását `[Következtetés]`.
- **VIP és promóciós kódok korlátai:** A VIP és a promóciós kód **nem emelheti meg és nem kerülheti meg a globális tárhelykorlátot**; a Business csomag „korlátlan” tárgykezelése sem jelenthet korlátlan fájlméretet vagy korlátlan fizikai tárhelyet `[Elfogadott döntés]`.
- **9 GB-os figyelmeztetési küszöb és globális fék:** Ha a rendszer össztárhely-foglalása eléri a **9 000 000 000 bájtot (9 GB)**, a szerveroldali proxy automatikus riasztást küld a platform adminisztrátornak, és felfüggeszti a Free fiókok új feltöltési kéréseit, garantálva a fizetős és VIP tesztelők zavartalan működését és a rendszer 1 GB-os biztonsági tartalékát `[Javaslat]`.
- **Versenyhelyzetek elleni atomi kvóta-előfoglalás (Quota Reservation):**
  1. A `storage-r2` Edge Function az aláírt feltöltési URL kiadásakor atomi tranzakcióban ideiglenes foglalást (`storage_reservations`) hoz létre 15 perces lejárattal `[Javaslat]`.
  2. A párhuzamos kérések összegződnek, megelőzve a keret túllépését.
  3. Sikertelen vagy félbeszakadt feltöltés esetén a fel nem használt előfoglalások 15 perc után automatikusan felszabadulnak `[Javaslat]`.
  4. Sikeres feltöltéskor a leltár mentése véglegesíti a tárhelyfogyasztást, a fájl törlésekor pedig a rendszer azonnal meghívja az R2 `DeleteObjectCommand`-ot, és felszabadítja a kvótát `[Ellenőrzött tény]`.

---

### 10.3. Family csomag, háztartási meghívások és tagsági szabályok

#### 10.3.1. Létszámkorlát és jogosultsági kapu
- **Maximális létszám:** A Family csomagban a háztartás maximális létszáma **összesen 5 fő** (a háztartás tulajdonosa + legfeljebb 4 meghívott családtag) `[Elfogadott döntés]`.
- **Free csomag meghívási tilalma:** A Free csomag felhasználói **nem jogosultak háztartási tagok meghívására** (0 meghívó) `[Elfogadott döntés]`. A háztartási megosztás kizárólag a fizetős csomagok (Family, Business) és a VIP-tesztelők számára érhető el `[Következtetés]`.
- **Szerveroldali kikényszerítés:** A meghívók létrehozását (`household_invites`), a tagok hozzáadását és szerepköreik (`owner`, `admin`, `member`, `viewer`) beállítását adatbázis-szintű PostgreSQL trigger és RLS ellenőrzi; a kliensoldali felület nem bírálhatja felül a szabályokat `[Javaslat]`.

#### 10.3.2. Családi kvóta mint közös medence
- A családi előfizetés a háztartás entitáshoz (`households`) kötődik. Nem arról van szó, hogy minden családtag kap egy önálló 3 000 tárgyas és 5 GB-os személyes prémium fiókot; a családtagok a **háztartás közös keretét** használják a megosztott javak kezelésére `[Következtetés]`.
- A családtag személyes, privát leltára (`ownership_scope = 'private'`) a saját személyes csomagjának (alapértelmezetten Free: 50 tárgy, 100 MB) kereteit terheli `[Javaslat]`.

#### 10.3.3. Adatvédelem és tagsági életciklus
- **Kilépés vagy eltávolítás:** Ha egy tag elhagyja a háztartást, vagy a tulajdonos visszavonja a hozzáférését:
  - A felhasználó saját privát adataihoz a családtagok soha nem férhettek hozzá, azok érintetlenek maradnak `[Ellenőrzött tény]`.
  - A közös háztartási leltárba korábban felvitt adatok a háztartás tulajdonában maradnak, nem törlődnek `[Következtetés]`.
  - A kilépő tag nem veszít adatot; személyes fiókja visszatér a Free keretei közé Read-and-Manage módban `[Javaslat]`.
- **Family előfizetés lejárata:** A háztartás adatai nem törlődnek és nem válnak nyilvánossá; a közös leltár Read-and-Manage állapotba kerül a megújításig `[Javaslat]`.

---

### 10.4. A Széf (Vault) és a Biztosítási PDF fizetős funkciói és adatvédelmi garanciái

#### 10.4.1. A Széf (Vault) fizetős besorolása
- **Csomagelérhetőség:**
  - **Free:** A Széf termékfunkciói **nem érhetők el** `[Elfogadott döntés]`.
  - **Plus / Family / Business és VIP:** A Széf elérhető a csomaghoz tartozó jogosultságok szerint `[Elfogadott döntés]`.
- **Tény a kódbázisból:** A Vault nem egy különálló adatbázis vagy bucket, hanem az `items.is_vault_protected` és `item_documents.is_vault_protected` logikai védelmi mechanizmusa PIN kódos feloldással és Edge Function letöltési szűréssel `[Ellenőrzött tény]`.
- **Adatbiztonsági garancia:** A fizetős Széf nem jelenti azt, hogy az alapvető biztonság csak fizetős ügyfeleknek jár. Az RLS, a jelszavas autentikáció, a session-védelem és a személyes adatok zárt kezelése **minden Free felhasználónak kötelezően biztosított** `[Következtetés]`.
- **Adatmegőrzési garancia átálláskor:** Ha egy meglévő ingyenes felhasználónak már van védett adata, csomagváltáskor vagy lejáratkor **tilos a védelmet automatikusan kikapcsolni, a PIN-t törölni vagy az adatot nyilvánossá tenni** `[Következtetés]`. A meglévő védett adatok megtekinthetők és letölthetők maradnak (Read-and-Manage), de új védett tétel rögzítéséhez fizetős csomag vagy VIP szükséges `[Javaslat]`.

#### 10.4.2. Biztosítási PDF leltárexport mint fizetős funkció
- **Elfogadott üzleti döntés:** A hivatalos biztosítási és kárrendezési PDF-generálás és -letöltés a **fizetős csomagok (Plus, Family, Business) és a VIP-tesztelők** funkciója `[Elfogadott döntés]`.
- **Free hozzáférés:** Free fiókkal a formázott, letölthető biztosítási PDF nem generálható `[Elfogadott döntés]`.
- **Szerveroldali kapu (Server-Side Gate):** A hozzáférést a PDF-et előállító Edge Function vagy RPC szintjén kötelező ellenőrizni; a letöltési gomb pusztán felületi elrejtése nem elegendő `[Következtetés]`.
- **Alapjogok védelme Free-ben:** A meglévő leltáradatok képernyős áttekintése, a tételek törlése és a **teljes CSV-adatexport Free csomagban is korlátlan és ingyenes marad**, biztosítva a felhasználói adathordozhatóságot (GDPR) `[Javaslat]`.

#### 10.4.3. Három különálló fogalom szigorú elhatárolása
A tervezés során három alapvető területet kötelező függetlenként kezelni `[Következtetés]`:
1. **Adatokhoz való hozzáférés joga:** A felhasználó bármikor hozzáférhet saját meglévő adataihoz (Read-and-Manage módban is).
2. **Adatok megőrzésének garanciája:** Kvótatúllépés, lemondás vagy kódvisszavonás esetén meglévő adat nem törlődik és nem publikálódik.
3. **Prémium funkciók elérhetősége:** A prémium eszközök (Széf, PDF, emelt kvóták) kizárólag érvényes fizetős státusz vagy aktív VIP/promóciós jogosultság mellett vehetők igénybe.

---

### 10.5. Teljes Free / Plus / Family / Business / VIP funkciómátrix

Az alábbi táblázat tartalmazza a Thingor funkcióterületeinek véglegesített hozzáférési és kvótaszabályait a nyilvános tesztidőszak és a VIP-tesztelés tükrében `[Javaslat]`:

| # | Funkcióterület | Free (Tesztben aktív) | Plus (Tesztben letiltva) | Family (Tesztben letiltva) | Business (Tesztben letiltva) | VIP (Tesztelőknek elérhető) | Kvóta hatóköre | Szerveroldali védelem helye | Megvalósítás állapota |
|---|---|---|---|---|---|---|---|---|---|
| **1.** | **Fiókkezelés és profil** | Teljes | Teljes | Teljes | Teljes | Teljes | Felhasználó | Supabase Auth | **Megvalósított** `[Ellenőrzött tény]` |
| **2.** | **Saját tárgyak (Items)** | 50 db | 1 000 db | 3 000 db (közös) | Korlátlan (20k fair use) | **Teljes Business keret** | Személyes / Háztartás | SQL Trigger `BEFORE INSERT ON items` | **Megvalósított** `[Ellenőrzött tény]` |
| **3.** | **Fotók, iratok (R2 tárhely)**| 100 MB (100M B) | 2 GB `[Javaslat]` | 5 GB (közös) `[Javaslat]`| 10 GB+ / Egyedi | **Emelt keret (10 GB védve)** | Személyes / Háztartás | `storage-r2` Quota Reservation | **Megvalósított** `[Ellenőrzött tény]` |
| **4.** | **Dokumentum rekordok** | 5 db | Korlátlan | Korlátlan | Korlátlan | **Korlátlan** | Személyes | SQL Trigger `item_documents` | **Megvalósított** `[Ellenőrzött tény]` |
| **5.** | **Fizikai tárolók & QR** | 3 doboz | Korlátlan | Korlátlan | Korlátlan | **Korlátlan** | Személyes / Háztartás | SQL Trigger `storage_containers` | **Megvalósított** `[Ellenőrzött tény]` |
| **6.** | **Széf (Vault) védelem** | **Nem érhető el** | **Elérhető** | **Elérhető** | **Elérhető** | **Elérhető** | Személyes / Háztartás | SQL Trigger `is_vault_protected` | **Megvalósított** `[Ellenőrzött tény]` |
| **7.** | **Biztosítási PDF leltár** | **Nem érhető el** | **Elérhető** | **Elérhető** | **Elérhető** | **Elérhető** | Személyes | Edge Function jogosultsági kapu | **Megvalósított** `[Ellenőrzött tény]` |
| **8.** | **Garanciák & Karbantartás** | Teljes (50 tárgyig) | Teljes | Teljes | Teljes + Szerviz riport | **Teljes Business riport** | Személyes / Háztartás | `items` trigger által védve | **Megvalósított** `[Ellenőrzött tény]` |
| **9.** | **Finanszírozás / Részlet** | Teljes (50 tárgyig) | Teljes | Teljes | Teljes | **Teljes** | Személyes | Nincs külön korlát | **Megvalósított** `[Ellenőrzött tény]` |
| **10.** | **Kamra & Bevásárlókosár** | Max. 25 tétel | Korlátlan | Korlátlan | Korlátlan | **Korlátlan** | Személyes / Háztartás | SQL Trigger `pantry_items` | **Megvalósított** `[Ellenőrzött tény]` |
| **11.** | **Gyűjtemények katalógus** | 1 gyűjtemény (20 tétel) | 10 gyűjtemény | Korlátlan | Korlátlan | **Korlátlan** | Személyes | SQL Trigger `collections` | **Megvalósított** `[Ellenőrzött tény]` |
| **12.** | **Kölcsönadás & Névjegyzék** | 3 aktív kölcsön | Korlátlan | Korlátlan | Korlátlan | **Korlátlan** | Személyes | SQL Trigger `item_loans` | **Megvalósított** `[Ellenőrzött tény]` |
| **13.** | **Gyorsjegyzetek** | 10 jegyzet | Korlátlan | Korlátlan | Korlátlan | **Korlátlan** | Személyes | SQL Trigger `quick_notes` | **Megvalósított** `[Ellenőrzött tény]` |
| **14.** | **Háztartási meghívás** | **Tiltva (0 fő)** | **Tiltva (0 fő)** | **Max. 5 fő összesen** | Korlátlan munkatárs | **Tesztelhető (max. 5 fő)** | **Háztartás** | SQL Trigger `household_invites` | **Megvalósított** `[Ellenőrzött tény]` |
| **15.** | **Vendéglinkes megosztás** | 1 link (24h) | Korlátlan link | Korlátlan link | Márkázott, védett | **Korlátlan / Védett** | Személyes | SQL Trigger `item_shares` | **Megvalósított** `[Ellenőrzött tény]` |
| **16.** | **Tárgykapcsolatok (Graph)** | Teljes | Teljes | Teljes | Teljes | **Teljes** | Személyes | RLS meglévő policy | **Megvalósított** `[Ellenőrzött tény]` |
| **17.** | **Piactér hirdetések** | 3 aktív hirdetés | 15 aktív | 30 aktív | Kiemelt / Korlátlan | **Kiemelt / Korlátlan** | Személyes | SQL Trigger `marketplace_listings` | **Megvalósított** `[Ellenőrzött tény]` |
| **18.** | **Piactér Chat & Alkudozás** | Teljes | Teljes | Teljes | Vállalati profil | **Teljes** | Személyes | RLS meglévő policy | **Megvalósított** `[Ellenőrzött tény]` |
| **19.** | **Követés & Nyilvános profil**| Teljes | Teljes | Teljes | Verifikált jelvény | **VIP / Verifikált jelvény**| Személyes | RLS meglévő policy | **Megvalósított** `[Ellenőrzött tény]` |
| **20.** | **Értesítések (In-app/E-mail)**| In-app korlátlan, 2 e-mail | In-app + E-mail | In-app + E-mail | E-mail + Webhook | **In-app + E-mail** | Személyes | `process-notifications` Edge Fn | **Megvalósított** `[Ellenőrzött tény]` |
| **21.** | **CSV leltárexport** | **Ingyenes és korlátlan** | Ingyenes | Ingyenes | Ingyenes | **Ingyenes és korlátlan** | Személyes | Kliensoldali exportálás | **Megvalósított** `[Ellenőrzött tény]` |
| **22.** | **Közösségi hírfolyam/Csoportok**| *Besorolásra vár* | *Besorolásra vár* | *Besorolásra vár* | *Besorolásra vár* | **Teljes hozzáférés** | Személyes | Későbbi migráció szükséges | **Csak terv** `[Ellenőrzött tény]` |
| **23.** | **Admin & Promóciókezelő** | Nincs hozzáférés | Nincs | Nincs | Szervezeti audit | **Kizárólag Rendszeradmin**| Rendszer | `is_admin()` meglévő RLS | **Tervezett admin modul** `[Javaslat]` |

---

### 10.6. Személyes, háztartási és üzleti kvóták elválasztása

1. **Azonosítók és tárolási struktúra a kódban:**
   - Az `items`, `storage_containers`, `item_documents` rekordokban az `user_id` **mindig a létrehozó fizikai felhasználó UUID-ja** `[Ellenőrzött tény]`.
   - Az R2 proxy (`storage-r2/index.ts`) a fájlokat szigorúan a feltöltő alá menti: `<uploader_user_id>/photos/...` vagy `<uploader_user_id>/documents/...` `[Ellenőrzött tény]`.
2. **Közös leltár elszámolása:**
   - Ha egy tárgy `ownership_scope = 'household'` és hozzá van rendelve egy érvényes `household_id`-hoz, akkor a tétel a **háztartás közös darabszámát (Family: 3 000)** terheli `[Javaslat]`.
   - A tételhez csatolt fotók és dokumentumok fizikai bájtmérete a háztartás közös 5 GB-os tárhelyét terheli, duplikációmentesen `[Javaslat]`.
3. **Privát leltár elszámolása:**
   - Az `ownership_scope = 'private'` tételek kizárólag a tag saját egyéni keretét (Free: 50 tárgy, 100 MB) terhelik, azokhoz a háztartás többi tagja nem fér hozzá `[Ellenőrzött tény]`.

---

### 10.7. Kvótatúllépés és adatmegőrzési garancia (Read-and-Manage mód)

**Szigorú alapelv:** Kvótatúllépés, csomagvisszaminősítés, kódvisszavonás vagy előfizetés-lejárat miatt **felhasználói adat SOHA, SEMMILYEN KÖRÜLMÉNYEK KÖZÖTT NEM TÖRÖLHETŐ AUTOMATIKUSAN** `[Javaslat]`.

#### 10.7.1. A Read-and-Manage működése a gyakorlatban
Ha egy felhasználó eléri a kvótáját (pl. lejár a VIP státusza, és 400 tárgya van a Free 50-es korlát mellett):
- **Engedélyezett műveletek (Zavartalan hozzáférés):**
  - Meglévő tárgyak, iratok, fotók megtekintése és keresése `[Ellenőrzött tény]`.
  - Meglévő tételek adatainak módosítása (cím, leírás, tároló helye) `[Ellenőrzött tény]`.
  - Tárgyak és fájlok törlése (helyfelszabadítás céljából) `[Ellenőrzött tény]`.
  - Meglévő fotók és csatolt dokumentumok letöltése `[Ellenőrzött tény]`.
  - Teljes leltár korlátlan CSV exportálása `[Ellenőrzött tény]`.
- **Blokkolt műveletek (Szerveroldali tiltás):**
  - Új tárgy létrehozása (`INSERT INTO items`) sikertelen a kvótahatár felett `[Következtetés]`.
  - Új fotó vagy dokumentum feltöltése sikertelen a tárhelykvóta felett `[Következtetés]`.
  - Új Széf-védelem bekapcsolása Free fiókban nem engedélyezett `[Következtetés]`.
  - Biztosítási PDF letöltése Free fiókkal zárolva van `[Következtetés]`.
- **Felületi visszajelzés:** Letisztult tájékoztató sáv a felület tetején: *„Fiókod elérte a csomagkvótát. Meglévő adataid biztonságban elérhetők. Új tételek rögzítéséhez válts csomagot, vagy szabadíts fel helyet!”* `[Javaslat]`.

---

### 10.8. VIP-hozzáférés és Adminisztrátori Promócióskód-rendszer (Véglegesített specifikáció)

A rendszer célja, hogy a platform adminisztrátora saját maga, családtagjai és barátai (tesztelők) bevonásával a teljes alkalmazás összes funkcióját biztonságosan ellenőrizhesse anélkül, hogy a fizetős csomagokat megnyitná a nyilvánosság számára `[Elfogadott döntés]`.

#### 10.8.1. A VIP jogosultsági szintje (Business csomag tesztelés)
1. **Teljes Business funkcionalitás:** A VIP-jogosultság biztosítja a **Business csomag teljes funkciókészletét** `[Elfogadott döntés]`. Feloldja az összes olyan prémium funkciót, amely a tervek szerint csak a Plus, Family vagy Business csomagban érhető el:
   - Fizetős Széf / Vault funkciók teljes körű használata.
   - Hivatalos biztosítási és kárrendezési PDF generálása és letöltése.
   - Háztartási megosztási és szerepkör-kezelési eszközök tesztelése.
   - Vállalkozói / Business eszközök és kiterjesztett modulok elérése.
2. **Pénzügyi függetlenség:** A VIP-hozzáférés **nem jelent fizetett előfizetést, nem indít bankkártyás fizetést, és nem igényel Lemon Squeezy tranzakciót** `[Elfogadott döntés]`.
3. **Kapacitásvédelmi korlátok:** A VIP státusz **NEM jelent korlátlan fizikai tárhelyet**, és nem kerülheti meg a globális 10 000 000 000 bájtos R2-kapacitáskorlátot `[Elfogadott döntés]`. A VIP fiókok számára egy biztonságos, emelt szintű kvóta (pl. 5 GB) kerül kiosztásra `[Javaslat]`.
4. **Adatvédelmi határok és RLS sérthetetlensége:**
   - A csomagszintű funkcióhozzáférés **nem írhatja felül az adatok tulajdonjogát, a háztartási tagságot, az objektumszintű hozzáférési szabályokat vagy a felhasználók közötti adatvédelmet** `[Elfogadott döntés]`.
   - A VIP-jogosultság **nem ad automatikus hozzáférést más tesztelők privát leltárához, dokumentumaihoz, Széféhez vagy háztartásához** `[Elfogadott döntés]`.

#### 10.8.2. Adminisztrátori kódgenerátor
Kizárólag szerveroldalon ellenőrzött adminisztrátori jogosultsággal (`profiles.role = 'admin'`) elérhető felület a beállításokban `[Elfogadott döntés]`. A kliensoldali felület önmagában nem biztosíthat adminisztrátori hozzáférést `[Következtetés]`.
Az adminisztrátor:
- Kriptográfiailag biztonságos, nehezen kitalálható véletlenszerű kódokat generálhat (pl. `THINGOR-VIP-8K3M9X`) `[Elfogadott döntés]`.
- Kiválaszthatja a kód típusát:
  - **VIP-kód:** Teljes Business funkciókészletet biztosító tesztelői hozzáférés `[Elfogadott döntés]`.
  - **Promóciós kód:** Meghatározott Plus, Family vagy Business csomagot biztosító hozzáférés `[Elfogadott döntés]`.
- Beállíthatja a jogosultság időtartamát: 7 nap, 14 nap, 30 nap, illetve **lejárat nélküli (perpetual)** hozzáférés `[Elfogadott döntés]`.
- Beállíthatja a kód beváltási határidejét (`valid_until`), amely független a beváltással aktivált hozzáférés lejáratától `[Elfogadott döntés]`.
- Létrehozhat **egyszer használatos kódot** (`max_uses = 1`, alapértelmezett) vagy korlátozott számú sikeres beváltást engedélyező **kampánykódot** (`max_uses = N`) `[Elfogadott döntés]`.
- Megadhatja a kampány maximális beváltásszámát, kampánycímkéjét és belső adminisztrátori megjegyzését `[Elfogadott döntés]`.
- Megtekintheti a kód állapotát (`active`, `expired`, `exhausted`, `revoked`), a beváltások számát, a beváltó felhasználókat, a jogosultság kezdő és záró időpontját, valamint a visszavonás előzményeit `[Elfogadott döntés]`.
- Visszavonhatja a kódot, illetve külön művelettel visszavonhatja a már aktivált jogosultságot is `[Elfogadott döntés]`.

#### 10.8.3. Kódbeváltás és a három időfogalom szigorú szétválasztása
A rendszer három független időbeli fogalmat kezel `[Elfogadott döntés]`:
1. **Beváltási határidő (`valid_until`):** Meddig váltható be a kód a felületen. Ezen időpont után a kód állapota automatikusan `expired` lesz `[Következtetés]`.
2. **Jogosultság időtartama (`duration_days`):** Mennyi ideig érvényes a beváltással szerzett hozzáférés a beváltástól számítva (pl. 30 nap vagy végtelen) `[Következtetés]`.
3. **Jogosultság kezdete:** A jogosultság számlálása **a sikeres beváltás pillanatában (`redeemed_at`) indul el**, és a `redeemed_at + duration_days` időpontig tart (kivéve ha lejárat nélküli) `[Következtetés]`.
- **A lejárat nélküli hozzáférés nem jelent visszavonhatatlanságot:** Az adminisztrátor a szabályok szerint később bármikor visszavonhatja `[Elfogadott döntés]`.
- **Szerveroldali atomi tranzakció:** A beváltás PostgreSQL tranzakcióban (`redeem_promo_code` RPC) sorszintű zárolással (`FOR UPDATE`) fut, megelőzve, hogy egy egyszer használatos kódot párhuzamos lekérésekkel többen is érvényesítsenek `[Következtetés]`.
- **Naplóvédelem:** A rendszernaplókba és audit logokba teljes, nyers titkos kód soha nem kerülhet be (csak maszkolt vagy hash-elt forma) `[Elfogadott döntés]`.

#### 10.8.4. Kódvisszavonás — A két kötelező működési mód
A kód visszavonását és a már aktivált hozzáférés megszüntetését külön műveletként kezeli a rendszer `[Elfogadott döntés]`:

**A. Azonnali hozzáférésmegvonás (Immediate Revocation):**
- A kód további beváltása azonnal tiltásra kerül `[Elfogadott döntés]`.
- Az adminisztrátor külön művelettel azonnal megszüntetheti a kódhoz kapcsolódó, már aktivált jogosultságot `[Elfogadott döntés]`.
- A megszüntetett jogosultság a szerveroldali ellenőrzés miatt azonnal hatályba lép: nem használható új API-kéréseken, szerveroldali műveleteken vagy frissített munkameneteken keresztül sem `[Elfogadott döntés]`.
- Az intézkedés **nem törli a felhasználói fiókot vagy az adatokat**; a fiók zökkenőmentesen átvált Free Read-and-Manage állapotba `[Elfogadott döntés]`.

**B. Hozzáférés az eredeti lejáratig (Graceful Expiration):**
- A kód további beváltása azonnal tiltásra kerül `[Elfogadott döntés]`.
- A korábban sikeresen aktivált hozzáférések az eredetileg meghatározott lejáratig érvényesek maradnak `[Elfogadott döntés]`.
- A lejárat után a felhasználó visszatér az egyébként érvényes csomagja szerinti jogosultságokhoz (alapértelmezetten Free) adatvesztés nélkül `[Elfogadott döntés]`.

**Audit és biztonsági garanciák:**
- Minden adminisztrátori művelet naplózva van: végrehajtó adminisztrátor azonosítója, időpont, érintett kód azonosítója, érintett felhasználó UUID-ja és a művelet típusa `[Elfogadott döntés]`.
- A visszavonás semmilyen esetben nem törölhet adatot, nem tehet privát fájlt nyilvánossá, és nem kerülheti meg az RLS-t `[Elfogadott döntés]`.

#### 10.8.5. VIP-tesztelők (Admin, Családtagok, Barátok)
- **Célzott tesztelés:** Az adminisztrátor saját maga, családtagjai és barátai számára biztosíthat teljes funkcionalitású tesztelési hozzáférést `[Elfogadott döntés]`.
- **Hitelesítés:** A kódot kizárólag a megfelelően hitelesített felhasználó válthatja be saját fiókjában `[Elfogadott döntés]`.
- **Megosztási határok sérthetetlensége:**
  - A VIP-kód beváltása **nem teszi lehetővé a nyilvános fizetős csomagválasztást** a felületen `[Elfogadott döntés]`.
  - A VIP **nem ad automatikus hozzáférést más családtag vagy tesztelő fiókjához** `[Elfogadott döntés]`.
  - A Family csomag maximális létszáma továbbra is **5 fő összesen**, a tulajdonossal együtt `[Elfogadott döntés]`.
  - A VIP-jogosultság **nem ad automatikus jogot a Family vagy Business megosztási határok megkerülésére** `[Elfogadott döntés]`.

#### 10.8.6. Meglévő fizetős előfizetés és kódbeváltás ütközéskezelése
- A kódbeváltás nem törli és nem módosítja a számlázási adatbázisrekordokat `[Következtetés]`.
- A felhasználó az érvényes időszakban a kedvezőbb jogosultsági szintet (Effective Entitlement) kapja meg `[Javaslat]`.
- A kód lejárta vagy visszavonása után a jogosultsági motor automatikusan visszaáll az érvényes fizetett előfizetésre vagy a Free szintre, **adatvesztés nélkül** `[Következtetés]`.

---

### 10.9. Árazási és Lemon Squeezy integrációs irányelvek

- **Szerepkör:** A Lemon Squeezy kezeli a számlázást, az ÁFA-t és a fizetési tranzakciókat (Merchant of Record) `[Következtetés]`.
- **Integrációs fegyelem:** Ebben a tervezési szakaszban tilos bármilyen SDK telepítése, webhook létrehozása, tesztfizetés indítása vagy titkos kulcsok felvétele `[Ellenőrzött tény]`.
- **Tervezett architektúra:**
  1. Későbbi `billing-webhook` Edge Function HMAC SHA-256 aláírás-ellenőrzéssel `[Javaslat]`.
  2. `subscription_webhook_logs` tábla az `event_id` idempotens feldolgozására `[Javaslat]`.
  3. A fizetési események és a promóciós kódok állapotának szinkronizálása a központi jogosultsági nézetben (`user_effective_entitlements`) `[Javaslat]`.

---

### 10.10. Végrehajtási szakaszok és a Fizetős indulás előtti ellenőrzési kapu (Pre-launch Audit Gate)

A megvalósítás szigorúan 7 egymásra épülő fázisban tervezendő `[Javaslat]`:
- **0. Fázis:** Termékdöntések rögzítése (Jelenlegi állapot).
- **1. Fázis:** Előfizetési adatmodell és biztonsági alapok (táblák szigorú RLS-védelemmel).
- **2. Fázis:** VIP- és Promócióskód-rendszer megvalósítása (RPC, admin felület, tesztelés).
- **3. Fázis:** Szerveroldali kvóták érvényesítése (PostgreSQL triggerek, Quota Reservation az R2 proxyban).
- **4. Fázis:** Frontend állapot és visszajelzés (kvótamérők, tájékoztató sávok).
- **5. Fázis:** Csomagváltás, lejárati és adatmegőrzési tesztek staging környezetben.
- **6. Fázis:** Lemon Squeezy fizetési integráció sandbox teszteléssel.

#### 10.10.1. Fizetős indulás előtti kötelező ellenőrzési kapu (Pre-launch Audit Gate)
A tesztidőszak végén a fizetős csomagok **nem nyílhatnak meg automatikusan** `[Elfogadott döntés]`. A későbbi éles indulás előtt kötelezően ellenőrizni kell az alábbi 8 ellenőrzési területet `[Elfogadott döntés]`:
1. **Szerveroldali kikényszerítés:** A csomagok és jogosultságok szerveroldali kikényszerítése minden API végponton és táblán igazoltan működik.
2. **Kvótarendszer:** Az egyéni, háztartási, szervezeti és globális kvóták pontosan számolnak.
3. **Párhuzamos műveletek:** A párhuzamos feltöltések és tárhely-előfoglalások (Quota Reservation) versenyhelyzet-mentesek.
4. **Kódrendszer és audit:** A VIP-kódok beváltása, lejárata, mindkét visszavonási módja és auditnaplózása tesztelve van.
5. **Adatvédelem és RLS:** Az autentikáció, az RLS, a privát fájlok hozzáférése és az adatvédelmi határok sértetlenek.
6. **Fizetési életciklus:** A Lemon Squeezy fizetési webhookok, az ismétlődő események (idempotencia) és az előfizetés teljes életciklusa sandboxban igazoltan működik.
7. **Szolgáltatásvédelem:** A visszaélések elleni védelem (rate limiting), a telemetria, a riasztások és a vészhelyzeti eljárás felkészült.
8. **Kapacitás és költségterhelés:** A tényleges R2-kapacitás és a várható költségterhelés alátámasztott.

*Kötelező feltétel:* Az ellenőrzési lista teljesítése önmagában nem jogosít fel az indulásra: **külön adminisztrátori vagy tulajdonosi jóváhagyás szükséges** a fizetős értékesítés megnyitásához `[Elfogadott döntés]`.

---

### 10.11. Tesztelési és elfogadási kritériumok

A későbbi implementáció kizárólag akkor tekinthető sikeresnek, ha az alábbi 10 kötelező teszteset mindegyike igazoltan teljesül `[Javaslat]`:

1. **Free felhasználó háztartási meghívási tilalma:** Free fiókkal indított meghívás-létrehozási kísérlet (`INSERT INTO household_invites`) szerveroldali PostgreSQL hibával meghiúsul.
2. **Family létszámplafon:** Egy 5 fős Family háztartásba indított 6. meghívó elfogadási kísérlete szerveroldalon elutasításra kerül.
3. **VIP-kód kapacitásvédelme:** A VIP-kóddal feloldott fiók korlátlanul használhatja a prémium funkciókat, de a globális 10 GB-os R2-kapacitáskeret túllépése esetén a feltöltés megtagadásra kerül.
4. **Lejárt vagy visszavont kód:** Lejárt beváltási határidejű vagy `revoked` státuszú kód beváltási kísérlete hibaüzenettel elutasításra kerül.
5. **Párhuzamos beváltás elleni védelem:** Egyetlen egyszer használatos kódot két egyidejű aszinkron kéréssel megkísérelve beváltani, az atomi tranzakció (`FOR UPDATE`) miatt pontosan 1 kérés sikeres, a második elutasításra kerül.
6. **Időszakos jogosultság lejárata:** A 14 vagy 30 napos promóciós időszak lejárta után a felhasználó adatai 100%-ban megmaradnak, a fiók zökkenőmentesen átvált Read-and-Manage módba.
7. **Fizetett előfizetés sértetlensége:** Érvényes Lemon Squeezy előfizetéssel rendelkező felhasználó általi kódbeváltás nem írja felül vagy törli a számlázási adatbázisrekordokat.
8. **Adminisztrátori jogosultságvédelem:** Nem adminisztrátor felhasználó közvetlen RPC vagy API hívással sem tud kódot generálni, listázni vagy visszavonni (`Access denied`).
9. **Biztosítási PDF szerveroldali védelme:** Free felhasználó által indított közvetlen PDF-generálási kérés jogosultsági hibával leáll, nem elegendő pusztán a letöltés gomb elrejtése.
10. **Széf-adatok biztonsága visszaminősítéskor:** Prémium csomag lejárta után a korábban védett tételek nem törlődnek, nem válnak nyilvánossá és nem veszítik el PIN-védelmüket.

---

### 10.12. Jóváhagyásra váró nyitott üzleti és termékdöntések

Az alábbi pontok maradnak nyitva a fejlesztés megkezdése előtt:

1. **Plus, Family és Business havidíjak véglegesítése:** Jóváhagyásra vár az 1 490 Ft / 2 990 Ft / 7 990 Ft előzetes árazási javaslat (a tesztidőszakban letiltva).
2. **Fizetős csomagok személyes és közös R2-keretei:** A 10 GB-os kezdeti kapacitás mellett elfogadható-e a Plus 2 GB és Family 5 GB kezdeti keret?
3. **Széf kapacitás fizetős csomagokban:** A Plus és Family csomagokban hány védett tárgy és dokumentum rögzítése legyen engedélyezett (pl. Plus: 50 db, Family: 200 db)?
4. **Éves előfizetés és próbaidőszak:** Legyen-e 2 hónap ajándék éves fizetéskor (pl. Plus: 14 900 Ft/év), és biztosítsunk-e 14 napos bankkártya nélküli Plus próbaidőt új regisztrálóknak a fizetős indulás után?
5. **Piactéri hirdetéskorlátok és kiemelés:** Megfelelő-e a 3 / 15 / 30 / korlátlan aktív hirdetési keret, és a Business fiókok kapjanak-e kiemelt hirdetési megjelenést?
6. **Gyűjtemények, Kamra és Finanszírozás végleges határai:** Elfogadható-e a Kamra 25 tételes és a Gyűjtemények 1 tételes Free határa?
7. **Promóciós kódok visszavonási szabályzata:** A visszavont kódok már aktivált eseteinél az azonnali jogmegvonás vagy az adott ciklus kifutása legyen az alapértelmezett választás a felületen?

---

## 11. ÜZLETI LEHETŐSÉGEK ÉS ADATVÉDELMI KORLÁTOK

A Thingor üzleti modelljének alapja a **felhasználói bizalom**. Az alábbi mátrix részletesen elemzi a lehetséges irányokat és azok jogi határait:

### 11.1. Üzleti lehetőségek értékelése

| Üzleti irány | Érték a felhasználónak | Fizető fél | Függőségek | Jogi / Adatvédelmi kockázat | Fázis |
|---|---|---|---|---|---|
| **1. SaaS Előfizetések** | Magasabb limitek, családi funkciók, biztonság | Felhasználó | Stripe / Lemonsqueezy integráció | Alacsony. Standard fogyasztói szerződés. | **Fázis 4** |
| **2. Szolgáltatói profilok** | Helyi szervizek, restaurátorok gyors elérése | Szolgáltató (szerviz) | Értékelési rendszer, szerviz adatlap | Közepes. Fogyasztóvédelmi szabályok. | **Fázis 5** |
| **3. Biztosítói integráció** | Egykattintásos kárrendezési leltár és igazolás | Felhasználó / Biztosító | PDF/JSON kárbejelentő export | Magas. Kifejezett felhasználói hozzájárulás kell. | **Fázis 6** |
| **4. Gyártói / Garanciális integráció** | Digitális jótállási jegy, automatikus visszahívási értesítés | Gyártó / Márkaképviselet | Márka API partnerek | Közepes. Csak a tárgy típusára vonatkozhat, személyes adatok nélkül. | **Fázis 6** |
| **5. Tranzakciós díjak (Piactér)** | Biztonságos letéti fizetés (Escrow), szállítás | Eladó / Vevő | Fizetési szolgáltató, futárszolgálat | Magas. Pénzforgalmi engedélyezési kérdések. | **Később** |
| **6. Anonim statisztikai termékek** | Termékek valós élettartam-statisztikái | Piackutatók, gyártók | K-anonymity aggregációs motor | **Kritikus.** Lásd 11.2 pont. | **Kutatási fázis** |

### 11.2. Szigorú adatvédelmi és GDPR korlátok az adattermékeknél
A privát tárgylisták és dokumentumok közvetlen értékesítése **tilos és kizárt**. Statisztikai célú termék kizárólag a következő feltételekkel hozható létre:
1. **Minimális csoportméret (k-anonymity >= 50):** Egy statisztikai mutató (pl. *"egy bizonyos típusú mosógép átlagos élettartama az első javításig"*) csak akkor generálható le, ha legalább 50 független felhasználó aggregált adataiból áll össze.
2. **Helyadatok levágása:** A helyszín legfeljebb országos szintre aggregálható; irányítószám, kerület vagy koordináta nem szerepelhet statisztikában.
3. **Dokumentumok és számlák teljes kizárása:** A számlák, garancialevelek szöveges tartalma, árai és azonosítói soha nem képezhetik statisztika részét.
4. **Kifejezett opt-in:** A felhasználónak a beállításokban külön engedélyeznie kell, hogy anonimizált műszaki megbízhatósági adatai hozzájáruljanak a közösségi élettartam-indexhez.

---

## 12. BIZTONSÁG ÉS KÖZÖSSÉGI MODERÁCIÓ

### 12.1. Profiladatok kettéválasztása
- **Privát tábla (`public.profiles`):** e-mail cím, titkosított beállítások, szerepkörök, belső azonosítók. Kizárólag a tulajdonos és az admin olvashatja.
- **Publikus tábla (`public.public_profiles`):** megjelenített név, avatar, bemutatkozás, bizalmi pontszám, lezárt ügyletek száma, ellenőrzött jelvény. Mindenki számára olvasható, de módosítani csak a tulajdonos tudja a triggerek által védett mezők kivételével.

### 12.2. Moderációs és védelmi mechanizmusok
1. **Felhasználói bejelentések (`user_reports`):** Bármely poszt, komment, hirdetés vagy profil jelenthető. 3 független bejelentés esetén a tartalom automatikusan felülvizsgálati karanténba kerül (`status = 'moderated'`).
2. **Kétirányú tiltás (`user_blocks`):** Ha „A” felhasználó letiltja „B”-t, egyikük sem láthatja a másik posztjait, nem küldhetnek üzenetet, és a piactéren sem láthatják egymás hirdetéseit.
3. **Spam- és sebességkorlátozás (Rate Limiting):** Postgres szintű trigger korlátozza a posztolási és üzenetküldési gyakoriságot (pl. max. 10 üzenet / perc, max. 5 poszt / óra), megelőzve az automatizált spambotokat.

---

## 13. A JELENLEGI MARKETPLACE AUDITJA ÉS INTEGRÁCIÓS HELYE

A legutóbbi lépésben elkészült piactér kiváló műszaki állapotban van, de a platform egésze szempontjából **nem vezérlő elem, hanem kiegészítő szolgáltatás**.

| Komponens / Objektum | Tényleges állapota | Újrahasznosítási módja a közösségi platformban | Javaslat |
|---|---|---|---|
| [`ListingCard.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/ListingCard.tsx) | Kész, tesztelt | Megtartandó. Kiegészíthető beágyazható minikártya nézettel hírfolyam-posztokba. | **Megtartás** |
| [`MarketplaceFilters.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/MarketplaceFilters.tsx) | Kész, tesztelt | A jövőbeli univerzális kereső és felfedező komponens szűrőinek alapjául szolgál. | **Megtartás & Adaptáció** |
| [`ListingDetailModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/ListingDetailModal.tsx) | Kész, tesztelt | Megtartandó a piactéri részletekhez. A fotógaléria mechanizmusa újrahasznosítható a posztoknál. | **Megtartás** |
| [`CreateEditListingModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/CreateEditListingModal.tsx) | Kész, tesztelt | A leltárból való importálás és az R2 fotófeltöltés mintája közvetlenül átvihető a `CreatePostModal` megvalósításához. | **Megtartás & Mintaként szolgál** |
| [`ConversationsModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/ConversationsModal.tsx) | Kész, tesztelt | Általánosítandó: a tárgyhoz kötött chatből általános közvetlen felhasználói üzenetküldővé (DM) alakítható. | **Átalakítás univerzális csevegővé** |
| [`MakeOfferModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/MakeOfferModal.tsx) | Kész, tesztelt | Megtartandó a piactéri tranzakciókhoz. | **Megtartás az ökoszisztémában** |
| [`PublicProfileModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/PublicProfileModal.tsx) | Kész, tesztelt | Bővítendő: a felhasználó piactéri hirdetésein túl itt jelennek meg a nyilvános posztjai, csoportjai és követői is. | **Bővítés közösségi profillá** |
| [`ReportModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/ReportModal.tsx) | Kész, tesztelt | Univerzális komponens: posztok és kommentek jelentésére is azonnal használható. | **Megtartás & Kiterjesztés** |
| [`src/lib/marketplace.ts`](file:///c:/Users/User/thingor/src/lib/marketplace.ts) | Kész, tesztelt | Szolgáltatásként megmarad, mellette létrejön a `src/lib/community.ts`. | **Megtartás** |

---

## 14. RÉSZLETES FEJLESZTÉSI ROADMAP

A fejlesztést 6 egymásra épülő, szigorúan tesztelhető fázisra bontjuk:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   FÁZIS 1    │ ──> │   FÁZIS 2    │ ──> │   FÁZIS 3    │
│ Közösségi    │     │ Hírfolyam    │     │ Csoportok    │
│ Adatmodell   │     │ & Bejegyzések│     │ & Közösségek │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   FÁZIS 4    │ ──> │   FÁZIS 5    │ ──> │   FÁZIS 6    │
│ Mobil UI 2.0 │     │ Többnyelvűség│     │ Előfizetések │
│ & Személyrez.│     │ & Keresés    │     │ & Partnerek  │
└──────────────┘     └──────────────┘     └──────────────┘
```

### FÁZIS 1: Közösségi Adatalapok és Kapcsolatok (Social Graph & DB Core)
- **Cél:** Létrehozni a felhasználók közötti kapcsolatok, követések és nyilvános bejegyzések adatbázis-struktúráját szigorú RLS védelemmel.
- **Funkciók:**
  - Felhasználói követés (`user_follows` tábla: `follower_id`, `following_id`).
  - Nyilvános profil kiterjesztése (`public_profiles` mezők: `website`, `social_links`, `badges`).
  - Publikus profil oldal kiterjesztése követés gombbal és számlálókkal.
- **Érintett fájlok:** `supabase/migrations/`, `src/types/`, `src/lib/community.ts`, `PublicProfileModal.tsx`.
- **Feltétel:** Meglévő privát adatok 100%-os érintetlensége.

### FÁZIS 2: Bejegyzések és Hírfolyam Motor (Posts & Feed Engine)
- **Cél:** Működő hírfolyam és posztolási lehetőség a felhasználók számára.
- **Funkciók:**
  - Bejegyzések tábla (`community_posts`) és fotók (`post_images`).
  - Bejegyzés létrehozása modal fotófeltöltéssel (R2) és leltári tárgy becsatolásával.
  - Hozzászólások (`post_comments`) és reakciók (`post_reactions`).
  - Hírfolyam komponens lapozással és frissítéssel.
- **Érintett fájlok:** `src/components/community/FeedView.tsx`, `CreatePostModal.tsx`, `PostCard.tsx`.

### FÁZIS 3: Csoportok és Érdeklődési Közösségek (Groups Engine)
- **Cél:** Tematikus terek létrehozása és moderációja.
- **Funkciók:**
  - Csoportok tábla (`community_groups`) és tagságok (`group_members`).
  - Csoportböngésző, csatlakozási kérelem, moderátori jogosultságok.
  - Csoporton belüli hírfolyam szűrés.
- **Érintett fájlok:** `src/components/community/GroupsView.tsx`, `GroupDetailView.tsx`.

### FÁZIS 4: Mobil Ergonómia 2.0 és Személyre Szabott Kezdőlap
- **Cél:** A felület átszervezése az új közösségi fókusz szerint, a navigáció tehermentesítése.
- **Funkciók:**
  - 5 gombos mobil alsó navigáció bevezetése kontextuális FAB gombbal.
  - Új "Több / Modulok" felugró lap (Bottom Sheet).
  - Személyre szabható kezdőlap widgetekkel.
- **Érintett fájlok:** `Navbar.tsx`, `App.tsx`, `DashboardView.tsx`.

### FÁZIS 5: Moduláris Többnyelvűség és Univerzális Keresés
- **Cél:** A szótárak moduláris JSON fájlokba szervezése és globális kereső.
- **Funkciók:**
  - Szótárak szétbontása névtér szerint (`locales/hu/`, `locales/en/`).
  - Füles globális kereső (Posztok, Csoportok, Emberek, Piactér, Leltár).
- **Érintett fájlok:** `src/i18n/`, `src/components/UniversalSearchView.tsx`.

### FÁZIS 6: Előfizetési Jogosultsági Modell és Partneri Előkészítés
- **Cél:** A fenntartható üzleti modell alapjainak letétele.
- **Funkciók:**
  - Csomagtáblák (`subscriptions`, `subscription_tiers`).
  - Szerveroldali kvótaellenőrző triggerek a leltártételekre és tárhelyre.
  - Csomagválasztó és előfizetés-kezelő felület a beállításokban.
- **Érintett fájlok:** `supabase/migrations/`, `src/components/SettingsView.tsx`.

---

## 15. FÁZISONKÉNTI ELFOGADÁSI KRITÉRIUMOK

Minden egyes fejlesztési fázis kizárólag akkor tekinthető befejezettnek, ha teljesíti a következő minőségi kapukat:

1. **Build és Típusbiztonság:**
   - `npm run build` hiba nélkül, Exit code 0-val lefut.
   - `npm run lint` 0 hibával fut le.
2. **Adatbiztonsági Teszt:**
   - Anonim és idegen felhasználó tesztelése: nem fér hozzá mások zárt csoportjaihoz vagy magánleltárához.
   - A `public.items` és `public.profiles` táblák RLS szabályai változatlanul védettek.
3. **Kétnyelvűségi Ellenőrzés:**
   - Egyetlen új felületi elem sem tartalmazhat beégetett, lefordítatlan szöveget; a kulcsok mind magyarul, mind angolul léteznek.
4. **Mobil Ergonómia:**
   - Minden új komponens 360px szélességű mobil képernyőn is hibátlanul, vízszintes görgetősáv nélkül működik.

---

## 16. KOCKÁZATOK, FÜGGŐSÉGEK ÉS NYITOTT DÖNTÉSEK

| Kockázat | Súlyosság | Mitigációs stratégia |
|---|---|---|
| **Kliensoldali memóriatúlcsordulás (`AppContext`)** | **Magas** | A közösségi posztokat és hírfolyamot tilos betölteni az `AppContext`-be! A közösségi moduloknak önálló, lapozott lekérdezéseket kell használniuk SWR/React Query vagy egyedi lokális állapot szerint. |
| **Spam és kéretlen tartalmak a hírfolyamban** | **Közepes** | Posztolási sebességkorlátozás (Rate Limiting), automatikus karantén 3 bejelentés után, új felhasználóknál minimális várakozási idő az első poszt előtt. |
| **Felhasználói tartalom-moderáció jogi felelőssége** | **Magas** | Világos ÁSZF és Közösségi Irányelvek; egyértelmű bejelentő felület ([`ReportModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/ReportModal.tsx)); moderátori admin felület biztosítása. |
| **Képtárhely költségnövekedés (R2)** | **Alacsony** | A meglévő kliensoldali WebP tömörítés ([`storage.ts`](file:///c:/Users/User/thingor/src/lib/storage.ts)) és a 15 MB-os maximális méretkorlát szigorú betartatása a posztoknál is. |

---

## 17. AZ ELSŐ FEJLESZTÉSI LÉPÉS JAVASLATA (NEXT STEP)

A tervezési fázist követően a megvalósítás **Fázis 1**-gyel indul:
1. **Adatbázis-előkészítés (Staging):** Elkészíteni a `20261025_community_core_schema.sql` migrációt, amely létrehozza a `user_follows` kapcsolat-táblát és kibővíti a `public_profiles` táblát a közösségi mezőkkel.
2. **Közösségi szolgáltatásréteg:** Létrehozni a `src/lib/community.ts` fájlt a követési, profil-lekérdezési és feed-alapozási függvényekkel.
3. **Publikus profil bővítése:** A meglévő [`PublicProfileModal.tsx`](file:///c:/Users/User/thingor/src/components/marketplace/PublicProfileModal.tsx) felkészítése a Követés/Követők megjelenítésére és kezelésére.

*A jelen mesterterv a Thingor közösségi platformmá alakításának hivatalos zsinórmértéke; minden jövőbeli kódmódosításnak ezen architektúrához kell illeszkednie.*
