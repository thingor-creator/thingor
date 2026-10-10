import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import type { AuthModalMode } from '../context/AppContext';

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
    isRegistrationSuspended,
    siteSettings,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [signupConfirmationSent, setSignupConfirmationSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear errors and resets whenever modal opens/closes or mode changes
  useEffect(() => {
    setErrorMsg('');
    setResetSent(false);
    setSignupConfirmationSent(false);
    setPasswordUpdated(false);
    setShowPassword(false);
    setConfirmPassword('');
  }, [authModalMode, isAuthModalOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setErrorMsg('');
    setResetSent(false);
    setSignupConfirmationSent(false);
    setPasswordUpdated(false);
    setShowPassword(false);
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (newMode: AuthModalMode) => {
    setErrorMsg('');
    setResetSent(false);
    setSignupConfirmationSent(false);
    setPasswordUpdated(false);
    setPassword('');
    setConfirmPassword('');
    setAuthModalMode(newMode);
  };

  const validateEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Pre-flight Client Validations
    if (authModalMode !== 'update_password' && !validateEmail(email)) {
      setErrorMsg(language === 'hu' ? 'Kérjük, érvényes e-mail címet adj meg!' : 'Please enter a valid email address!');
      return;
    }

    if (authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'update_password') {
      if (password.length < 6) {
        setErrorMsg(language === 'hu' ? 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' : 'Password must be at least 6 characters long.');
        return;
      }
    }

    if (authModalMode === 'signup' || authModalMode === 'update_password') {
      if (password !== confirmPassword) {
        setErrorMsg(language === 'hu' ? 'A megadott jelszavak nem egyeznek!' : 'Passwords do not match!');
        return;
      }
    }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-color,#56616D)] bg-[var(--card-bg,#3A4551)] text-[var(--text-main,#E0E3E6)] shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 rounded-lg text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] disabled:opacity-50 transition-colors"
          title={language === 'hu' ? 'Bezárás' : 'Close'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-bg,#465362)] text-[var(--color-primary-blue,#2563EB)] border border-[var(--border-color,#56616D)] mb-3 shadow-md">
            <Lock className="h-6 w-6" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--text-main,#E0E3E6)] tracking-tight">
            {authModalMode === 'login' && (language === 'hu' ? 'Üdv újra!' : 'Welcome back')}
            {authModalMode === 'signup' && (language === 'hu' ? 'Fiók létrehozása' : 'Create your account')}
            {authModalMode === 'reset' && (language === 'hu' ? 'Jelszó visszaállítása' : 'Reset your password')}
            {authModalMode === 'update_password' && (language === 'hu' ? 'Új jelszó megadása' : 'Set new password')}
          </h2>

          <p className="text-xs text-[var(--text-sub,#B5BDC6)]">
            {authModalMode === 'login' && (language === 'hu' ? 'Jelentkezz be a saját Thingor tárgyilistád eléréséhez.' : 'Sign in to access your personal Thingor inventory.')}
            {authModalMode === 'signup' && (language === 'hu' ? 'Kezdd el rendszerezni a tárgyaidat egyetlen helyen.' : 'Start organizing all your physical assets in one place.')}
            {authModalMode === 'reset' && (language === 'hu' ? 'Add meg az e-mail címedet a jelszó-visszaállító hivatkozás fogadásához.' : 'Enter your email to receive password reset instructions.')}
            {authModalMode === 'update_password' && (language === 'hu' ? 'Add meg az új jelszavadat a fiókod frissítéséhez.' : 'Enter your new password below.')}
          </p>
        </div>

        {authModalMode === 'signup' && isRegistrationSuspended && (
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs text-center font-medium animate-in fade-in">
            {language === 'hu'
              ? '⚠️ Az új regisztrációk jelenleg fel vannak függesztve az adminisztrátor által.'
              : '⚠️ New user registrations are currently suspended by the administrator.'}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-500/50 bg-rose-950/40 text-rose-300 text-xs text-center font-medium animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {signupConfirmationSent ? (
          <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <Mail className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-[var(--text-main,#E0E3E6)]">
              {language === 'hu' ? 'Megerősítő e-mail elküldve!' : 'Confirmation email sent!'}
            </h3>
            <p className="text-[var(--text-sub,#B5BDC6)] leading-relaxed">
              {language === 'hu'
                ? `Elküldtük a visszaigazoló linket a megadott e-mail címre (${email}). Kérjük, nyisd meg a levelet és kattints a linkre a regisztráció véglegesítéséhez!`
                : `We dispatched a verification link to ${email}. Please check your inbox and click the link to activate your account.`}
            </p>
            <button
              onClick={() => switchMode('login')}
              className="mt-2 px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-xs font-bold text-[var(--text-main,#E0E3E6)] border border-[var(--border-color,#56616D)] transition-colors"
            >
              {language === 'hu' ? 'Vissza a bejelentkezéshez' : 'Back to Sign In'}
            </button>
          </div>
        ) : resetSent ? (
          <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-sm text-[var(--text-main,#E0E3E6)]">
              {language === 'hu' ? 'Jelszó-visszaállító e-mail elküldve!' : 'Password reset link sent!'}
            </h3>
            <p className="text-[var(--text-sub,#B5BDC6)] leading-relaxed">
              {language === 'hu'
                ? `A jelszó visszaállító hivatkozást elküldtük a következő e-mail címre: ${email}. Kérjük, ellenőrizd az e-mail fiókodat!`
                : `Password reset link has been dispatched to ${email}. Please check your email inbox!`}
            </p>
            <button
              onClick={() => switchMode('login')}
              className="mt-2 px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-xs font-bold text-[var(--text-main,#E0E3E6)] border border-[var(--border-color,#56616D)] transition-colors"
            >
              {language === 'hu' ? 'Vissza a bejelentkezéshez' : 'Back to Sign In'}
            </button>
          </div>
        ) : passwordUpdated ? (
          <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="font-bold text-sm text-[var(--text-main,#E0E3E6)]">
              {language === 'hu' ? 'A jelszavad sikeresen frissült!' : 'Password updated successfully!'}
            </h3>
            <p className="text-[var(--text-sub,#B5BDC6)] leading-relaxed">
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
              className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary-blue,#2563EB)] text-white font-bold text-xs hover:bg-blue-600 shadow-md transition-colors"
            >
              {language === 'hu' ? 'Tovább a Vezérlőpultra' : 'Go to Dashboard'}
            </button>
          </div>
        ) : authModalMode === 'signup' && (isRegistrationSuspended || !siteSettings.registration_enabled) ? (
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-950/30 text-amber-300 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
            <h3 className="font-bold text-sm text-[var(--text-main,#E0E3E6)]">
              {language === 'hu' ? 'A regisztráció jelenleg szünetel.' : 'Registration temporarily unavailable.'}
            </h3>
            <p className="text-[var(--text-sub,#B5BDC6)] text-xs leading-relaxed">
              {language === 'hu'
                ? 'A regisztráció jelenleg szünetel. Kérjük, próbáld meg később.'
                : 'Registration temporarily unavailable. Please try again later.'}
            </p>
            <button
              onClick={() => switchMode('login')}
              className="mt-2 px-4 py-2 rounded-xl bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-xs font-bold text-[var(--text-main,#E0E3E6)] border border-[var(--border-color,#56616D)] transition-colors"
            >
              {language === 'hu' ? 'Vissza a bejelentkezéshez' : 'Back to Sign In'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {authModalMode === 'signup' && (
              <div>
                <label className="block font-semibold text-xs text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Név' : 'Your Name'}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/60 text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:ring-1 focus:ring-[var(--color-primary-blue,#2563EB)] focus:outline-none disabled:opacity-50 transition shadow-inner"
                  />
                </div>
              </div>
            )}

            {authModalMode !== 'update_password' && (
              <div>
                <label className="block font-semibold text-xs text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'E-mail cím' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
                  <input
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus={authModalMode !== 'signup'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/60 text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:ring-1 focus:ring-[var(--color-primary-blue,#2563EB)] focus:outline-none disabled:opacity-50 transition shadow-inner"
                  />
                </div>
              </div>
            )}

            {(authModalMode === 'login' || authModalMode === 'signup' || authModalMode === 'update_password') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-xs text-[var(--text-sub,#B5BDC6)]">
                    {authModalMode === 'update_password'
                      ? (language === 'hu' ? 'Új jelszó' : 'New Password')
                      : (language === 'hu' ? 'Jelszó' : 'Password')}
                  </label>
                  {authModalMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-[11px] text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400 hover:underline font-medium"
                    >
                      {language === 'hu' ? 'Elfelejtetted a jelszavad?' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    autoFocus={authModalMode === 'update_password'}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/60 text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:ring-1 focus:ring-[var(--color-primary-blue,#2563EB)] focus:outline-none disabled:opacity-50 transition shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-sub,#B5BDC6)] hover:text-white p-1 rounded-md transition-colors"
                    title={showPassword ? (language === 'hu' ? 'Jelszó elrejtése' : 'Hide password') : (language === 'hu' ? 'Jelszó megjelenítése' : 'Show password')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {(authModalMode === 'signup' || authModalMode === 'update_password') && (
              <div>
                <label className="block font-semibold text-xs text-[var(--text-sub,#B5BDC6)] mb-1">
                  {language === 'hu' ? 'Jelszó megerősítése' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-sub,#B5BDC6)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] placeholder-[var(--text-sub,#B5BDC6)]/60 text-sm focus:border-[var(--color-primary-blue,#2563EB)] focus:ring-1 focus:ring-[var(--color-primary-blue,#2563EB)] focus:outline-none disabled:opacity-50 transition shadow-inner"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{language === 'hu' ? 'Feldolgozás...' : 'Processing...'}</span>
                </>
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
          <div className="pt-3 border-t border-[var(--border-color,#56616D)] text-center text-xs text-[var(--text-sub,#B5BDC6)]">
            {authModalMode === 'login' ? (
              <p>
                {language === 'hu' ? 'Még nincs fiókod? ' : "Don't have an account? "}
                <button
                  onClick={() => switchMode('signup')}
                  className="font-bold text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400 hover:underline"
                >
                  {language === 'hu' ? 'Regisztráció' : 'Sign up'}
                </button>
              </p>
            ) : (
              <p>
                {language === 'hu' ? 'Már van fiókod? ' : 'Already have an account? '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-bold text-[var(--color-primary-blue,#2563EB)] hover:text-blue-400 hover:underline"
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
