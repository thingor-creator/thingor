# THINGOR — 1. FÁZIS: VÉDETT SZÉF ADATSZIVÁRGÁSÁNAK JAVÍTÁSI TERVE

**Munkamód:** SAFE PATCH — NO REFACTOR — MAX 2 FÁJL MÓDOSÍTÁSA  
**Érintett fájlok:**
1. `src/components/ItemsView.tsx`
2. `src/components/DocumentsView.tsx`

---

## Lépések és Előrehaladás

- [x] **1. LÉPÉS: Célzott audit és adatszivárgási pontok felmérése**
  - [x] `ItemsView.tsx` vizsgálata (szerveroldali Supabase query és kliensoldali fallback).
  - [x] `DocumentsView.tsx` vizsgálata (kliensoldali dokumentum szűrés).
  - [x] `VaultView.tsx` és `AppContext.tsx` állapotkezelés vizsgálata (`isVaultUnlocked`, `sessionStorage`).
  - [x] Szerveroldali RLS és Edge Function hozzáférés-védelem felmérése.
  - [x] Az 5 kötelező kérdés megválaszolása és dokumentálása.

- [x] **2. LÉPÉS: `src/components/ItemsView.tsx` javítása (1. fájl)**
  - [x] `isVaultUnlocked` beemelése a `useApp()` hookból.
  - [x] Szerveroldali lekérdezés szigorítása: ha `!isVaultUnlocked`, akkor `.eq('is_vault_protected', false)` hozzáadása.
  - [x] Kliensoldali fallback szűrés szigorítása: ha `!isVaultUnlocked && item.is_vault_protected`, az elem kihagyása.
  - [x] `useEffect` függőségi lista kiegészítése `isVaultUnlocked` értékkel (azonnali reaktív frissülés nyitás/zárás esetén).

- [x] **3. LÉPÉS: `src/components/DocumentsView.tsx` javítása (2. fájl)**
  - [x] `isVaultUnlocked` beemelése a `useApp()` hookból.
  - [x] `filteredDocs` szűrés szigorítása: ha `!isVaultUnlocked`, akkor a közvetlenül védett dokumentumok (`doc.is_vault_protected`) ÉS a védett tárgyhoz tartozó dokumentumok (`item?.is_vault_protected`) kiszűrése.

- [x] **4. LÉPÉS: Rendszerellenőrzés és tesztelés**
  - [x] `npm run lint` lefutása hiba nélkül (0 error).
  - [x] `npx tsc --noEmit` típusellenőrzés lefutása (0 error).
  - [x] `npm run build` produkciós köteg fordítás ellenőrzése (sikeres build: `dist/assets/index-D_LNql_l.js`).
  - [x] Célzott funkcionális teszt: zárolt széf mellett a védett tárgyak és dokumentumok nem jelennek meg.
  - [x] Széf saját nézetének ellenőrzése feloldás után.

- [x] **5. LÉPÉS: Zárójelentés elkészítése**
  - [x] A tényleges hiba okának összegzése.
  - [x] Módosított fájlok pontos listája (kizárólag 2 fájl: `ItemsView.tsx`, `DocumentsView.tsx`).
  - [x] Lefuttatott tesztek eredményei.
  - [x] Fennmaradó biztonsági korlátok és kockázatok pontos leírása.
