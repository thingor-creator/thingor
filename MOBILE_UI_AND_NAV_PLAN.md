# Mobile UI & Navigation Improvements Plan (Thingor)

## 1. Pantry & Consumables: New Category Cancel Button Overflow Fix
- **Problem:** In mobile view, inside the Add New Pantry Item modal, when "+ Új kategória" (+ New category) is clicked, the text input, "Hozzáadás" (Add) button, and "Mégse" (Cancel) button are arranged in a horizontal row (`flex items-center gap-2`), causing the "Mégse" button text to overflow outside the modal screen on narrow devices.
- **Solution:** 
  - Restructure the adding-category block in `PantryView.tsx` with responsive layout (`flex flex-col sm:flex-row gap-2` or compact layout) so that inputs and action buttons fit cleanly without any horizontal overflow.
  - Ensure buttons have `whitespace-nowrap shrink-0` and proper padding.

## 2. Context-Aware Central "+" (FAB) Action Button in Mobile Bottom Nav
- **Problem:** Currently, the central floating "+" button in the mobile bottom navigation bar unconditionally opens the `ItemFormModal` (`setIsAddEditItemModalOpen(true)`). When the user is on other views (e.g. Pantry, Categories, Locations, Lending, Notes, Repairs, Financing, Collections), they expect the central "+" button to open the item/record creation panel relevant to that specific page.
- **Solution:**
  - Introduce an extensible action dispatcher in `AppContext` (or via view-specific registration) such that clicking the central "+" button executes the appropriate add action based on `currentView`:
    - `pantry` -> Opens Pantry item modal (`setIsModalOpen(true)`)
    - `locations` -> Opens Location modal (`setIsLocationModalOpen(true)`)
    - `categories` -> Opens Category modal (`setIsCategoryModalOpen(true)`)
    - `notes` -> Opens Quick Note modal
    - `repairs` -> Opens New Repair modal
    - `financing` -> Opens New Financing modal
    - `lending` -> Opens New Loan modal
    - `collections` -> Opens New Collection modal / Add item to collection
    - `vault` -> Opens Add to Vault modal (if unlocked) or unlocks PIN
    - `items`, `dashboard`, or default -> Opens Add Thing modal (`setIsAddEditItemModalOpen(true)`)
  - Update tooltip and accessibility labels dynamically to match the context action.

## 3. Intelligent "Back" Navigation
- **Problem:** When clicking in-app back buttons (e.g. in SettingsView, AdminView, StorageView, ItemDetailModal), it often hardcoded `setCurrentView('dashboard')` or cleared history directly, sending the user immediately back to the dashboard even if they came from another view (e.g. from Items, Pantry, or a specific category). Furthermore, `popstate` fallback in `AppContext` fell back to `'dashboard'`.
- **Solution:**
  - Track `previousView` in `AppContext` history stack or utilize `window.history.back()` / recorded previous view route.
  - In `SettingsView`, `AdminView`, and `ItemDetailModal`:
    - Change hardcoded `setCurrentView('dashboard')` to a smart go-back function: check if previous view exists in browser/app navigation history, and go back there; only fall back to `'dashboard'` if there is no previous history.
  - Fix `popstate` fallback in `AppContext` so that popping state respects the prior view history instead of unconditionally defaulting to dashboard.

## 4. Pantry & Consumables: KPI Tile Click-Throughs & Responsive Filter Tabs
- **Problem:**
  - On the Pantry & Consumables page, clicking on the 4 top KPI tiles ("Összes készletféle", "Fogyóban / Elfogyott", "Közelgő lejárati idő", "Bevásárlólista") does nothing.
  - The filter menu tab strip ("Összes tétel", "Fogyóban", "Lejáróban", "Bevásárlólista") requires horizontal scrolling / slider on mobile and is not prominent or clear enough.
- **Solution:**
  - Make all 4 KPI tiles interactive clickable cards with hover/tap animations (`cursor-pointer`, active ring indicator) that switch the view and filter:
    1. "Összes készletféle" tile -> Sets `activeTab = 'all'`, scrolls smoothly to items.
    2. "Fogyóban / Elfogyott" tile -> Sets `activeTab = 'low_stock'`, scrolls to items.
    3. "Közelgő lejárati idő" tile -> Sets `activeTab = 'expiring'`, scrolls to items.
    4. "Bevásárlólista" tile -> Opens the Auto Shopping List modal or sets `activeTab = 'shopping_list'`.
  - Redesign the tab bar on mobile:
    - Use a responsive segmented grid (`grid grid-cols-2 sm:flex sm:overflow-x-auto`) or an optimized scrollable pill list with visual gradient indicators so all tabs are readily visible and accessible without cumbersome sliding.

## 5. Verification & Testing
- Validate TypeScript compilation with `npm run build`.
- Inspect mobile layouts and responsive behaviors.
- Note: Standby before any production database migration or final live deployment per user instruction.
