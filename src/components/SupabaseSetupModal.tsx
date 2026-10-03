import React from 'react';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { Database, ShieldCheck, X, Code } from 'lucide-react';

export const SupabaseSetupModal: React.FC = () => {
  const { isSupabaseInfoOpen, setIsSupabaseInfoOpen } = useApp();

  if (!isSupabaseInfoOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Close Button */}
        <button
          onClick={() => setIsSupabaseInfoOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-3 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Supabase Integration & Database</h2>
            <p className="text-xs text-slate-400">
              Thingor comes fully prepared for both live Supabase Cloud & instant local demonstration.
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`h-3 w-3 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <p className="text-xs font-bold text-white">
                {isSupabaseConfigured ? 'Connected to Supabase' : 'Running in Local Demo Storage Mode'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isSupabaseConfigured
                  ? 'All authentication, item database records, and storage uploads are live.'
                  : 'Items, categories, locations, and documents are securely persisted in browser storage.'}
              </p>
            </div>
          </div>
        </div>

        {/* Setup guide & env variables */}
        <div className="space-y-4 text-xs overflow-y-auto max-h-[50vh]">
          <div>
            <h3 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
              <Code className="h-4 w-4" /> 1. Environment Variables (.env)
            </h3>
            <p className="text-slate-300 mb-2">
              To connect to your own Supabase project, create a <code className="text-emerald-300 font-mono">.env</code> file in the project root:
            </p>
            <pre className="p-3 rounded-xl border border-slate-800 bg-slate-950 font-mono text-[11px] text-emerald-400 selection:bg-emerald-800 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
            </pre>
          </div>

          <div>
            <h3 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> 2. Database Schema & RLS Policies
            </h3>
            <p className="text-slate-300 mb-2">
              The full schema file is located at <code className="text-emerald-300 font-mono">supabase/schema.sql</code>. It includes:
            </p>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li><strong className="text-slate-200">profiles</strong> table with auto-user trigger</li>
              <li><strong className="text-slate-200">categories</strong> table with default system categories</li>
              <li><strong className="text-slate-200">locations</strong> table with parent-child location hierarchy</li>
              <li><strong className="text-slate-200">items</strong> table with purchase, value, condition & warranty fields</li>
              <li><strong className="text-slate-200">item_documents</strong> table for attached invoices and manuals</li>
              <li>Strict Row Level Security (RLS) policies for user data isolation</li>
            </ul>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => setIsSupabaseInfoOpen(false)}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 font-semibold text-xs hover:bg-slate-700"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};
