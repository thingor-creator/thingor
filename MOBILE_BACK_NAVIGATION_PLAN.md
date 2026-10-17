# Mobil Navigáció és Modális Visszalépés Fejlesztési Terv

## Feladat összefoglalása
1. **Dupla vissza a kilépéshez (Double-back to exit):** Mobileszközön a kezdőképernyőn/főoldalon a visszanyíl egyszeri megnyomására ne lépjen ki az alkalmazásból, hanem jelenjen meg egy értesítés ("Nyomd meg újra a kilépéshez" / "Press back again to exit"). Csak akkor lépjen ki, ha 2 másodpercen belül gyors egymásutánban kétszer kattint.
2. **Modális panelek visszanyíl kezelése (Modal back handler):** Ha a felhasználó megnyit egy panelt (pl. a Spájz menüben a bevásárlókosarat/listát, új tétel rögzítését, vagy bármely más nézetben felugró ablakot), és az [X] gomb helyett a mobil visszanyilára/gesztusára kattint, akkor kizárólag a megnyitott panel záródjon be, és a felhasználó maradjon az aktuális oldalon (pl. Spájzban), ne navigáljon el a korábbi oldalra.
3. **Projekt szinkronizáció:** Kód build ellenőrzése, Supabase változások vizsgálata, git commit és push a GitHub `main` ágra.

---

## 1. Architektúra & Megvalósítási Lépések

### 1. Lépés: Univerzális Modális Registry & Hook (`AppContext.tsx`)
- `registerModalCloseHandler(id: string, onClose: () => void): () => void` bevezetése az `AppContext`-be.
- LIFO (verem) struktúra: `activeModalsRef` tárolja az éppen aktív megnyitott modális paneleket és záró callback-jeiket.
- Exportált `useModalBack(isOpen: boolean, onClose: () => void, modalId?: string)` hook:
  - Ha `isOpen` igazra vált: regisztrálja a modált a verembe és history bejegyzést képez (`window.history.pushState({ isModal: true, modalId }, '')`).
  - Ha `popstate` érkezik (mobil vissza): a legfelső modál záródik be, és a nézetváltás megáll (a felhasználó az oldalon marad).
  - Ha a felhasználó [X]-szel zárja be: automatikusan és csendben eltávolítja a history bejegyzést (`window.history.back()`).

### 2. Lépés: Dupla visszalépéses kilépésvédelem (Double-Back to Exit)
- Kezdeti history őr bejegyzés elhelyezése (`guard` és `isRoot` állapot).
- `handlePopState` eseménykezelő felkészítése:
  - 1. Ha van aktív modál -> legfelső modál bezárása, aktuális nézet érintetlenül hagyása.
  - 2. Ha `selectedItemId` van -> tárgy részletező bezárása, nézet marad.
  - 3. Ha az előzmény veremben (`viewHistoryRef`) van korábbi nézet -> visszalépés az előző nézetre.
  - 4. Ha a főoldalon vagyunk (nincs modál, nincs előzmény):
    - Ha az utolsó visszanyíl kattintás óta eltelt idő < 2000 ms: kilépés engedélyezése.
    - Ha >= 2000 ms (első kattintás): history állapot visszaállítása, és animált "Nyomd meg újra a kilépéshez" toast megjelenítése.

### 3. Lépés: Modális ablakok bekötése a nézetekben
- **Spájz (`PantryView.tsx`):**
  - `isShoppingListOpen` (Bevásárlólista modal)
  - `isModalOpen` (Készlet cikk felvétele/szerkesztése modal)
- **Gyűjtemények (`CollectionsView.tsx`):**
  - `lightboxIndex !== null` (Teljes képernyős képgaléria)
  - `galleryItem !== null` (További képek modal)
  - `isItemModalOpen` (Gyűjtemény tétel modal)
  - `isColModalOpen` (Gyűjtemény mappa modal)
  - `selectedCollectionId !== null` (Gyűjtemény részletező alnézet)
- **Tárolók (`StorageView.tsx`):**
  - `selectedContainerId`, `isCreateModalOpen`, `isAddBulkModalOpen`, `isAssignItemModalOpen`, `isEditContainerModalOpen`
- **Jegyzetek (`NotesView.tsx`):**
  - `isModalOpen` (Jegyzet szerkesztő modal)
- **Javítások (`RepairsView.tsx`):**
  - `isModalOpen` (Javítási bejegyzés modal)
- **Finanszírozás (`FinancingView.tsx`):**
  - `isModalOpen` (Hitel/részlet modal)
- **Családi megosztás (`HouseholdView.tsx`):**
  - `isInviteModalOpen` (Meghívás modal)

### 4. Lépés: Tesztelés & Build ellenőrzés
- `npm run build` futtatása, típus- és fordítási hibák kizárása.
- Viselkedés vizsgálata: modál nyitás/zárás X-szel és visszagombbal.

### 5. Lépés: Supabase ellenőrzés és GitHub szinkronizáció
- Supabase állapot auditálása.
- Git commit és push az `origin/main` tárolóba.
