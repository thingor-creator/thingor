# Fejlesztési Terv: Mobil Visszalépés, Alsó Menü Testreszabás & Bevásárlókosár Értesítések

## 1. Célkitűzés & Követelmények

1. **Mobil eszköz visszanyíl / navigációs gomb javítása:**
   - Amikor a felhasználó a mobil eszköz fizikai vagy képernyőn lévő visszagombjára (browser back arrow, Android gesztus/visszagomb, PWA popstate) kattint, ne lépjen ki az alkalmazásból, és ne dobja azonnal a vezérlőpultba vagy más véletlenszerű nézetbe, hanem az előzőleg látogatott oldalra térjen vissza (vagy zárja be az aktív modális ablakot / részletes nézetet).
   - Az oldalak belső visszanyíl gombjai (SettingsView, AdminView, StorageView) se fix 'items' vagy 'dashboard' nézetre ugorjanak, hanem a valódi előző oldalra lépjenek vissza (`goBack()`).

2. **Mobil alsó menü sáv testreszabása a Beállításokban:**
   - A felhasználó a Beállítások felületén szabadon konfigurálhatja a központi plusz jel (`+` FAB) bal és jobb oldalán lévő 2 gyorsgomb funkcióját (jelenleg fixen Tárgyaim és Tárolók).
   - Választható funkciók:
     - Tárgyaim (`items`)
     - Tárolók (`storage`)
     - Családi megosztás (`household`)
     - Javítások (`repairs`)
     - Finanszírozás (`financing`)
     - Kölcsönadás (`lending`)
     - Gyűjtemények (`collections`)
     - Spájz & Készletek (`pantry`)
     - Széf & Védett tárgyak (`vault`)
     - Jegyzetek (`notes`)
     - Bevásárló kosár (`shopping_list`)
   - A beállítás azonnal érvényesül, mentődik a `userPreferences`-be, és élő vizuális előnézettel segíti a felhasználót.

3. **Bevásárló kosár értesítések beállítása:**
   - Az Értesítések beállításainál (SettingsView és NotificationCenterModal) új kapcsoló bevezetése a Bevásárló kosárhoz / Spájzhoz (`shopping_cart_enabled`).
   - Amikor egy alapvető háztartási cikk készlete eléri a minimumot, a rendszer automatikus értesítést készít, ha a kapcsoló aktív.

---

## 2. Érintett Fájlok Auditja

- `src/types/index.ts`:
  - `UserPreferences`: új mezők `mobile_bottom_bar_left?: string`, `mobile_bottom_bar_right?: string`.
  - `UserNotificationSettings`: új mező `shopping_cart_enabled?: boolean`.
- `src/context/AppContext.tsx`:
  - `viewHistory` és `goBack()` implementálása.
  - `handlePopState` finomhangolása: modálisok/fiók bezárása -> kiválasztott tétel bezárása -> visszalépés a valós előző nézetbe (`viewHistory`).
  - `checkAndGenerateNotifications`: bevásárlókosár / alacsony készlet értesítések generálása, ha `shopping_cart_enabled !== false`.
- `src/components/Navbar.tsx`:
  - A mobil alsó sáv 2. és 4. pozíciójának dinamikus renderelése a `userPreferences` alapján ikonokkal, címkékkel és eseménykezelőkkel.
- `src/components/SettingsView.tsx`:
  - Új szekció: Alsó menü gombok testreszabása bal/jobb választóval és élő előnézettel.
  - Új értesítési opció: Bevásárló kosár / Spájz figyelmeztetések.
  - Visszanyíl gomb javítása a `goBack()` hívására.
- `src/components/NotificationCenterModal.tsx`:
  - Bevásárló kosár értesítési opció hozzáadása a gyorsbeállításokhoz.
- `src/components/AdminView.tsx`:
  - Visszanyíl gomb frissítése `goBack()` használatára.
- `src/components/PantryView.tsx`:
  - `thingor-open-shopping-list` esemény figyelése, hogy a gyorsgomb közvetlenül meg tudja nyitni a bevásárlólistát.

---

## 3. Végrehajtási Lépések

- [ ] **1. Lépés:** Típusdefiníciók bővítése (`src/types/index.ts`)
- [ ] **2. Lépés:** `AppContext.tsx` navigációs előzménykezelés (`goBack`, `viewHistory`, `handlePopState`) és bevásárlókosár értesítés-motor frissítése
- [ ] **3. Lépés:** `Navbar.tsx` dinamikus alsó menüsáv gombok implementálása az összes választható modullal
- [ ] **4. Lépés:** `SettingsView.tsx` alsó menü testreszabó kártya és bevásárlókosár értesítési kapcsoló beépítése, visszanyíl javítása
- [ ] **5. Lépés:** `NotificationCenterModal.tsx` és `AdminView.tsx` kiegészítése
- [ ] **6. Lépés:** `PantryView.tsx` felkészítése a Bevásárló kosár gyorsgomb eseményének fogadására
- [ ] **7. Lépés:** Teljes projekt build (`npm run build`) és TypeScript ellenőrzés
- [ ] **8. Lépés:** Részletes összefoglaló készítése a felhasználónak
