import React, { useState } from 'react';
import { Shield, Lock, Mail, User, Phone, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, switchPersona } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'bootstrap'>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Bootstrap state
  const [bootEmail, setBootEmail] = useState('');
  const [bootPass, setBootPass] = useState('');
  const [bootFirst, setBootFirst] = useState('');
  const [bootLast, setBootLast] = useState('');
  const [secretKey, setSecretKey] = useState('vault_admin_master_secret_2026');

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        email: regEmail,
        password: regPassword,
        firstName,
        lastName,
        phone,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.auth.bootstrapAdmin({
        email: bootEmail,
        password: bootPass,
        firstName: bootFirst,
        lastName: bootLast,
        secretKey,
      });
      await login(bootEmail, bootPass);
      alert('Administrator successfully provisioned via secure bootstrap protocol.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bootstrap failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">BalanceVault Authentication</h3>
              <p className="text-xs text-slate-500">Financial Account Management Core</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => {
              setMode('bootstrap');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'bootstrap' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Bootstrap Admin
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode: Login */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="alex.morgan@balancevault.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
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
              className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In with JWT'}
            </button>

            {/* Quick Demo Logins Box */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Quick 1-Click Demo Accounts:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await switchPersona('user');
                    onClose();
                  }}
                  className="rounded-xl border border-slate-200 p-2 text-left hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-900">Alex Morgan</p>
                  <p className="text-[10px] text-purple-700">Standard User</p>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await switchPersona('admin');
                    onClose();
                  }}
                  className="rounded-xl border border-slate-200 p-2 text-left hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-900">Sarah Chen</p>
                  <p className="text-[10px] text-rose-700">Root Admin</p>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await switchPersona('compliance');
                    onClose();
                  }}
                  className="rounded-xl border border-slate-200 p-2 text-left hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-900">Marcus Vance</p>
                  <p className="text-[10px] text-amber-700">Compliance Officer</p>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Mode: Register */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-4">
            <div className="rounded-xl bg-purple-50 p-2.5 text-[11px] text-purple-800 border border-purple-200">
              <span className="font-bold">Security Note:</span> Public registration is strictly restricted to regular
              USER role. Admin roles cannot be registered publicly.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Belfort"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="jordan@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password (min 8 chars)</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Creating User Account...' : 'Register User Account'}
            </button>
          </form>
        )}

        {/* Mode: Bootstrap Admin */}
        {mode === 'bootstrap' && (
          <form onSubmit={handleBootstrapSubmit} className="mt-5 space-y-4">
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              <span className="font-bold">First-Admin Bootstrap Protocol:</span> Protects the initial root administrator
              seat. Requires valid master secret key.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="Root"
                  value={bootFirst}
                  onChange={(e) => setBootFirst(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  placeholder="Admin"
                  value={bootLast}
                  onChange={(e) => setBootLast(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                placeholder="root.admin@balancevault.com"
                value={bootEmail}
                onChange={(e) => setBootEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="Strong password"
                value={bootPass}
                onChange={(e) => setBootPass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bootstrap Master Secret Key</label>
              <input
                type="text"
                required
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono bg-slate-50 focus:border-purple-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default secret: vault_admin_master_secret_2026</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Provisioning Root Admin...' : 'Bootstrap Administrator'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
