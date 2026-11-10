import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, register, switchPersona } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        await register({ email, password, firstName, lastName });
      } else {
        await login(email, password);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (persona: 'user' | 'admin' | 'compliance') => {
    setError(null);
    setIsSubmitting(true);
    try {
      await switchPersona(persona);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#102922] text-white font-serif font-bold text-lg">
            b.
          </div>
          <span className="text-xl font-bold tracking-tight text-[#102922] font-sans">
            balancevault
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#5D756C]">
          <span className="h-2 w-2 rounded-full bg-[#185A42] inline-block animate-pulse" />
          <span>Systems operational</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-md w-full mx-auto my-8">
        <div className="rounded-3xl bg-white p-6 sm:p-10 border border-[#E2EAE5] shadow-sm">
          {/* Editorial Title matching reference */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-serif text-[#102922] font-normal tracking-tight">
              {isRegisterMode ? 'Open an account' : 'Sign in to workspace'}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#5D756C]">
              {isRegisterMode
                ? 'Join BalanceVault for secure financial account custody.'
                : 'Welcome back. Enter your credentials to access your accounts.'}
            </p>
          </div>

          {/* Quick 1-Click Persona Logins */}
          {!isRegisterMode && (
            <div className="mt-6 pt-5 border-t border-[#EDF3F0]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#637C72] block mb-2 text-center">
                Instant 1-Click Demo Sign In:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('user')}
                  className="rounded-xl border border-[#D5E0DB] p-2.5 text-left hover:border-[#1A4337] hover:bg-[#F2F7F4] transition-all"
                >
                  <p className="text-xs font-bold text-[#102922]">Kondi Akanksha</p>
                  <p className="text-[10px] text-[#5D756C]">akankshakondi4@gmail.com</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="rounded-xl border border-[#D5E0DB] p-2.5 text-left hover:border-[#1A4337] hover:bg-[#F2F7F4] transition-all"
                >
                  <p className="text-xs font-bold text-[#102922]">System Administrator</p>
                  <p className="text-[10px] text-[#854E18]">admin@balancevault.com</p>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Akanksha"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2.5 text-xs focus:border-[#1A4337] focus:ring-1 focus:ring-[#1A4337] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Kondi"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2.5 text-xs focus:border-[#1A4337] focus:ring-1 focus:ring-[#1A4337] focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Email address</label>
              <input
                type="email"
                required
                placeholder="name@balancevault.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#D5E0DB] px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1A4337] focus:ring-1 focus:ring-[#1A4337] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#D5E0DB] pl-3.5 pr-10 py-2.5 text-xs text-slate-900 focus:border-[#1A4337] focus:ring-1 focus:ring-[#1A4337] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-[#1A4337] py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#13362C] active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? 'Verifying...'
                : isRegisterMode
                ? 'Create account'
                : 'Sign in'}
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-6 text-center text-xs text-[#5D756C]">
            {isRegisterMode ? (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError(null);
                  }}
                  className="font-bold text-[#1A4337] hover:underline"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                Don't have an account yet?{' '}
                <button
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError(null);
                  }}
                  className="font-bold text-[#1A4337] hover:underline"
                >
                  Register here
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer matching reference */}
      <footer className="max-w-5xl mx-auto w-full py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B8279] gap-2 border-t border-[#E2EAE5]">
        <p>BalanceVault · Financial clarity, by design.</p>
        <p className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-[#517568]" />
          <span>Secure 256-bit SSL encrypted session</span>
        </p>
      </footer>
    </div>
  );
};
