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
  CheckCircle2,
  Layers,
  FolderTree,
  Search,
  Tag
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const {
    setCurrentView,
    setIsAuthModalOpen,
    setAuthModalMode,
    isAuthenticated,
    t,
    language,
    setActiveLegalSlug
  } = useApp();

  const isHu = language === 'hu';

  useEffect(() => {
    document.title = isHu
      ? 'Thingor – Rendszerezd az összes tárgyadat'
      : 'Thingor – Organize Everything You Own';
  }, [isHu]);

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
    <div className="min-h-screen bg-[#242C35] text-[#E2E8F0] flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">

      {/* 1. HERO SECTION */}
      <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Subtle ambient lighting */}
        <div className="absolute top-12 left-1/4 -translate-x-1/2 w-[520px] h-[340px] bg-blue-500/[0.04] blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-24 right-1/4 w-[420px] h-[300px] bg-sky-500/[0.03] blur-[130px] rounded-full pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Headline, Story & Call-to-actions (6 cols on lg) */}
          <div className="lg:col-span-6 text-center lg:text-left">
            

            {/* Large Brand Wordmark with App Icon */}
            <div className="flex items-center justify-center lg:justify-start gap-3.5 sm:gap-4 mb-3 sm:mb-4">
              <img
                src="/app-icon.png"
                alt="Thingor"
                className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-2xl shadow-xl shadow-blue-950/40 object-cover shrink-0"
              />
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#F1F5F9] leading-none">
                Thingor
              </h1>
            </div>

            {/* Tagline in smaller font below Thingor */}
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#E2E8F0] leading-snug">
              {isHu ? (
                <>
                  A tárgyaid.{' '}
                  <span className="text-blue-400">Egy helyen.</span>
                </>
              ) : (
                <>
                  All your things.{' '}
                  <span className="text-blue-400">In one place.</span>
                </>
              )}
            </p>

            {/* Concise Value Description */}
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#94A3B8] max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              {isHu
                ? 'Tartsd nyilván egyetlen letisztult felületen a vagyontárgyaidat, azok pontos helyét, valós értékét, hivatalos dokumentumait és lejáró garanciáit.'
                : 'Keep all your belongings, exact storage locations, market values, receipts, and expiring warranties organized in one secure place.'}
            </p>

            {/* Harmonized CTAs */}
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 sm:gap-4">
              <button
                onClick={handleStartOrganizing}
                className="w-full sm:w-auto h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-950/40 hover:shadow-blue-900/50 transition-all flex items-center justify-center gap-2 group shrink-0"
              >
                <span>{t('start_organizing')}</span>
                <ArrowRight className="h-4.5 w-4.5 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
              
              <button
                onClick={handleSeeHowItWorks}
                className="w-full sm:w-auto h-12 px-6 rounded-xl border border-[#445262] bg-[#2D3743] hover:bg-[#35414F] text-[#E2E8F0] font-semibold text-sm transition-all flex items-center justify-center gap-2 shrink-0"
              >
                {t('see_how_it_works')}
              </button>
            </div>

            {/* Trust highlights */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-5 sm:gap-6 text-xs text-[#94A3B8]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                <span>{isHu ? 'Azonnali használat' : 'Instant Setup'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                <span>{isHu ? 'Biztonságos felhőtárhely' : 'Secure Cloud Storage'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                <span>{isHu ? 'Garancia- és számlatár' : 'Warranty & Receipts'}</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Realistic SaaS Inventory Preview (6 cols on lg) */}
          <div className="lg:col-span-6 relative w-full max-w-xl lg:max-w-none mx-auto">
            <div className="rounded-2xl border border-[#3E4A59] bg-[#2B3542] shadow-2xl shadow-black/40 overflow-hidden">
              
              {/* Window Frame Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#3E4A59] bg-[#242C35]/80">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-md bg-[#2B3542] border border-[#3E4A59] text-[11px] text-[#94A3B8]">
                    <Search className="h-3 w-3 text-[#94A3B8]" />
                    <span>thingor.app/leltár</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
                    128 {isHu ? 'tárgy' : 'items'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                    3.420.000 Ft
                  </span>
                </div>
              </div>

              {/* Quick filter pills */}
              <div className="px-4 py-2.5 border-b border-[#3E4A59]/70 bg-[#27313E] flex items-center gap-2 text-xs overflow-x-auto scrollbar-none">
                <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium shrink-0">
                  {isHu ? 'Összes (128)' : 'All (128)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#313B49] text-[#94A3B8] hover:text-[#E2E8F0] font-medium shrink-0">
                  {isHu ? 'Szerszámok (34)' : 'Tools (34)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#313B49] text-[#94A3B8] hover:text-[#E2E8F0] font-medium shrink-0">
                  {isHu ? 'Elektronika (18)' : 'Electronics (18)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#313B49] text-[#94A3B8] hover:text-[#E2E8F0] font-medium shrink-0">
                  {isHu ? 'Otthon (42)' : 'Home (42)'}
                </span>
              </div>

              {/* Inventory Items Stack */}
              <div className="p-4 sm:p-5 space-y-3">
                
                {/* Item 1 */}
                <div className="p-3.5 rounded-xl border border-[#3E4A59] bg-[#313B49]/80 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="text-sm font-bold text-[#F1F5F9]">Makita DHP486 Ütvefúró</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mt-0.5">
                        <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                        <span>Otthon → Garázs → Műhely (1. szekrény)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium shrink-0">
                      {isHu ? 'Jó állapot' : 'Good'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-[#94A3B8] pt-2 border-t border-[#3E4A59]/60">
                    <div className="flex items-center gap-1.5">
                      <span>{isHu ? 'Érték:' : 'Value:'}</span>
                      <strong className="text-emerald-400 font-semibold">{isHu ? '65.000 Ft' : '€180'}</strong>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>{isHu ? 'Garancia: 2028-ig' : 'Warranty: 2028'}</span>
                    </div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="p-3.5 rounded-xl border border-[#3E4A59] bg-[#313B49]/80 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="text-sm font-bold text-[#F1F5F9]">MacBook Pro 16" M3 Max</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mt-0.5">
                        <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                        <span>Otthon → Dolgozó → Íróasztal</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium shrink-0">
                      {isHu ? 'Kitűnő állapot' : 'Excellent'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-[#94A3B8] pt-2 border-t border-[#3E4A59]/60">
                    <div className="flex items-center gap-1.5">
                      <span>{isHu ? 'Érték:' : 'Value:'}</span>
                      <strong className="text-emerald-400 font-semibold">{isHu ? '1.150.000 Ft' : '€3,200'}</strong>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 font-medium">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{isHu ? 'Számla & Jótállás csatolva' : '2 Documents attached'}</span>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="p-3.5 rounded-xl border border-[#3E4A59] bg-[#313B49]/80 hover:border-blue-500/50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="text-sm font-bold text-[#F1F5F9]">DeWalt DWE7492 Asztali körfűrész</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mt-0.5">
                        <MapPin className="h-3 w-3 text-blue-400 shrink-0" />
                        <span>Otthon → Garázs → Műhely (Munkaasztal)</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium shrink-0">
                      {isHu ? 'Karbantartva' : 'Maintained'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-[#94A3B8] pt-2 border-t border-[#3E4A59]/60">
                    <div className="flex items-center gap-1.5">
                      <span>{isHu ? 'Érték:' : 'Value:'}</span>
                      <strong className="text-emerald-400 font-semibold">{isHu ? '210.000 Ft' : '€580'}</strong>
                    </div>
                    <div className="flex items-center gap-1 text-[#94A3B8]">
                      <Tag className="h-3.5 w-3.5 text-blue-400" />
                      <span>SN: DW-7492-2023</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 2. SECTION: CATEGORIES ("Minden tárgyad egy helyen") */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-[#29323D] border-y border-[#3E4A59] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2.5">
              {isHu ? 'SOKOLDALÚ KATEGÓRIÁK' : 'VERSATILE CATEGORIES'}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
              {isHu ? 'Minden tárgyad egy helyen' : 'Every Item in One System'}
            </h3>
            <p className="mt-3.5 text-[#94A3B8] text-base leading-relaxed">
              {isHu
                ? 'Legyen szó a műhelyben lévő szerszámokról, az íróasztalon lévő elektronikáról vagy a garázsban tartott járművekről – a Thingor bármilyen vagyontárgyat rendszerez.'
                : "Whether it's precision tools in the garage, high-end electronics, or outdoor gear, Thingor keeps everything structured and accessible."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {[
              {
                icon: Wrench,
                label: isHu ? 'Szerszámok & Gépek' : 'Tools & Equipment',
                desc: isHu ? 'Fúrók, fűrészek, kéziszerszámok' : 'Drills, saws, hand tools',
              },
              {
                icon: Laptop,
                label: isHu ? 'Elektronika' : 'Electronics',
                desc: isHu ? 'Laptopok, telefonok, audió' : 'Laptops, phones, cameras',
              },
              {
                icon: Bike,
                label: isHu ? 'Sport & Szabadidő' : 'Sports & Gear',
                desc: isHu ? 'Kerékpárok, felszerelések' : 'Bicycles, sports equipment',
              },
              {
                icon: Car,
                label: isHu ? 'Járművek & Alkatrészek' : 'Vehicles & Parts',
                desc: isHu ? 'Autók, motorok, alkatrészek' : 'Vehicles and spare parts',
              },
              {
                icon: BookOpen,
                label: isHu ? 'Könyvek & Gyűjtemények' : 'Books & Media',
                desc: isHu ? 'Könyvtárak, értékes gyűjtemények' : 'Libraries and collections',
              },
            ].map((cat, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl border border-[#3E4A59] bg-[#2E3743] hover:border-blue-500/50 hover:bg-[#343F4D] transition-all group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="h-11 w-11 rounded-xl bg-[#242C35] text-blue-400 flex items-center justify-center mb-4 border border-[#3E4A59]/80 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-[#F1F5F9] text-sm sm:text-base tracking-tight">
                    {cat.label}
                  </h4>
                  <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. SECTION: „TÖBB MINT EGY LISTA” (Balanced 2-Column with Rich Inspector Preview) */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Text & Value propositions (6 cols) */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D3743] border border-[#3E4A59] text-blue-400 text-xs font-semibold mb-3.5 shadow-sm">
              <Layers className="h-3.5 w-3.5" />
              <span>{isHu ? 'RÉSZLETES ADATOK & METAADATOK' : 'RICH ITEM METADATA'}</span>
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
              {isHu ? 'Több mint egy lista' : 'More Than Just a Plain List'}
            </h3>
            
            <p className="mt-4 text-[#94A3B8] text-base leading-relaxed">
              {isHu
                ? 'A Thingor a legegyszerűbb tárgyneveket is teljes körű digitális vagyontári adattáblává alakítja. Kövesd az összes tárgyad élettartamát és pénzügyi értékét egy helyen.'
                : "Thingor transforms basic item entries into a comprehensive asset ledger. Keep track of each item's entire lifecycle and financial worth."}
            </p>

            <div className="mt-8 space-y-3.5">
              {[
                isHu ? 'Pontos vásárlási dátum, vételár és kereskedő adatai' : 'Exact purchase date, price & vendor information',
                isHu ? 'Becsült valós piaci érték és állapot megadása' : 'Estimated market valuation and condition rating',
                isHu ? 'Többszintű hierarchikus helyszín útvonal (szoba, szekrény, doboz)' : 'Hierarchical location path (room, shelf, container)',
                isHu ? 'Garanciakövetés és automatikus lejárati értesítések' : 'Warranty expiration tracking and proactive alerts',
                isHu ? 'Digitális számlák, jótállások és kézikönyvek csatolása' : 'Attached invoices, receipts, and user manuals',
                isHu ? 'Sorozatszámok, szerviznapló és egyedi megjegyzések' : 'Serial numbers, maintenance logs, and custom notes',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                  <span className="text-[#E2E8F0] text-sm font-medium leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Rich Item Inspector Preview (6 cols) */}
          <div className="lg:col-span-6">
            <div className="p-6 sm:p-7 rounded-2xl border border-[#3E4A59] bg-[#2B3542] shadow-xl space-y-4">
              
              {/* Item Card Header */}
              <div className="p-4 rounded-xl bg-[#232B34] border border-[#3E4A59] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">
                      {isHu ? 'Szerszámgép leltárkártya' : 'Equipment Asset Card'}
                    </span>
                    <h4 className="text-base font-bold text-[#F1F5F9]">DeWalt DWE7492 Asztali körfűrész</h4>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {isHu ? 'Jó állapot' : 'Good Condition'}
                </span>
              </div>

              {/* Price & Value Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#232B34] border border-[#3E4A59]">
                  <p className="text-[11px] text-[#94A3B8] font-medium">{isHu ? 'Eredeti vételár' : 'Purchase Price'}</p>
                  <p className="text-base font-bold text-[#CBD5E1] mt-0.5">{isHu ? '260.000 Ft' : '€720.00'}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">{isHu ? 'Vásárlás: 2023. augusztus' : 'Bought: Aug 2023'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#232B34] border border-[#3E4A59]">
                  <p className="text-[11px] text-[#94A3B8] font-medium">{isHu ? 'Becsült jelenlegi érték' : 'Current Value'}</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">{isHu ? '210.000 Ft' : '€580.00'}</p>
                  <p className="text-[10px] text-emerald-300/80 mt-1">{isHu ? 'Kiváló értéktartás (-19%)' : 'Stable value (-19%)'}</p>
                </div>
              </div>

              {/* Location & Serial */}
              <div className="p-3.5 rounded-xl bg-[#232B34] border border-[#3E4A59] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                  <span className="text-xs font-medium text-[#E2E8F0]">Otthon → Garázs → Műhely</span>
                </div>
                <span className="text-xs text-[#94A3B8] font-mono sm:text-right">
                  SN: DW-7492-2023-8841
                </span>
              </div>

              {/* Warranty active bar */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-300">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400" />
                  <span className="font-semibold">{isHu ? 'Gyári garancia érvényes:' : 'Manufacturer warranty:'} 2027. augusztusig</span>
                </div>
                <span className="text-[11px] text-[#94A3B8]">{isHu ? 'még 482 nap' : '482 days left'}</span>
              </div>

              {/* Attached docs preview */}
              <div className="pt-2 flex items-center gap-2 text-xs text-[#94A3B8]">
                <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                <span>2 {isHu ? 'csatolt fájl:' : 'attached files:'}</span>
                <span className="px-2 py-0.5 rounded bg-[#232B34] border border-[#3E4A59] text-[11px] text-[#CBD5E1]">Számla_DeWalt.pdf</span>
                <span className="px-2 py-0.5 rounded bg-[#232B34] border border-[#3E4A59] text-[11px] text-[#CBD5E1]">Kézikönyv.pdf</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 4. SECTION: „TUDD, HOL VAN” (Center-stage Hierarchical Location Explorer) */}
      <section className="py-16 sm:py-20 bg-[#29323D] border-y border-[#3E4A59] px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2.5">
            {isHu ? 'HELYSZÍN FA STRUKTÚRA' : 'HIERARCHICAL LOCATION TREE'}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
            {isHu ? 'Tudd, hol van' : 'Know Exactly Where Everything Is'}
          </h3>
          <p className="mt-3.5 text-[#94A3B8] text-base max-w-xl mx-auto leading-relaxed">
            {isHu
              ? 'Soha többé ne pazarolj időt fiókok vagy dobozok felforgatására. Rendszerezd a tárgyaidat tetszőleges mélységű, logikus helyszínhierarchiába.'
              : 'Never waste time tearing through drawers or storage boxes again. Map your possessions into an intuitive multi-level spatial tree.'}
          </p>

          {/* Prominent Tree Diagram Card */}
          <div className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-2xl border border-[#3E4A59] bg-[#2E3743] text-left shadow-2xl">
            
            {/* Top Path Breadcrumb */}
            <div className="flex flex-wrap items-center gap-2 pb-4 mb-6 border-b border-[#3E4A59] text-xs">
              <FolderTree className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="text-[#94A3B8]">{isHu ? 'Aktív útvonal:' : 'Active path:'}</span>
              <span className="px-2 py-0.5 rounded bg-[#242C35] border border-[#3E4A59] text-blue-300 font-semibold">
                Otthon
              </span>
              <span className="text-[#94A3B8]">/</span>
              <span className="px-2 py-0.5 rounded bg-[#242C35] border border-[#3E4A59] text-blue-300 font-semibold">
                Garázs
              </span>
              <span className="text-[#94A3B8]">/</span>
              <span className="px-2 py-0.5 rounded bg-[#242C35] border border-[#3E4A59] text-blue-300 font-semibold">
                Műhely
              </span>
              <span className="text-[#94A3B8]">/</span>
              <span className="px-2 py-0.5 rounded bg-blue-600/20 border border-blue-500/40 text-blue-200 font-bold">
                Szerszámos szekrény
              </span>
            </div>

            {/* Visual Tree Node Hierarchy */}
            <div className="space-y-4">
              
              {/* Level 1: Root */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#242C35] border border-[#3E4A59]">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🏠</span>
                  <span className="font-bold text-sm text-[#F1F5F9]">{isHu ? 'Otthon (Főingatlan)' : 'Home (Main Property)'}</span>
                </div>
                <span className="text-xs text-[#94A3B8]">{isHu ? '128 tárgy tárolva' : '128 items total'}</span>
              </div>

              {/* Connecting rail */}
              <div className="ml-5 pl-5 border-l-2 border-blue-500/30 space-y-4">
                
                {/* Level 2 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#242C35] border border-[#3E4A59]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">🚗</span>
                    <span className="font-bold text-sm text-[#F1F5F9]">{isHu ? 'Garázs (Külön épület)' : 'Garage (Outbuilding)'}</span>
                  </div>
                  <span className="text-xs text-[#94A3B8]">{isHu ? '42 tárgy' : '42 items'}</span>
                </div>

                {/* Connecting rail */}
                <div className="ml-5 pl-5 border-l-2 border-blue-500/30 space-y-4">
                  
                  {/* Level 3 */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#242C35] border border-[#3E4A59]">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🔧</span>
                      <span className="font-bold text-sm text-[#F1F5F9]">{isHu ? 'Műhely (Helyiség)' : 'Workshop (Room)'}</span>
                    </div>
                    <span className="text-xs text-[#94A3B8]">{isHu ? '26 tárgy' : '26 items'}</span>
                  </div>

                  {/* Level 4: Highlighted Destination Container */}
                  <div className="ml-5 pl-5 border-l-2 border-blue-500/50">
                    <div className="p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/40 text-[#F1F5F9] shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📦</span>
                          <span className="font-bold text-sm text-blue-300">
                            {isHu ? 'Szerszámos szekrény (Felső polc)' : 'Tool Cabinet (Top Shelf)'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                            {isHu ? 'Kiválasztva' : 'Selected'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-emerald-400">
                          14 {isHu ? 'tárgy' : 'items'} • 420.000 Ft
                        </div>
                      </div>

                      {/* Sample items inside target location */}
                      <div className="mt-3 pt-3 border-t border-blue-500/20 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-[#242C35] border border-[#3E4A59] text-[#CBD5E1]">
                          Makita DHP486 Ütvefúró
                        </span>
                        <span className="px-2 py-1 rounded bg-[#242C35] border border-[#3E4A59] text-[#CBD5E1]">
                          Wiha csavarhúzókészlet
                        </span>
                        <span className="px-2 py-1 rounded bg-[#242C35] border border-[#3E4A59] text-[#CBD5E1]">
                          Bosch lézeres szintező
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 5. SECTION: „DOKUMENTUMOK ÉS GARANCIA” (Clean 2-Column: Left Cards, Right Value) */}
      <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Cards Stack (6 cols) */}
          <div className="lg:col-span-6 space-y-3.5">
            
            {/* Doc Card 1 */}
            <div className="p-4 rounded-xl border border-[#3E4A59] bg-[#2B3542] flex items-center justify-between gap-4 hover:border-blue-500/50 transition-colors shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-lg bg-[#232B34] text-blue-400 border border-[#3E4A59] flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#F1F5F9]">Szamla_Makita_DHP486.pdf</h4>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {isHu ? 'Vásárlási bizonylat' : 'Proof of purchase'} • 420 KB • {isHu ? 'Kereskedő: Zákány Szerszámház' : 'Vendor: ToolHouse'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[11px] bg-[#232B34] text-[#CBD5E1] border border-[#3E4A59] font-medium shrink-0">
                PDF
              </span>
            </div>

            {/* Doc Card 2: Highlighted Warranty */}
            <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-500/10 flex items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-[#F1F5F9]">
                      {isHu ? 'Garanciajegy_Makita_3ev.pdf' : 'Warranty_Certificate.pdf'}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      {isHu ? 'Aktív' : 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-300 font-semibold mt-0.5">
                    {isHu ? 'Érvényes: 2028. március 12-ig (még 518 nap)' : 'Valid until 12 March 2028 (518 days left)'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[11px] bg-blue-500/20 text-blue-200 border border-blue-500/40 font-semibold shrink-0">
                {isHu ? 'Jótállás' : 'Warranty'}
              </span>
            </div>

            {/* Doc Card 3 */}
            <div className="p-4 rounded-xl border border-[#3E4A59] bg-[#2B3542] flex items-center justify-between gap-4 hover:border-blue-500/50 transition-colors shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-lg bg-[#232B34] text-[#94A3B8] border border-[#3E4A59] flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#F1F5F9]">Hasznalati_Utmutato_HU.pdf</h4>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {isHu ? 'Hivatalos kezelési útmutató' : 'Official manual'} • 2.5 MB • {isHu ? 'Magyar nyelvű kézikönyv' : 'User guide'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-1 rounded text-[11px] bg-[#232B34] text-[#CBD5E1] border border-[#3E4A59] font-medium shrink-0">
                PDF
              </span>
            </div>

          </div>

          {/* Right Text (6 cols) */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2D3743] border border-[#3E4A59] text-blue-400 text-xs font-semibold mb-3.5 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{isHu ? 'DOKUMENTUMTÁR & JÓTÁLLÁS' : 'DOCUMENTS & WARRANTY'}</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
              {isHu ? 'Dokumentumok és garancia' : 'Documents & Warranty Tracking'}
            </h3>
            
            <p className="mt-4 text-[#94A3B8] text-base leading-relaxed">
              {isHu
                ? 'Soha ne keresgélj e-mailekben, számlatömbökben vagy papírdobozokban, ha meghibásodik egy eszköz. Csatolj számlákat, jótállási jegyeket és kezelési kézikönyveket közvetlenül a tárgyakhoz.'
                : 'Never dig through cluttered email inboxes or paper boxes when an item breaks. Attach invoices, certificates, and user guides directly to each asset.'}
            </p>

            <div className="mt-8 space-y-3.5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#F1F5F9]">{isHu ? 'Automatikus garancia-értesítések' : 'Automated warranty expiration alerts'}</h4>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{isHu ? 'Értesítés 30, 14 és 3 nappal a jótállás lejárata előtt.' : 'Timely reminders 30, 14, and 3 days before expiry.'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#F1F5F9]">{isHu ? 'Közvetlen mellékletkezelés' : 'Direct file attachments'}</h4>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{isHu ? 'Biztonságos felhőalapú PDF és képfájl tárolás bármilyen eszközről.' : 'Secure cloud PDF and image storage accessible from any device.'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 6. SECTION: „FOLYAMATOSAN BŐVÜLŐ PLATFORM” (Clean 3x2 Grid Roadmap) */}
      <section className="py-16 sm:py-20 bg-[#29323D] border-y border-[#3E4A59] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2.5">
            {isHu ? 'FEJLESZTÉSI ÜTEMTERV' : 'EXPANDING PLATFORM'}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F1F5F9] tracking-tight">
            {isHu ? 'Folyamatosan bővülő platform' : 'Continuously Expanding Platform'}
          </h3>
          <p className="mt-3.5 text-[#94A3B8] text-base max-w-2xl mx-auto leading-relaxed">
            {isHu
              ? 'A Thingor egy modern, moduláris alapra épül, amely lépésről lépésre gazdagodik új, kényelmi képességekkel:'
              : 'Thingor is built on an extensible architectural foundation designed to support upcoming advanced features:'}
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
            {[
              {
                label: isHu ? 'Karbantartási emlékeztetők' : 'Maintenance Reminders',
                desc: isHu ? 'Időzített szerviz- és karbantartási értesítések eszközökhöz.' : 'Scheduled service and routine maintenance notifications.',
              },
              {
                label: isHu ? 'Kölcsönadás kezelés' : 'Lending & Borrowing',
                desc: isHu ? 'Kövesd pontosan, kinél van kölcsönben az adott eszközöd.' : 'Keep transparent records of borrowed and lent items.',
              },
              {
                label: isHu ? 'Értékváltozás követés' : 'Value Tracking',
                desc: isHu ? 'Automatikus amortizációs és piaci értékelési görbék.' : 'Automated depreciation tracking and market trend evaluation.',
              },
              {
                label: isHu ? 'Biztosítási export' : 'Insurance Export',
                desc: isHu ? 'Egykattintásos kárrendezési és leltári PDF jegyzőkönyv.' : 'One-click damage claim and total inventory PDF reports.',
              },
              {
                label: isHu ? 'QR-kódos azonosítás' : 'QR Code Tags',
                desc: isHu ? 'Nyomtatható fizikai tárgycímkék azonnali beolvasással.' : 'Printable physical asset tags with instant camera scanning.',
              },
              {
                label: isHu ? 'Import és export' : 'Data Import & Export',
                desc: isHu ? 'Teljes CSV és JSON adatportabilitás és biztonsági mentések.' : 'Full CSV and JSON data portability and backups.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-[#3E4A59] bg-[#2E3743] hover:border-blue-500/40 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    {isHu ? 'Hamarosan' : 'Coming Soon'}
                  </span>
                </div>
                <h4 className="text-base font-bold text-[#F1F5F9] mt-2">
                  {f.label}
                </h4>
                <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 sm:py-16 bg-[#202730] text-[#94A3B8] text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#3E4A59]/80">
            {/* Brand Title & Tagline */}
            <div className="flex items-center gap-3">
              <img
                src="/app-icon.png"
                alt="Thingor"
                className="h-7 w-7 rounded-lg object-cover opacity-90"
              />
              <span className="text-sm font-bold text-[#F1F5F9]">Thingor</span>
              <span className="text-[#3E4A59] hidden sm:inline">•</span>
              <span className="text-xs text-[#94A3B8] font-medium hidden sm:inline">
                {t('tagline')}
              </span>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs">
              <button
                onClick={() => { setActiveLegalSlug('privacy'); setCurrentView('legal'); }}
                className="text-[#94A3B8] hover:text-blue-400 font-medium transition-colors"
              >
                {isHu ? 'Adatvédelem' : 'Privacy Policy'}
              </button>
              <button
                onClick={() => { setActiveLegalSlug('terms'); setCurrentView('legal'); }}
                className="text-[#94A3B8] hover:text-blue-400 font-medium transition-colors"
              >
                {isHu ? 'Felhasználási Feltételek' : 'Terms of Service'}
              </button>
              <button
                onClick={() => { setActiveLegalSlug('cookies'); setCurrentView('legal'); }}
                className="text-[#94A3B8] hover:text-blue-400 font-medium transition-colors"
              >
                {isHu ? 'Cookie Tájékoztató' : 'Cookie Policy'}
              </button>
              <button
                onClick={() => { setActiveLegalSlug('imprint'); setCurrentView('legal'); }}
                className="text-[#94A3B8] hover:text-blue-400 font-medium transition-colors"
              >
                {isHu ? 'Impresszum' : 'Imprint'}
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94A3B8]">
            <p>
              © {new Date().getFullYear()} Thingor. {isHu ? 'Minden jog fenntartva.' : 'All rights reserved.'}
            </p>
            <p className="text-[11px] text-[#64748B]">
              Personal Inventory & Asset Management
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
};
