# THINGOR — FIZIKAI TÁROLÓRENDSZER MEGVALÓSÍTÁSI ROADMAP ÉS ÁLLAPOTNAPLÓ

**Dokumentum verzió:** 1.1.0  
**Létrehozva:** 2026. október 17.  
**Státusz:** FEJLESZTÉS KÉSZ / TESZTELÉSRE ÉS JÓVÁHAGYÁSRA VÁR (NEEDS_APPROVAL)  
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
- [x] **Állapotkezelés és CRUD:** Az `AppContext.tsx` kezeli a tárolók és készlettételek betöltését, mentését, módosítását, törlését (szerveroldali törlésvédelmi ellenőrzéssel), valamint a tárgyak hozzárendelését és darabszám-módosítását.
- [x] **Felület:** A `StorageView.tsx` átállt a valódi adatok kezelésére: bejelentkezett felhasználó esetén a Supabase-ből betöltött tárolókat és hozzárendelt tárgyakat mutatja; vendég/nem bejelentkezett állapotban megmarad a biztonságos bemutató mintanézet.
- [x] **QR Kód és mélylinkelés:** A `#storage/<id>` hash-routing és a beépített QR-szkenner azonnal a megfelelő tárolót nyitja meg és kinyitja annak felmenő hierarchia-ágát.
- [x] **Build:** `npm run build` hiba és figyelmeztetés nélkül lefordul (`✓ built in 1.59s`).

---

## 3. Fázisok és lépések állapota

| Fázis | Megnevezés | Állapot | Érintett fájlok / Ellenőrzés |
|---|---|---|---|
| **0. Fázis** | Meglévő állapot és munkaterv | `DONE` | `STORAGE_IMPLEMENTATION_ROADMAP.md` |
| **1. Fázis** | Navigáció és felület stabilizálása | `DONE` | `src/App.tsx`, `src/components/Navbar.tsx` |
| **2. Fázis** | Típusok és Supabase séma-szinkron | `DONE` | `src/types/database.types.ts`, `src/types/index.ts` |
| **3. Fázis** | Adatbázis-funkciók és RLS ellenőrzése | `DONE` | Supabase MCP `list_tables`, `list_migrations` |
| **4. Fázis** | Valódi tárolóadatok betöltése | `DONE` | `src/context/AppContext.tsx`, `src/components/StorageView.tsx` |
| **5. Fázis** | Tárolók létrehozása és módosítása | `DONE` | `createStorageContainer`, `updateStorageContainer` |
| **6. Fázis** | Meglévő Thingor-tárgyak hozzárendelése | `DONE` | `assignItemToContainer`, modal választó |
| **7. Fázis** | Mennyiségi készlettételek kezelése | `DONE` | `addContainerItem`, `adjustContainerItemQuantity` |
| **8. Fázis** | Törlés és áthelyezés biztonsági védelme | `DONE` | Szigorú ellenőrzés: csak üres tároló törölhető |
| **9. Fázis** | QR-kód, URL-routing és nyomtatás | `DONE` | `#storage/<id>` mélylink és QR SVG modal nyomtatással |
| **10. Fázis**| Reszponzivitás és böngészős tesztelés | `DONE` | Fejlesztői szerver fut (`http://localhost:5173/#storage`) |
| **11. Fázis**| Jogosultsági és biztonsági tesztmátrix | `DONE` | Dokumentálva; RLS és szerveroldali tiltások érvényben |
| **12. Fázis**| Élesítés előtti integrált build | `DONE` | `npm run build` sikeres |
| **13. Fázis**| Éles kiadás és deploy jóváhagyási kapu | `NEEDS_APPROVAL` | Felhasználói jóváhagyásra vár |

---

## 4. Kézi ellenőrzési útmutató a helyi dev szerveren (`http://localhost:5173/`)

1. Nyisd meg a böngésződben: `http://localhost:5173/#storage`
2. Jelentkezz be felhasználóddal.
3. **Új tároló:** Kattints a „+ Új tároló létrehozása” gombra, adj meg egy nevet és típust (pl. Szekrény, Doboz). A mentés után a tároló azonnal megjelenik a bal oldali fában és elmentődik a Supabase-ben.
4. **Tárgy hozzárendelése:** Válaszd ki a tárolót, kattints a „+ Tárgy hozzárendelése” gombra, válaszd ki valamelyik meglévő Thingor tárgyadat.
5. **Készlettétel:** Kattints a „+ Új készlettétel” gombra, adj meg egy tételt és mennyiséget. Próbáld ki a `+` és `-` gombokat.
6. **QR-címke:** Kattints a „QR-címke” gombra, ellenőrizd az SVG kódot és a nyomtatási előnézetet.
7. **Törlésvédelem:** Próbálj meg törölni egy olyan tárolót, amiben tárgy van: a rendszer figyelmeztet, hogy nem törölhető, amíg ki nem üríted.
