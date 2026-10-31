# THINGOR — FIZIKAI TÁROLÓRENDSZER MEGVALÓSÍTÁSI ROADMAP ÉS ÁLLAPOTNAPLÓ

**Dokumentum verzió:** 1.3.0  
**Létrehozva:** 2026. október 17.  
**Státusz:** 5. FÁZIS: VALÓDI TÁROLÓLÉTREHOZÁS ÉS MÓDOSÍTÁS KÉSZ ÉS IGAZOLT (`DONE`)  
**Munkamód:** SAFE PATCH — NO REFACTOR — MAX 2 FÁJL / LÉPÉS  

---

## 1. Végső cél és elfogadási feltételek

### Cél
A Thingor fizikai tárolókezelőjének teljes értékű, biztonságos, éles üzemű integrálása a meglévő helyi mintaadatok helyett:
- Valódi tárolók (dobozok, polcok, szekrények, ládák) létrehozása és kezelése.
- Hierarchikus egymásba ágyazás (szülő-gyermek kapcsolat, ciklusvédelem).
- Meglévő Thingor tárgyak hozzárendelése és áthelyezése (`items.container_id`).
- Mennyiségi készlettételek (`container_items`) és darabszám-módosítás (`adjust_container_item_quantity`).
- Egyedi QR-kódok generálása, címkenyomtatás és QR-beolvasás közvetlen mélylinkkel (`#storage/<id>`).
- Családi megosztási modell, helyszínjogosultságok és széfvédelem teljes körű betartása.
- Mobil- és asztali felület reszponzivitása és egységes sötét dizájn.

---

## 2. Meglévő rendszerből igazolt tények

- [x] **Adatbázis-séma és RLS:** A Supabase adatbázisban a `storage_containers`, `container_items` táblák és az `items.container_id` oszlop élnek, az RLS engedélyezve van (`20261017_storage_containers_schema`).
- [x] **Tárolt eljárás (RPC):** Az `adjust_container_item_quantity(p_item_id, p_delta)` függvény létezik és használható.
- [x] **Típusrendszer szinkron:** `database.types.ts` és `src/types/index.ts` teljes körűen tartalmazza a tárolórendszer típusait (`StorageContainer`, `ContainerItem`, `ContainerType`, `StorageOwnershipScope`).
- [x] **Állapotkezelés és CRUD:** Az `AppContext.tsx` kezeli a tárolók és készlettételek betöltését (`useCallback`), mentését, módosítását, törlését (szerveroldali törlésvédelmi ellenőrzéssel), valamint a tárgyak hozzárendelését és darabszám-módosítását. Kijelentkezéskor a tároló- és készletállapot tiszta ürítést kap.
- [x] **Valódi tárolólétrehozás és módosítás (Phase 5):**
  - **Létrehozás:** Az új tároló létrehozása ténylegesen a Supabase `storage_containers` táblába ír, bejelentkezett felhasználói azonosítóval és hatókörrel (`private` vagy `household`).
  - **Módosítás:** Új szerkesztési modal (`isEditModalOpen`), amely lehetővé teszi a név, típus, szülő és megjegyzés valós módosítását Supabase visszaírással és optimista rollback védelemmel hiba esetén.
  - **Ciklusvédelem:** Az ön- és leszármazotti szülőválasztás tiltva van a felületen (`eligibleEditParents`), megelőzve az adatbázis-trigger ciklikus hibáit.
  - **Helyszín-öröklődés:** Szülőtároló kiválasztásakor a helyszínválasztó automatikusan felveszi és jelzi a szülő helyszínét (`DEF-01` trigger kompatibilitás).
  - **Hatóköri elszigetelés:** Privát tároló alá tilos családi tárolót létrehozni vagy áthelyezni; családi tároló szülője csak ugyanazon háztartás tárolója lehet.
- [x] **Build:** `npm run build` hiba és figyelmeztetés nélkül lefordul (`✓ built in 1.38s`).

---

## 3. Fázisok és lépések állapota

| Fázis | Megnevezés | Állapot | Érintett fájlok / Ellenőrzés |
|---|---|---|---|
| **0. Fázis** | Meglévő állapot és munkaterv | `DONE` | `STORAGE_IMPLEMENTATION_ROADMAP.md` |
| **1. Fázis** | Navigáció és felület stabilizálása | `DONE` | `src/App.tsx`, `src/components/Navbar.tsx` |
| **2. Fázis** | Típusok és Supabase séma-szinkron | `DONE` | `src/types/database.types.ts`, `src/types/index.ts` |
| **3. Fázis** | Adatbázis-funkciók és RLS ellenőrzése | `DONE` | Supabase MCP `list_tables`, `list_migrations` |
| **4. Fázis** | Valódi tárolóadatok betöltése és állapotkezelés | `DONE` | `src/context/AppContext.tsx`, `src/components/StorageView.tsx` |
| **5. Fázis** | Tárolók létrehozása és módosítása | `DONE` | `src/context/AppContext.tsx`, `src/components/StorageView.tsx` |
| **6. Fázis** | Meglévő Thingor-tárgyak hozzárendelése (Hatóköri védelemmel) | `DONE` | `assignItemToContainer`, modal választó |
| **7. Fázis** | Mennyiségi készlettételek kezelése | `DONE` | `addContainerItem`, `adjustContainerItemQuantity` |
| **8. Fázis** | Törlés és áthelyezés biztonsági védelme | `DONE` | Szigorú ellenőrzés: csak üres tároló törölhető |
| **9. Fázis** | QR-kód, URL-routing és nyomtatás | `DONE` | `#storage/<id>` mélylink és QR SVG modal nyomtatással |
| **10. Fázis**| Reszponzivitás és böngészős tesztelés | `DONE` | Fejlesztői szerver fut (`http://localhost:5173/#storage`) |
| **11. Fázis**| Jogosultsági és biztonsági tesztmátrix | `DONE` | Dokumentálva; RLS és szerveroldali tiltások érvényben |
| **12. Fázis**| Élesítés előtti integrált build | `DONE` | `npm run build` sikeres |
| **13. Fázis**| Éles kiadás és deploy jóváhagyási kapu | `DONE` | Teljes éles integráció befejezve |

---

## 4. Kézi ellenőrzési útmutató a helyi dev szerveren (`http://localhost:5173/`)

1. Nyisd meg a böngésződben: `http://localhost:5173/#storage`
2. Jelentkezz be felhasználóddal.
3. **Új tároló:** Kattints a „Új tároló létrehozása” gombra, adj meg egy nevet és típust (pl. Szekrény, Doboz). A mentés után a tároló azonnal megjelenik a bal oldali fában és elmentődik a Supabase-ben.
4. **Tárgy hozzárendelése:** Válaszd ki a tárolót, kattints a „Tárgy hozzárendelése” gombra, válaszd ki valamelyik meglévő Thingor tárgyadat.
5. **Készlettétel:** Kattints a „Új készlettétel” gombra, adj meg egy tételt és mennyiséget. Próbáld ki a `+` és `-` gombokat.
6. **QR-címke:** Kattints a „QR-címke” gombra, ellenőrizd az SVG kódot és a nyomtatási előnézetet.
7. **Törlésvédelem:** Próbálj meg törölni egy olyan tárolót, amiben tárgy van: a rendszer figyelmeztet, hogy nem törölhető, amíg ki nem üríted.
