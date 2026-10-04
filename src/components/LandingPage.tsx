import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  FileText,
  Wrench,
  Laptop,
  Bike,
  BookOpen,
  Car,
  Sparkles,
  CheckCircle2,
  Layers,
  FolderTree
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { setCurrentView, setIsAuthModalOpen, setAuthModalMode, isAuthenticated, t, language, setActiveLegalSlug } = useApp();

  useEffect(() => {
    document.title = language === 'hu' ? 'Thingor – Rendszerezd az összes tárgyadat' : 'Thingor – Organize Everything You Own';
  }, [language]);

  const handleStartOrganizing = () => {
    if (isAuthenticated) {
      setCurrentView('dashboard');
    } else {
      setAuthModalMode('signup');
      setIsAuthModalOpen(true);
    }
  };

  const handleSeeHowItWorks = () => {
    if (isAuthenticated) {
      setCurrentView('items');
    } else {
      const demoElement = document.getElementById('how-it-works');
      if (demoElement) {
        demoElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HERO SECTION */}
      <section className="relative pt-8 pb-16 md:pt-12 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: Primary Text & Main CTA (7 cols on lg) */}
          <div className="lg:col-span-7 text-center lg:text-left">
            
            {/* Hero badge (Eyebrow) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-slate-800 bg-slate-900/90 text-emerald-400 text-xs font-semibold tracking-wide shadow-inner mb-3 sm:mb-4">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>{language === 'hu' ? 'SZEMÉLYES TÁRGYNYILVÁNTARTÓ PLATFORM' : 'PERSONAL INVENTORY PLATFORM'}</span>
            </div>

            {/* Logo Image */}
            <div className="mb-4 sm:mb-5">
              <img
                src="/logo.png"
                alt="Thingor Logo"
                className="h-22 sm:h-28 md:h-36 lg:h-40 w-auto object-contain mx-auto lg:mx-0 drop-shadow-[0_18px_36px_rgba(16,185,129,0.28)] filter brightness-105 transition-all"
              />
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              {t('tagline')}
            </h1>

            {/* Short explanation */}
            <p className="mt-3.5 sm:mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              {t('tagline_sub')}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 sm:gap-4">
              <button
                onClick={handleStartOrganizing}
                className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-950/60 hover:shadow-emerald-900/60 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2 group ring-2 ring-emerald-400/30"
              >
                <span>{t('start_organizing')}</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5] group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={handleSeeHowItWorks}
                className="w-full sm:w-auto px-6 py-3.5 sm:py-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                {t('see_how_it_works')}
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{language === 'hu' ? 'Azonnali használat' : 'Instant Setup'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>{language === 'hu' ? 'Biztonságos adattárolás' : 'Secure Data Storage'}</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: De-cluttered, compact dashboard preview (5 cols on lg) */}
          <div className="lg:col-span-5 relative mx-auto w-full max-w-lg lg:max-w-none">
            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/80 p-4 sm:p-5 shadow-2xl shadow-emerald-950/30 backdrop-blur-md">
              
              {/* Mockup Topbar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-[11px] font-mono text-slate-400">thingor.app/dashboard</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-semibold">
                  128 {language === 'hu' ? 'tárgy' : 'Items'}
                </span>
              </div>

              {/* 2 Clean Item Cards */}
              <div className="space-y-3 text-left">
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Makita DHP486 Ütvefúró</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-medium">{language === 'hu' ? 'Jó állapot' : 'Good'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{language === 'hu' ? 'Helyszín' : 'Location'}: Otthon → Garázs → Műhely</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>{language === 'hu' ? 'Érték' : 'Value'}: <strong className="text-emerald-400 font-semibold">€180</strong></span>
                    <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> {language === 'hu' ? 'Garancia 2028-ig' : 'Warranty 2028'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">MacBook Pro 16"</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 font-medium">{language === 'hu' ? 'Kitűnő' : 'Excellent'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{language === 'hu' ? 'Helyszín' : 'Location'}: Otthon → Dolgozó → Íróasztal</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span>{language === 'hu' ? 'Érték' : 'Value'}: <strong className="text-emerald-400 font-semibold">€3,200</strong></span>
                    <span className="text-emerald-400 flex items-center gap-1"><FileText className="h-3 w-3" /> {language === 'hu' ? '2 dokumentum' : '2 Docs'}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 1: EVERY ITEM IN ONE PLACE (Categories Grid) */}
      <section id="how-it-works" className="py-20 bg-slate-900/50 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
              {language === 'hu' ? 'SOKOLDALÚ LELTÁR' : 'VERSATILE INVENTORY'}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Minden tárgyad egy helyen
            </h3>
            <p className="mt-4 text-slate-400 text-base sm:text-lg leading-relaxed">
              {language === 'hu'
                ? 'Legyen szó a műhelyben lévő szerszámokról, az íróasztalon lévő elektronikáról vagy a raktárban tárolt értékes berendezésekről, a Thingor mindent zökkenőmentesen kezel.'
                : "Whether it's power tools in the workshop, electronics on your desk, or high-value equipment in storage, Thingor handles everything seamlessly."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { icon: Wrench, label: language === 'hu' ? 'Szerszámok & Gépek' : 'Tools & Equipment', desc: language === 'hu' ? 'Fúrók, fűrészek, kéziszerszámok' : 'Drills, saws, hand tools' },
              { icon: Laptop, label: language === 'hu' ? 'Elektronika' : 'Electronics', desc: language === 'hu' ? 'Laptopok, telefonok, kamerák' : 'Laptops, phones, cameras' },
              { icon: Bike, label: language === 'hu' ? 'Sport & Kerékpárok' : 'Sports & Bicycles', desc: language === 'hu' ? 'Biciklik, edzőgépek, sílécek' : 'Bikes, fitness gear, skis' },
              { icon: Car, label: language === 'hu' ? 'Járművek & Alkatrészek' : 'Vehicles & Parts', desc: language === 'hu' ? 'Autók, motorok, alkatrészek' : 'Cars, bikes, spare parts' },
              { icon: BookOpen, label: language === 'hu' ? 'Könyvek & Gyűjtemények' : 'Books & Media', desc: language === 'hu' ? 'Könyvtárak, gyűjtemények' : 'Libraries, collections' },
            ].map((cat, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-950/80 hover:border-slate-700 transition-all hover:-translate-y-1 group"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <cat.icon className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-white text-sm">{cat.label}</h4>
                <p className="text-xs text-slate-400 mt-1">{cat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: MORE THAN A LIST (Left: Text + Checklist, Right: Rich Card) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-semibold mb-4">
              <Layers className="h-3.5 w-3.5" />
              <span>{language === 'hu' ? 'RÉSZLETES ADATOK' : 'RICH ITEM METADATA'}</span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Több mint egy lista
            </h3>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              {language === 'hu'
                ? 'A Thingor a legegyszerűbb tárgyneveket is teljes körű digitális nyilvántartássá alakítja. Tartsd számon az összes vagyontárgyad élettartamát.'
                : "Thingor turns plain item names into a comprehensive digital ledger. Keep complete record of every asset's lifecycle."}
            </p>

            <div className="mt-8 space-y-4">
              {[
                language === 'hu' ? 'Fotók és vizuális galéria' : 'Photos & visual inspection gallery',
                language === 'hu' ? 'Pontos vásárlási dátum, ár és eladó adatai' : 'Exact purchase date, price & seller details',
                language === 'hu' ? 'Becsült piaci érték és állapot megadása' : 'Current estimated market value & condition rating',
                language === 'hu' ? 'Pontos hierarchikus helyszín útvonal' : 'Exact hierarchical location path',
                language === 'hu' ? 'Garancia kezdete, lejárati értesítések' : 'Warranty start, expiration tracking & alerts',
                language === 'hu' ? 'Számlák, használati útmutatók és garanciajegyek' : 'Invoices, user manuals & warranty certificates',
                language === 'hu' ? 'Karbantartási és sorozatszám megjegyzések' : 'Maintenance and serial number notes'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-slate-200 text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{language === 'hu' ? 'Tárgy neve' : 'Item Name'}</p>
                <p className="text-sm font-bold text-white">DeWalt DWE7492 Asztali körfűrész</p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-950 text-amber-300 border border-amber-800/60">{language === 'hu' ? 'Elfogadható állapot' : 'Fair Condition'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <p className="text-[11px] text-slate-400">{language === 'hu' ? 'Vételár' : 'Purchase Price'}</p>
                <p className="text-sm font-semibold text-emerald-400">€720.00</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <p className="text-[11px] text-slate-400">{language === 'hu' ? 'Jelenlegi érték' : 'Current Value'}</p>
                <p className="text-sm font-semibold text-white">€580.00</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">Otthon → Garázs → Műhely</span>
              </div>
              <span className="text-[11px] text-slate-400">1. szekrény</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: KNOW WHERE IT IS (LOCATION HIERARCHY - Centered Tree) */}
      <section className="py-20 bg-slate-900/40 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            {language === 'hu' ? 'HELYSZÍN FA STRUKTÚRA' : 'LOCATION TREE'}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Tudd, hol van
          </h3>
          <p className="mt-4 text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            {language === 'hu'
              ? 'Soha többé ne pazarolj időt fiókok vagy dobozok keresgélésére. Rendszerezd a tárgyaidat több szintű hierarchikus struktúrába.'
              : 'Never waste time searching drawers or boxes again. Organize your items into multi-level hierarchical structures.'}
          </p>

          <div className="mt-12 max-w-3xl mx-auto p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-950 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 pb-4 border-b border-slate-800">
              <FolderTree className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-white">{language === 'hu' ? 'Hierarchikus Helyszín Példa' : 'Hierarchical Location Example'}</span>
            </div>

            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">{language === 'hu' ? 'Otthon' : 'Home'}</span>
              </div>
              <div className="pl-6 border-l border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-slate-600">└─</span>
                  <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">{language === 'hu' ? 'Garázs' : 'Garage'}</span>
                </div>
                <div className="pl-6 border-l border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-600">└─</span>
                    <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-semibold">{language === 'hu' ? 'Műhely' : 'Workshop'}</span>
                  </div>
                  <div className="pl-6 border-l border-slate-800">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                      <span className="flex items-center gap-2 font-sans font-medium text-xs">
                        <span className="font-mono text-slate-500">└─</span> {language === 'hu' ? 'Szerszámos szekrény' : 'Tool cabinet'}
                      </span>
                      <span className="text-[11px] font-sans text-emerald-400 font-semibold">{language === 'hu' ? '14 tárgy tárolva itt' : '14 items stored here'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: DOCUMENTS & WARRANTY (Alternating Layout: Left Cards, Right Text) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Cards */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="p-3 rounded-lg bg-emerald-950 text-emerald-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Szamla_Makita_DHP486.pdf</h4>
                <p className="text-xs text-slate-400">{language === 'hu' ? 'Vásárlási bizonylat' : 'Proof of purchase'} • 420 KB</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-800/50 bg-emerald-950/20 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-900/60 text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">{language === 'hu' ? 'Garanciajegy' : 'Warranty Certificate'}</h4>
                <p className="text-xs text-emerald-400">{language === 'hu' ? 'Érvényes: 2028. március 12-ig' : 'Valid until 12 March 2028'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 flex items-center gap-4 hover:border-slate-700 transition-colors">
              <div className="p-3 rounded-lg bg-slate-800 text-slate-300">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Hasznalati_Utmutato.pdf</h4>
                <p className="text-xs text-slate-400">{language === 'hu' ? 'Hivatalos útmutató' : 'Official instruction manual'} • 2.5 MB</p>
              </div>
            </div>
          </div>

          {/* Right Text */}
          <div>
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
              {language === 'hu' ? 'MINDEN EGY HELYEN' : 'ALL IN ONE PLACE'}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Dokumentumok és garancia
            </h3>
            <p className="mt-4 text-slate-300 text-base leading-relaxed">
              {language === 'hu'
                ? 'Soha ne keresgélj e-mailekben vagy papírfiókokban, ha egy tárgy meghibásodik. Csatolj számlákat, útmutatókat, tanúsítványokat és garanciajegyeket közvetlenül a tárgyakhoz.'
                : 'Never search through emails or paper drawers when an item breaks. Attach invoices, user manuals, certificates, and warranty papers directly to each item.'}
            </p>
          </div>

        </div>
      </section>

      {/* SECTION 5: FUTURE-READY ARCHITECTURE PREVIEW */}
      <section className="py-20 bg-slate-900/60 border-t border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">
            {language === 'hu' ? 'ARCHITEKTÚRA' : 'FUTURE-READY ARCHITECTURE'}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Folyamatosan bővülő platform
          </h3>
          <p className="mt-4 text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            {language === 'hu'
              ? 'A Thingor egy olyan skálázható architektúrára épül, amely fel van készítve a jövőbeli funkciók fogadására:'
              : 'Thingor is built on an extensible architectural foundation designed to support upcoming advanced features:'}
          </p>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-left">
            {[
              { label: language === 'hu' ? 'Karbantartási emlékeztetők' : 'Maintenance Reminders', desc: language === 'hu' ? 'Időzített szerviz értesítések' : 'Scheduled service notifications' },
              { label: language === 'hu' ? 'Kölcsönadás kezelés' : 'Lending & Borrowing', desc: language === 'hu' ? 'Kövesd kihez került a tárgyad' : 'Track who has your items' },
              { label: language === 'hu' ? 'Értékváltozás követés' : 'Value Tracking', desc: language === 'hu' ? 'Amortizáció és piaci értékelés' : 'Depreciation & market evaluation' },
              { label: language === 'hu' ? 'Biztosítási dokumentáció' : 'Insurance Export', desc: language === 'hu' ? 'Azonnali kárrendezési export' : 'Instant claims documentation' },
              { label: language === 'hu' ? 'QR-kódos azonosítás' : 'QR Code Tags', desc: language === 'hu' ? 'Fizikai tárgycímke beolvasás' : 'Physical asset tag scanning' },
              { label: language === 'hu' ? 'Import / Export' : 'Data Import / Export', desc: language === 'hu' ? 'CSV & JSON hordozhatóság' : 'CSV & JSON full portability' },
            ].map((f, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/70">
                <span className="text-xs font-semibold text-emerald-400 block mb-1">{language === 'hu' ? 'Hamarosan' : 'Coming Soon'}</span>
                <h4 className="text-sm font-semibold text-white">{f.label}</h4>
                <p className="text-[11px] text-slate-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer className="py-16 bg-slate-950 border-t border-slate-800 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Thingor Logo" className="h-12 sm:h-14 w-auto object-contain" />
            <div>
              <span className="block text-xs text-slate-400">{t('tagline')}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => { setActiveLegalSlug('privacy'); setCurrentView('legal'); }}
              className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
            >
              Adatvédelem
            </button>
            <span>•</span>
            <button
              onClick={() => { setActiveLegalSlug('terms'); setCurrentView('legal'); }}
              className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
            >
              Felhasználási Feltételek
            </button>
            <span>•</span>
            <button
              onClick={() => { setActiveLegalSlug('cookies'); setCurrentView('legal'); }}
              className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
            >
              Cookie Tájékoztató
            </button>
            <span>•</span>
            <button
              onClick={() => { setActiveLegalSlug('imprint'); setCurrentView('legal'); }}
              className="text-slate-400 hover:text-emerald-400 font-medium transition-colors"
            >
              Impresszum
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center md:text-right">
            © {new Date().getFullYear()} Thingor. Personal Inventory & Organizer Platform. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
};
