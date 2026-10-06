export type Language = 'hu' | 'en';

export interface TranslationKeys {
  // Brand & General
  tagline: string;
  tagline_sub: string;
  start_organizing: string;
  see_how_it_works: string;
  
  // Navigation
  dashboard: string;
  my_things: string;
  locations: string;
  categories: string;
  documents: string;
  repairs: string;
  financing: string;
  household: string;
  admin_panel: string;
  add_thing: string;
  browse_things: string;
  add_location: string;
  sign_in: string;
  sign_up: string;
  log_out: string;
  language: string;

  // Dashboard Metrics
  total_items: string;
  total_value: string;
  storage_spots: string;
  warranty_expiring: string;
  active_warranties: string;
  recently_added: string;
  warranty_tracker: string;
  categories_summary: string;
  items_logged: string;

  // Item Form & Detail
  item_name: string;
  category: string;
  location: string;
  condition: string;
  purchase_date: string;
  purchase_price: string;
  current_value: string;
  store_seller: string;
  warranty_start: string;
  warranty_expiration: string;
  description: string;
  photo_url: string;
  notes: string;
  save_changes: string;
  create_thing: string;
  edit_thing: string;
  delete_thing: string;
  cancel: string;
  confirm_delete: string;
  
  // Statuses
  warranty_active: string;
  expiring_soon: string;
  warranty_expired: string;
  no_warranty: string;
  
  // Conditions
  cond_new: string;
  cond_excellent: string;
  cond_good: string;
  cond_fair: string;
  cond_poor: string;
  cond_broken: string;

  // Search & Filter
  search_placeholder: string;
  all_categories: string;
  all_locations: string;
  all_conditions: string;
  sort_by: string;
  clear_filters: string;
  no_items_found: string;
  no_items_yet: string;
  add_first_thing: string;
}

