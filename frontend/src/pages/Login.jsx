import { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon,
  Sun,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AuthError } from '../auth/authService';
import { cn } from '../lib/utils';
import { APP_BRAND_NAME } from '../config/branding';
import { APP_GREETING } from '../lib/greeting';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('crm_remember') === '1');
  const [langOpen, setLangOpen] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, getDashboardPath } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (user) {
    const dest = user.dashboardPath || getDashboardPath(user.role);
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      localStorage.setItem('crm_remember', rememberMe ? '1' : '0');
      const sessionUser = await login(email, password);
      const dest = sessionUser.dashboardPath || getDashboardPath(sessionUser.role);
      navigate(location.state?.from || dest, { replace: true });
    } catch (err) {
      const msg =
        err instanceof AuthError
          ? err.message
          : err.response?.data?.message
            || (err.message === 'Network Error'
              ? 'Cannot reach API. Check that the backend is running at http://localhost:5000.'
              : err.message)
            || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-12 overflow-hidden bg-slate-900 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5 sm:top-5 sm:right-6">
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            'relative flex h-9 w-[3.25rem] items-center rounded-full border border-white/50 bg-white/80 shadow-lg shadow-black/10 backdrop-blur-md transition-colors',
            isDark && 'border-orange-200/70 bg-white',
          )}
          aria-label="Toggle theme"
        >
          <span
            className={cn(
              'absolute left-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-white shadow transition-transform',
              isDark && 'translate-x-[1.35rem] bg-orange-500',
            )}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-white/50 bg-white/80 px-3 text-sm font-medium text-slate-700 shadow-lg shadow-black/10 backdrop-blur-md hover:bg-white"
          >
            <Globe className="h-4 w-4 text-slate-500" />
            English
            <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', langOpen && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 mt-1.5 w-36 overflow-hidden rounded-xl border border-white/70 bg-white/95 py-1 shadow-xl backdrop-blur-md"
              >
                {['English', 'Hindi'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLangOpen(false)}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-700"
                  >
                    {lang}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[360px]"
      >
        <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_28px_70px_-18px_rgba(0,0,0,0.65)]">
          <div
            className="relative h-[96px] bg-cover bg-center"
            style={{ backgroundImage: "url('/login-bg.jpg')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-white" />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] ring-4 ring-white">
                <BrandLogo className="h-[62px] w-[62px]" />
              </div>
            </div>
          </div>

          <div className="bg-white px-5 pb-5 pt-11 sm:px-6">
            <div className="mb-4 text-center">
              <p
                className="mb-1 text-[1.25rem] font-semibold leading-none text-orange-500"
                style={{ fontFamily: '"Caveat", cursive' }}
              >
                {APP_GREETING}
              </p>
              <h1 className="text-[1.2rem] font-bold tracking-tight text-slate-900">
                Sign in to your account
              </h1>
              <p className="mt-1 text-[12px] text-slate-500">
                Access your {APP_BRAND_NAME} dashboard
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-sm text-orange-800">
                {info}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-800">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex cursor-pointer items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-500 accent-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-[13px] text-slate-500">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setInfo('Please contact your admin to reset your password.');
                    setError('');
                  }}
                  className="text-[13px] font-semibold text-orange-500 hover:text-orange-600 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-500 hover:to-orange-600 hover:shadow-orange-500/40 disabled:opacity-60"
              >
                {loading ? 'Signing in…' : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 mt-7 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] text-white/80">
        <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        <span className="text-white/40">•</span>
        <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>Terms &amp; Conditions</a>
        <span className="text-white/40">•</span>
        <a href="#" className="hover:text-white" onClick={(e) => e.preventDefault()}>Support</a>
      </div>
    </div>
  );
}
