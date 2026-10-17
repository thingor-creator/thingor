export interface ColorTheme {
  id: string;
  nameHu: string;
  nameEn: string;
  descHu: string;
  descEn: string;
  bgMain: string;
  cardBg: string;
  surfaceBg: string;
  borderColor: string;
  textMain: string;
  textSub: string;
  defaultAccent: string;
  isLight?: boolean;
}

export interface AccentColorOption {
  id: string;
  hex: string;
  labelHu: string;
  labelEn: string;
}

export const THEMES: ColorTheme[] = [
  {
    id: 'slate',
    nameHu: 'Sötét pala (Alapértelmezett)',
    nameEn: 'Dark Slate (Default)',
    descHu: 'Klasszikus Thingor szürke-kék felület, kiegyensúlyozott kontraszt',
    descEn: 'Classic Thingor slate grey aesthetic with balanced contrast',
    bgMain: '#303943',
    cardBg: '#3A4551',
    surfaceBg: '#465362',
    borderColor: '#56616D',
    textMain: '#E0E3E6',
    textSub: '#B5BDC6',
    defaultAccent: '#2563EB',
  },
  {
    id: 'ocean',
    nameHu: 'Éjféli óceán',
    nameEn: 'Midnight Ocean',
    descHu: 'Mélytengeri sötétkék és vibráló ciánkék ragyogás',
    descEn: 'Deep marine navy with electric cyan highlights',
    bgMain: '#0B132B',
    cardBg: '#1C2541',
    surfaceBg: '#27385E',
    borderColor: '#3A4F7C',
    textMain: '#E2E8F0',
    textSub: '#94A3B8',
    defaultAccent: '#06B6D4',
  },
  {
    id: 'emerald',
    nameHu: 'Smaragd erdő',
    nameEn: 'Emerald Forest',
    descHu: 'Természetes mély mohazöld és üde smaragdzöld elemek',
    descEn: 'Soothing organic forest green with vivid emerald touches',
    bgMain: '#0D1F1A',
    cardBg: '#16332B',
    surfaceBg: '#1F473C',
    borderColor: '#2F6656',
    textMain: '#E6F4EA',
    textSub: '#A3C9B8',
    defaultAccent: '#10B981',
  },
  {
    id: 'amethyst',
    nameHu: 'Királyi bíbor',
    nameEn: 'Royal Amethyst',
    descHu: 'Misztikus mélylila tónusok ragyogó neon ibolyával',
    descEn: 'Mystic deep violet shades with glowing neon purple accents',
    bgMain: '#171026',
    cardBg: '#251A3E',
    surfaceBg: '#362657',
    borderColor: '#4E377D',
    textMain: '#F1E8FC',
    textSub: '#BAA7D8',
    defaultAccent: '#A855F7',
  },
  {
    id: 'carbon',
    nameHu: 'Karbon fekete',
    nameEn: 'Carbon Onyx',
    descHu: 'OLED-mély fekete háttér tüzes karmazsinvörössel',
    descEn: 'Deep OLED pitch black with fiery crimson red highlights',
    bgMain: '#121316',
    cardBg: '#1C1E24',
    surfaceBg: '#272A33',
    borderColor: '#3D4250',
    textMain: '#F3F4F6',
    textSub: '#9CA3AF',
    defaultAccent: '#F43F5E',
  },
  {
    id: 'nordic',
    nameHu: 'Északi acél',
    nameEn: 'Nordic Steel',
    descHu: 'Hűvös skandináv acélszürke és elegáns indigókék',
    descEn: 'Cool Scandinavian steel grey with elegant indigo blue',
    bgMain: '#182026',
    cardBg: '#232D36',
    surfaceBg: '#303D49',
    borderColor: '#425363',
    textMain: '#E5EDF4',
    textSub: '#9EB1C2',
    defaultAccent: '#6366F1',
  },
  {
    id: 'amber',
    nameHu: 'Borostyán & Mokka',
    nameEn: 'Warm Amber & Mocha',
    descHu: 'Meleg pörkölt kávébarna és aranyló borostyán fények',
    descEn: 'Cozy roasted espresso mocha with golden amber accents',
    bgMain: '#1C1815',
    cardBg: '#29231E',
    surfaceBg: '#3B322B',
    borderColor: '#54473E',
    textMain: '#FDF6E9',
    textSub: '#C7B7A6',
    defaultAccent: '#F59E0B',
  },
  {
    id: 'light',
    nameHu: 'Tiszta világos',
    nameEn: 'Clean Crisp Light',
    descHu: 'Modern világos téma kényelmes nappali olvashatósághoz',
    descEn: 'Modern high-clarity light mode for daytime productivity',
    bgMain: '#F1F5F9',
    cardBg: '#FFFFFF',
    surfaceBg: '#E2E8F0',
    borderColor: '#CBD5E1',
    textMain: '#0F172A',
    textSub: '#475569',
    defaultAccent: '#2563EB',
    isLight: true,
  },
];