export const translations: Record<Language, TranslationKeys> = {
  hu: {
    tagline: 'A tárgyaid. Egy helyen.',
    tagline_sub: 'Tartsd nyilván a tulajdonodban lévő tárgyakat, hol vannak, mennyit érnek és mi tartozik hozzájuk.',
    start_organizing: 'Kezdd el a rendszerezést',
    see_how_it_works: 'Nézd meg, hogyan működik',
    
    dashboard: 'Vezérlőpult',
    my_things: 'Tárgyaim',
    locations: 'Helyszínek',
    categories: 'Kategóriák',
    documents: 'Dokumentumok',
    repairs: 'Javítások',
    financing: 'Finanszírozás',
    household: 'Család / Háztartás',
    admin_panel: 'Adminisztráció',
    add_thing: 'Tárgy hozzáadása',
    browse_things: 'Tárgyak böngészése',
    add_location: 'Helyszín hozzáadása',
    sign_in: 'Bejelentkezés',
    sign_up: 'Regisztráció',
    log_out: 'Kijelentkezés',
    language: 'Nyelv',

    total_items: 'Összes tárgy',
    total_value: 'Becsült összérték',
    storage_spots: 'tárolási hely',
    warranty_expiring: 'Garancia lejáróban',
    active_warranties: 'aktív garancia rögzítve',
    recently_added: 'Legutóbb hozzáadott tárgyak',
    warranty_tracker: 'Garancia állapot követő',
    categories_summary: 'Kategóriák áttekintése',
    items_logged: 'tárgy rögzítve',

    item_name: 'Tárgy neve',
    category: 'Kategória',
    location: 'Helyszín',
    condition: 'Állapot',
    purchase_date: 'Vásárlás dátuma',
    purchase_price: 'Vételár (€)',
    current_value: 'Jelenlegi érték (€)',
    store_seller: 'Üzlet / Eladó',
    warranty_start: 'Garancia kezdete',
    warranty_expiration: 'Garancia lejárata',
    description: 'Leírás',
    photo_url: 'Fénykép URL',
    notes: 'Megjegyzések és sorozatszámok',
    save_changes: 'Módosítások mentése',
    create_thing: 'Tárgy létrehozása',
    edit_thing: 'Tárgy szerkesztése',
    delete_thing: 'Tárgy törlése',
    cancel: 'Mégse',
    confirm_delete: 'Törlés megerősítése',

    warranty_active: 'Garancia aktív',
    expiring_soon: 'Hamarosan lejár',
    warranty_expired: 'Garancia lejárt',
    no_warranty: 'Nincs garancia megadva',

    cond_new: 'Új',
    cond_excellent: 'Kitűnő',
    cond_good: 'Jó',
    cond_fair: 'Elfogadható',
    cond_poor: 'Gyenge',
    cond_broken: 'Tönkrement / Hibás',

    search_placeholder: 'Keresés név, leírás, kategória vagy helyszín alapján (pl. makita, műhely)...',
    all_categories: 'Összes kategória',
    all_locations: 'Összes helyszín',
    all_conditions: 'Összes állapot',
    sort_by: 'Rendezés',
    clear_filters: 'Szűrők törlése',
    no_items_found: 'Nincs a feltételeknek megfelelő tárgy',
    no_items_yet: 'Még nincsenek rögzített tárgyaid.',
    add_first_thing: 'Hozzáadás az első tárgyadhoz',
  },
  en: {
    tagline: 'Your things. One place.',
    tagline_sub: "Keep track of what you own, where it is, what it's worth, and everything that belongs to it.",
    start_organizing: 'Start organizing',
    see_how_it_works: 'See how it works',
    
    dashboard: 'Dashboard',
    my_things: 'My Things',
    locations: 'Locations',
    categories: 'Categories',
    documents: 'Documents',
    repairs: 'Repairs',
    financing: 'Financing',
    household: 'Household & Family',
    admin_panel: 'Admin Panel',
    add_thing: 'Add Thing',
    browse_things: 'Browse things',
    add_location: 'Add location',
    sign_in: 'Sign in',
    sign_up: 'Start organizing',
    log_out: 'Log out',
    language: 'Language',

    total_items: 'Total Items',
    total_value: 'Estimated Value',
    storage_spots: 'storage spots',
    warranty_expiring: 'Warranty Expiring',
    active_warranties: 'active warranties registered',
    recently_added: 'Recently Added Things',
    warranty_tracker: 'Warranty Status Tracker',
    categories_summary: 'Categories Summary',
    items_logged: 'items logged',

    item_name: 'Item Name',
    category: 'Category',
    location: 'Location',
    condition: 'Condition',
    purchase_date: 'Purchase Date',
    purchase_price: 'Purchase Price (€)',
    current_value: 'Current Value (€)',
    store_seller: 'Store / Seller',
    warranty_start: 'Warranty Start',
    warranty_expiration: 'Warranty Expiration',
    description: 'Description',
    photo_url: 'Photo URL',
    notes: 'Notes & Serial Numbers',
    save_changes: 'Save Changes',
    create_thing: 'Create Thing',
    edit_thing: 'Edit Thing',
    delete_thing: 'Delete Thing',
    cancel: 'Cancel',
    confirm_delete: 'Confirm Delete',

    warranty_active: 'Warranty Active',
    expiring_soon: 'Expiring Soon',
    warranty_expired: 'Warranty Expired',
    no_warranty: 'No warranty set',

    cond_new: 'New',
    cond_excellent: 'Excellent',
    cond_good: 'Good',
    cond_fair: 'Fair',
    cond_poor: 'Poor',
    cond_broken: 'Broken',

    search_placeholder: 'Search by name, description, category, or location (e.g. makita, workshop)...',
    all_categories: 'All Categories',
    all_locations: 'All Locations',
    all_conditions: 'All Conditions',
    sort_by: 'Sort By',
    clear_filters: 'Clear filters',
    no_items_found: 'No items found matching criteria',
    no_items_yet: "You don't have any things yet.",
    add_first_thing: '+ Add your first thing',
  }
};
