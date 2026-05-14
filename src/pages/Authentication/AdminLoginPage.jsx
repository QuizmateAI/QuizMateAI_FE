import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useLogin } from './Login';
import { useDarkMode } from '@/hooks/useDarkMode';

/**
 * Admin/SuperAdmin login page.
 *
 * Served ONLY trên subdomain admin.quizmateai.io.vn (xem App.jsx routing).
 * Backend SubdomainGuardFilter sẽ enforce SUPER_ADMIN role bắt buộc cho
 * mọi request từ origin này; UI tại đây có nhiệm vụ:
 *   - tách biệt visual khỏi user-facing login,
 *   - bỏ Google / Register / Forgot-password tabs (manager flow thuần),
 *   - dùng palette neutral slate, ít màu, kiểu console / dashboard.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useDarkMode();
  // Passing a fallback `t` để không lỗi nếu i18n không inject — strings ở đây là VN hardcoded.
  const tFallback = (_key, fallback) => fallback;
  const {
    loginData,
    showPassword,
    isLoading,
    error,
    fieldErrors,
    handleLoginChange,
    handleLoginSubmit,
    setShowPassword,
  } = useLogin(navigate, location, tFallback);

  return (
    <div
      className={`min-h-screen flex items-stretch ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Sidebar — dấu hiệu "management console", không phải user app */}
      <aside
        className={`hidden lg:flex w-[420px] flex-col justify-between px-12 py-14 border-r ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className={`grid place-items-center w-9 h-9 rounded-md ${
                isDarkMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
              }`}
            >
              <ShieldCheck size={18} strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-60">
                Quizmate AI
              </div>
              <div className="text-base font-semibold tracking-tight">
                Management Console
              </div>
            </div>
          </div>

          <div className="mt-14 space-y-7">
            <Metric
              isDarkMode={isDarkMode}
              kicker="01"
              title="Quản trị nội bộ"
              body="Truy cập module quản trị, vận hành, RBAC và cấu hình hệ thống. Chỉ tài khoản được cấp quyền."
            />
            <Metric
              isDarkMode={isDarkMode}
              kicker="02"
              title="Audit & monitoring"
              body="Mọi hành động trong console đều được ghi lại. Đăng nhập từ thiết bị bạn tin cậy."
            />
            <Metric
              isDarkMode={isDarkMode}
              kicker="03"
              title="Truy cập tách biệt"
              body="Subdomain admin.* không có chức năng dành cho user. Đăng nhập sai vai trò sẽ bị từ chối."
            />
          </div>
        </div>

        <footer className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>System operational</span>
          </div>
          <div className="mt-2 opacity-70">
            © {new Date().getFullYear()} Quizmate AI · Internal use only
          </div>
        </footer>
      </aside>

      {/* Right panel — form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile header — chỉ hiện khi sidebar ẩn */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div
              className={`grid place-items-center w-9 h-9 rounded-md ${
                isDarkMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
              }`}
            >
              <ShieldCheck size={18} strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold tracking-[0.18em] uppercase opacity-60">
                Quizmate AI
              </div>
              <div className="text-sm font-semibold tracking-tight">
                Management Console
              </div>
            </div>
          </div>

          <div className="mb-9">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 mb-5 ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-900 text-slate-300'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase">
                Restricted
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Đăng nhập quản trị
            </h1>
            <p
              className={`mt-2 text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Dùng tài khoản được cấp quyền quản trị. Tài khoản user thường sẽ bị từ chối.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5" noValidate>
            <Field
              id="admin-username"
              label="Email hoặc tên đăng nhập"
              type="text"
              icon={Mail}
              autoComplete="username"
              value={loginData.username}
              onChange={handleLoginChange('username')}
              error={fieldErrors.username}
              isDarkMode={isDarkMode}
            />

            <Field
              id="admin-password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              autoComplete="current-password"
              value={loginData.password}
              onChange={handleLoginChange('password')}
              error={fieldErrors.password}
              isDarkMode={isDarkMode}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={`grid place-items-center w-9 h-9 rounded-md transition-colors ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {error ? (
              <div
                role="alert"
                className={`text-sm rounded-md border px-3 py-2 ${
                  isDarkMode
                    ? 'border-red-900/60 bg-red-950/30 text-red-300'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-4 h-11 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isDarkMode
                  ? 'bg-slate-100 text-slate-900 hover:bg-white'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xác thực…</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          <p
            className={`mt-8 text-xs leading-relaxed ${
              isDarkMode ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            Quên mật khẩu hoặc cần cấp quyền truy cập? Liên hệ administrator
            của bạn. Subdomain này không hỗ trợ tự đăng ký.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Sidebar metric block ─────────────────────────────────────────────────
function Metric({ isDarkMode, kicker, title, body }) {
  return (
    <div className="flex gap-4">
      <div
        className={`shrink-0 text-xs font-mono font-semibold ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {kicker}
      </div>
      <div>
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        <p
          className={`mt-1 text-[13px] leading-relaxed ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

// ── Input field with floating-ish label + icon ───────────────────────────
function Field({
  id, label, type, icon: IconCmp, value, onChange, error,
  autoComplete, suffix, isDarkMode,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`block text-xs font-medium mb-1.5 ${
          isDarkMode ? 'text-slate-300' : 'text-slate-700'
        }`}
      >
        {label}
      </label>
      <div
        className={`relative flex items-center rounded-md border transition-colors ${
          error
            ? isDarkMode
              ? 'border-red-700 focus-within:border-red-500'
              : 'border-red-400 focus-within:border-red-500'
            : isDarkMode
              ? 'border-slate-700 focus-within:border-slate-500 bg-slate-900'
              : 'border-slate-300 focus-within:border-slate-900 bg-white'
        }`}
      >
        {IconCmp ? (
          <span
            className={`pl-3 pr-1 ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            <IconCmp size={16} />
          </span>
        ) : null}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className={`flex-1 bg-transparent outline-none px-2 h-11 text-sm placeholder:text-slate-400 ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}
        />
        {suffix}
      </div>
      {error ? (
        <p
          className={`mt-1 text-xs ${
            isDarkMode ? 'text-red-400' : 'text-red-600'
          }`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
