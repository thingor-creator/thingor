import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    signup,
    resetPassword,
    updatePassword,
    setCurrentView,
    language,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setResetSent(false);
    setSignupConfirmationSent(false);
    setPasswordUpdated(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authModalMode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setErrorMsg(res.error || (language === 'hu' ? 'Érvénytelen bejelentkezési adatok' : 'Invalid credentials'));
        } else {
          setCurrentView('dashboard');
          handleClose();
        }
      } else if (authModalMode === 'signup') {
        const res = await signup(email, password, displayName);
        if (!res.success) {
          setErrorMsg(res.error || (language === 'hu' ? 'A fiók létrehozása nem sikerült' : 'Failed to create account'));
        } else if (res.emailConfirmationRequired) {
          setSignupConfirmationSent(true);
        } else {
          setCurrentView('dashboard');
          handleClose();
        }
      } else if (authModalMode === 'reset') {
        const res = await resetPassword(email);
        if (!res.success) {
          setErrorMsg(res.error || (language === 'hu' ? 'Nem sikerült elküldeni a visszaállító e-mailt' : 'Failed to send reset email'));
        } else {
          setResetSent(true);
        }
      } else if (authModalMode === 'update_password') {
        const res = await updatePassword(password);
        if (!res.success) {
          setErrorMsg(res.error || (language === 'hu' ? 'A jelszó frissítése nem sikerült' : 'Failed to update password'));
        } else {
          setPasswordUpdated(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'hu' ? 'Váratlan hiba történt' : 'An unexpected error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Close button */}
        <button
          onClick={handleClose}
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
            {authModalMode === 'login' && (language === 'hu' ? 'Üdv újra!' : 'Welcome back')}
            {authModalMode === 'signup' && (language === 'hu' ? 'Fiók létrehozása' : 'Create your account')}
            {authModalMode === 'reset' && (language === 'hu' ? 'Jelszó visszaállítása' : 'Reset your password')}
            {authModalMode === 'update_password' && (language === 'hu' ? 'Új jelszó megadása' : 'Set new password')}
          </h2>

          <p className="text-xs text-slate-400">
            {authModalMode === 'login' && (language === 'hu' ? 'Jelentkezz be a saját Thingor tárgyilistád eléréséhez.' : 'Sign in to access your personal Thingor inventory.')}
            {authModalMode === 'signup' && (language === 'hu' ? 'Kezdd el rendszerezni a tárgyaidat egyetlen helyen.' : 'Start organizing all your physical assets in one place.')}
            {authModalMode === 'reset' && (language === 'hu' ? 'Add meg az e-mail címedet a jelszó-visszaállító hivatkozás fogadásához.' : 'Enter your email to receive password reset instructions.')}
            {authModalMode === 'update_password' && (language === 'hu' ? 'Add meg az új jelszavadat a fiókod frissítéséhez.' : 'Enter your new password below.')}
          </p>
        </div>


        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-300 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {signupConfirmationSent ? (
          <div className="p-5 rounded-xl border border-emerald-800/60 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <Mail className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-white">
              {language === 'hu' ? 'Megerősítő e-mail elküldve!' : 'Confirmation email sent!'}
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {language === 'hu'
                ? `Elküldtük a visszaigazoló linket a megadott e-mail címre (${email}). Kérjük, nyisd meg a levelet és kattints a linkre a regisztráció véglegesítéséhez!`
                : `We dispatched a verification link to ${email}. Please check your inbox and click the link to activate your account.`}
            </p>
            <button
              onClick={() => {
                setSignupConfirmationSent(false);
                setAuthModalMode('login');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              {language === 'hu' ? 'Vissza a bejelentkezéshez' : 'Back to Sign In'}
            </button>
          </div>
        ) : resetSent ? (
          <div className="p-5 rounded-xl border border-emerald-800/60 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-sm text-white">
              {language === 'hu' ? 'Jelszó-visszaállító e-mail elküldve!' : 'Password reset link sent!'}
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {language === 'hu'
                ? `A jelszó visszaállító hivatkozást elküldtük a következő e-mail címre: ${email}. Kérjük, ellenőrizd az e-mail fiókodat!`
                : `Password reset link has been dispatched to ${email}. Please check your email inbox!`}
            </p>
            <button
              onClick={() => {
                setResetSent(false);
                setAuthModalMode('login');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              {language === 'hu' ? 'Vissza a bejelentkezéshez' : 'Back to Sign In'}
            </button>
          </div>
        ) : passwordUpdated ? (
          <div className="p-5 rounded-xl border border-emerald-800/60 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-sm text-white">
              {language === 'hu' ? 'A jelszavad sikeresen frissült!' : 'Password updated successfully!'}
            </h3>
            <p className="text-slate-300 leading-relaxed">
              {language === 'hu'
                ? 'Most már az új jelszavaddal jelentkezhetsz be a fiókodba.'
                : 'You can now sign in using your new password.'}
            </p>
            <button
              onClick={() => {
                setPasswordUpdated(false);
                setCurrentView('dashboard');
                handleClose();
              }}
              className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              {language === 'hu' ? 'Tovább a Vezérlőpultra' : 'Go to Dashboard'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {authModalMode === 'signup' && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {language === 'hu' ? 'Név' : 'Your Name'}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={language === 'hu' ? 'Kovács Alex' : 'Alex Sterling'}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {authModalMode !== 'update_password' && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {language === 'hu' ? 'E-mail cím' : 'Email Address'}
                </label>
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
            )}

            {(authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'update_password') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-300">
                    {authModalMode === 'update_password'
                      ? (language === 'hu' ? 'Új jelszó' : 'New Password')
                      : (language === 'hu' ? 'Jelszó' : 'Password')}
                  </label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthModalMode('reset')}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      {language === 'hu' ? 'Elfelejtetted a jelszavad?' : 'Forgot password?'}
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
                    minLength={6}
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
                language === 'hu' ? 'Feldolgozás...' : 'Processing...'
              ) : (
                <>
                  {authModalMode === 'login' && (language === 'hu' ? 'Bejelentkezés' : 'Sign in')}
                  {authModalMode === 'signup' && (language === 'hu' ? 'Regisztráció' : 'Create account')}
                  {authModalMode === 'reset' && (language === 'hu' ? 'Visszaállító e-mail küldése' : 'Send reset email')}
                  {authModalMode === 'update_password' && (language === 'hu' ? 'Jelszó frissítése' : 'Update password')}
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer mode toggles */}
        {!signupConfirmationSent && !resetSent && !passwordUpdated && authModalMode !== 'update_password' && (
          <div className="pt-3 border-t border-slate-800/80 text-center text-xs text-slate-400">
            {authModalMode === 'login' ? (
              <p>
                {language === 'hu' ? 'Még nincs fiókod? ' : "Don't have an account? "}
                <button
                  onClick={() => setAuthModalMode('signup')}
                  className="font-bold text-emerald-400 hover:underline"
                >
                  {language === 'hu' ? 'Regisztráció' : 'Sign up'}
                </button>
              </p>
            ) : (
              <p>
                {language === 'hu' ? 'Már van fiókod? ' : 'Already have an account? '}
                <button
                  onClick={() => setAuthModalMode('login')}
                  className="font-bold text-emerald-400 hover:underline"
                >
                  {language === 'hu' ? 'Bejelentkezés' : 'Sign in'}
                </button>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