export const ACCENT_COLORS: AccentColorOption[] = [
  { id: 'blue', hex: '#2563EB', labelHu: 'Királykék', labelEn: 'Royal Blue' },
  { id: 'cyan', hex: '#06B6D4', labelHu: 'Ciánkék', labelEn: 'Cyan Glow' },
  { id: 'emerald', hex: '#10B981', labelHu: 'Smaragdzöld', labelEn: 'Emerald Green' },
  { id: 'amber', hex: '#F59E0B', labelHu: 'Borostyán arany', labelEn: 'Amber Gold' },
  { id: 'purple', hex: '#A855F7', labelHu: 'Neon lila', labelEn: 'Neon Violet' },
  { id: 'rose', hex: '#F43F5E', labelHu: 'Karmazsin rózsa', labelEn: 'Crimson Rose' },
  { id: 'indigo', hex: '#6366F1', labelHu: 'Indigó', labelEn: 'Indigo' },
  { id: 'orange', hex: '#F97316', labelHu: 'Élénk narancs', labelEn: 'Vibrant Orange' },
];

/**
 * Dynamically applies the chosen theme and optional custom accent color to CSS root variables
 */
export function applyTheme(themeId?: string, customAccent?: string) {
  if (typeof document === 'undefined') return;

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const accent = customAccent || theme.defaultAccent;
  const root = document.documentElement;

  // Background and Surfaces
  root.style.setProperty('--bg-main', theme.bgMain);
  root.style.setProperty('--color-bg-main', theme.bgMain);

  root.style.setProperty('--card-bg', theme.cardBg);
  root.style.setProperty('--color-card', theme.cardBg);

  root.style.setProperty('--surface-bg', theme.surfaceBg);
  root.style.setProperty('--color-surface', theme.surfaceBg);

  root.style.setProperty('--border-color', theme.borderColor);
  root.style.setProperty('--color-border-main', theme.borderColor);

  // Text Tokens
  root.style.setProperty('--text-main', theme.textMain);
  root.style.setProperty('--color-text-main', theme.textMain);
  root.style.setProperty('--text-primary', theme.textMain);

  root.style.setProperty('--text-sub', theme.textSub);
  root.style.setProperty('--color-text-sub', theme.textSub);
  root.style.setProperty('--text-secondary', theme.textSub);

  // Primary Accent Color
  root.style.setProperty('--primary-blue', accent);
  root.style.setProperty('--color-primary-blue', accent);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-bg', `${accent}26`); // ~15% opacity hex
  root.style.setProperty('--accent-border', accent);

  // Attribute and Class switches for edge-case selectors
  root.setAttribute('data-theme', theme.id);
  if (theme.isLight) {
    root.classList.add('light-mode');
  } else {
    root.classList.remove('light-mode');
  }
}
