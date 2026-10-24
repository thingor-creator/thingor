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

### 9.2. Szerveroldali jogosultsági modell (Server-Side Entitlements)

A csomagkorlátok betartatását a Supabase PostgreSQL szintjén valósítjuk meg:
- Minden felhasználóhoz tartozik egy előfizetési állapot (`public.subscriptions`).
- SQL függvények ellenőrzik a limiteket sorbeszúráskor (pl. `check_item_limit_before_insert()`).
- Ha a felhasználó elérte a csomagja limitjét, a trigger elutasítja az INSERT műveletet (`P0001: Subscription quota exceeded`), megelőzve az API szintű visszaéléseket.

---

## 10. ELŐFIZETÉSI CSOMAGOK ÉS HASZNÁLATI KERETEK

### 10.1. Csomagstruktúra

| Képesség | Free (Közösségi) | Plus (Haladó) | Family (Családi) | Business (Pro/Üzleti) |
|---|---|---|---|---|
| **Havidíj (tervezett)** | 0 Ft | ~1 490 Ft / hó | ~2 990 Ft / hó | ~7 990 Ft / hó-tól |
| **Saját tárgyak limitje** | 100 tárgy | 1 000 tárgy | 3 000 tárgy | Korlátlan |
| **Fotók tárhelye** | 1 GB (R2) | 10 GB (R2) | 30 GB (R2) | 100 GB+ |
| **Dokumentum Vault** | 5 dokumentum | Korlátlan | Korlátlan | Korlátlan |
| **Családi megosztás** | Nem elérhető | 1 partner | Akár 6 családtag | Korlátlan munkatárs |
| **Közösségi hírfolyam & csoportok** | Teljes hozzáférés | Teljes hozzáférés | Teljes hozzáférés | Vállalati jelenlét |
| **Csoportlétrehozás** | Max. 1 csoport | Max. 5 csoport | Max. 10 csoport | Korlátlan |
| **Piactér hirdetések** | 3 aktív | 15 aktív | 30 aktív | Kiemelt / Korlátlan |
| **QR kódos tárolók** | 5 tároló | Korlátlan | Korlátlan | Korlátlan |
| **API és exportálás** | Csak CSV | CSV, JSON | Teljes biztonsági mentés | REST API hozzáférés |

### 10.2. Adatmegőrzési garancia (Graceful Downgrade)
Ha a felhasználó lemondja előfizetését vagy lejár a prémium csomagja:
- **Az adatok SOHA nem törlődnek automatikusan.**
- A fiók `Read-Only & Manage` állapotba kerül: a meglévő 800 tárgy megtekinthető, exportálható, törölhető marad, de új tárgy nem rögzíthető mindaddig, amíg a tételszám a Free limit (100) alá nem csökken, vagy meg nem újítja a csomagot.

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
