import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Loader2,
  KeyRound,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Award,
  X
} from 'lucide-react';
import { clearAuth } from './utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Configurable temporary organization name
export const INSTITUTION_NAME = "Template Vacation Classes";

async function apiFetch(endpoint, options = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(resJson.message || resJson.error || `HTTP ${response.status}: Request failed`);
  }

  return resJson.data !== undefined ? resJson.data : resJson;
}

export const TeacherLogin = () => {
  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Reset Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          remember: rememberMe,
        }),
      });

      const token = response.token;
      const user = response.user;

      if (!token) {
        throw new Error('Authentication token missing from server response.');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      const role = user?.role?.slug || user?.role_slug || 'teacher';
      localStorage.setItem('user_role', role);
      localStorage.setItem('user_name', user?.name || '');

      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
      document.cookie = `portal_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;

      if (response.portal_blocked) {
        clearAuth();
        setErrorMessage('Your faculty instructor account has been gated or deactivated by system administration.');
        return;
      }

      const destinationByRole = {
        admin: '/admin-portal',
        teacher: '/teacher-portal',
        student: '/student-portal',
      };

      const targetPath = response.redirect || destinationByRole[role] || '/teacher-portal';
      window.location.assign(targetPath);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid faculty credentials. Please verify your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/auth/google/redirect?role=teacher');
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to retrieve Google OAuth authorization URL.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Faculty Google Workspace Sign-In is temporarily unavailable.');
      setIsLoading(false);
    }
  };

  const handleResetPasswordRequest = async (e) => {
    e.preventDefault();
    setIsResetting(true);
    setResetError('');
    setResetSuccess('');

    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
        }),
      });

      setResetSuccess(
        res.message || 'Password reset instructions have been dispatched to your official staff email address.'
      );
    } catch (err) {
      setResetError(err.message || 'No registered instructor account was found matching that identifier.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D1A] text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-indigo-600 selection:text-white">
      {/* Faculty Ambient Lighting */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <a href="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white block leading-tight">
              {INSTITUTION_NAME}
            </span>
            <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase block">
              Faculty &amp; Tutor Portal
            </span>
          </div>
        </a>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">Are you a student?</span>
          <a
            href="/login"
            className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200 transition-all shadow-xs"
          >
            Student Desk &rarr;
          </a>
        </div>
      </header>

      {/* Main Login Card */}
      <div className="w-full max-w-[460px] mx-auto px-4 py-8 relative z-10">
        <div className="bg-[#10172D]/90 backdrop-blur-2xl border border-indigo-500/20 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-indigo-950/40 space-y-6">
          
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Certified Faculty Access</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Teacher Portal Login</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Sign in with your Staff ID or registered email to coordinate virtual lessons, attendance roll calls, and coursework grades.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Google One-Click Faculty Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#16203D] hover:bg-[#1C294E] border border-indigo-500/30 text-xs font-bold text-slate-200 flex items-center justify-center gap-3 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-3.1z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.2C3.7 19.9 7.5 23 12 23z" />
            </svg>
            <span>Continue with Faculty Google Account</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#10172D] px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Or with staff credentials
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Staff Email or Employee ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="tutor@school.edu or STF-2026-..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0F1D]/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(true);
                    setResetIdentifier(identifier);
                    setResetError('');
                    setResetSuccess('');
                  }}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0A0F1D]/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>Keep me signed in on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Faculty Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & Activity Note */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#0F172A]/40 border border-indigo-500/10 flex items-center gap-3 text-slate-400 text-xs">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Sign in to access your faculty portal.</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-900/80 relative z-10">
        <p>&copy; 2026 {INSTITUTION_NAME}. Faculty Management Infrastructure.</p>
      </footer>

      {/* ======================= FORGOT PASSWORD MODAL ======================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#10172D] border border-indigo-500/20 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-xs relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Staff Password</h3>
                  <p className="text-[11px] text-slate-400">Faculty security recovery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Instructions Dispatched</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {resetSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordRequest} className="space-y-4">
                <p className="text-slate-400 leading-relaxed">
                  Enter the email address or Staff Employee ID associated with your faculty instructor profile to receive password reset instructions.
                </p>

                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Staff Email or Employee ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="tutor@school.edu or STF-2026-..."
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0A0F1D]/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Mount component to root element
const teacherRoot = document.getElementById('teacher-login-root');
if (teacherRoot) {
  ReactDOM.createRoot(teacherRoot).render(
    <React.StrictMode>
      <TeacherLogin />
    </React.StrictMode>
  );
}

export default TeacherLogin;