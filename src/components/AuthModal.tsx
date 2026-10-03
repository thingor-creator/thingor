import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, Database } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    signup,
    setCurrentView,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authModalMode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || 'Invalid credentials');
        } else {
          setCurrentView('dashboard');
        }
      } else if (authModalMode === 'signup') {
        const res = await signup(email, password, displayName);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to create account');
        } else {
          setCurrentView('dashboard');
        }
      } else if (authModalMode === 'reset') {
        setResetSent(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Close button */}
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800/40 mb-3 shadow-lg shadow-emerald-950/40">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {authModalMode === 'login' && 'Welcome back'}
            {authModalMode === 'signup' && 'Create your account'}
            {authModalMode === 'reset' && 'Reset your password'}
          </h2>

          <p className="text-xs text-slate-400">
            {authModalMode === 'login' && 'Sign in to access your personal Thingor inventory.'}
            {authModalMode === 'signup' && 'Start organizing all your physical assets in one place.'}
            {authModalMode === 'reset' && 'Enter your email to receive password reset instructions.'}
          </p>
        </div>

        {/* Connection Mode Indicator */}
        <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            Backend Mode:
          </span>
          <span className="font-mono text-emerald-400 font-semibold">
            {isSupabaseConfigured ? 'Live Supabase Auth' : 'Local Demo Auth'}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {resetSent ? (
          <div className="p-4 rounded-xl border border-emerald-800/60 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
            <p>Password reset link has been dispatched to <strong>{email}</strong>.</p>
            <button
              onClick={() => setAuthModalMode('login')}
              className="text-xs font-bold text-white underline hover:text-emerald-400"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {authModalMode === 'signup' && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Your Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Alex Sterling"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="alex@thingor.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {authModalMode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-300">Password</label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('reset')}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  {authModalMode === 'login' && 'Sign in'}
                  {authModalMode === 'signup' && 'Create account'}
                  {authModalMode === 'reset' && 'Send reset email'}
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer mode toggles */}
        <div className="pt-3 border-t border-slate-800/80 text-center text-xs text-slate-400">
          {authModalMode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => setAuthModalMode('signup')}
                className="font-bold text-emerald-400 hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => setAuthModalMode('login')}
                className="font-bold text-emerald-400 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
