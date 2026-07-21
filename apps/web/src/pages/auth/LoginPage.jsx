// src/pages/auth/LoginPage.jsx
import { useCallback, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGoogleIdentity } from '../../hooks/useGoogleIdentity';
import { ErrorAlert } from '../../components/alerts/ErrorAlert';
import { AuthLayout } from '../../components/auth/AuthLayout';
import * as Lucide from 'lucide-react';

const normalizeRole = (role) => {
  if (!role) return role;
  const normalized = String(role).trim().toLowerCase();
  if (normalized === 'serviceuser' || normalized === 'service-user') return 'service-user';
  if (normalized === 'systemstaff' || normalized === 'system-staff') return 'system-staff';
  if (
    normalized === 'serviceprovider' ||
    normalized === 'service-provider' ||
    normalized === 'serviceoperator' ||
    normalized === 'service-operator'
  ) return 'service-provider';
  if (normalized === 'interactionmanager' || normalized === 'interaction-manager') return 'interaction-manager';
  if (normalized === 'systemadmin' || normalized === 'admin' || normalized === 'administrator') return 'administrator';
  return normalized;
};

const getRoleDashboard = (role) => {
  const normalizedRole = normalizeRole(role);
  const roleMap = {
    'service-user': '/dashboard',
    'system-staff': '/staff/queue',
    'service-provider': '/provider/tasks',
    'interaction-manager': '/manager/interactions',
    administrator: '/admin/audit',
  };
  return roleMap[normalizedRole] || '/dashboard';
};

const getSafeInternalPath = (candidate) => {
  if (!candidate) return '';

  if (typeof candidate === 'object') {
    const pathname = candidate.pathname || '';
    const search = candidate.search || '';
    const hash = candidate.hash || '';
    return getSafeInternalPath(`${pathname}${search}${hash}`);
  }

  const normalized = String(candidate).trim();
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return '';
  return normalized;
};

const TEST_ROLE_ACCOUNTS = [
  {
    label: 'Administrator',
    description: 'Quản trị hệ thống',
    email: 'anhkvse182347@fpt.edu.vn',
    icon: Lucide.ShieldCheck,
  },
  {
    label: 'System Staff',
    description: 'Tiếp nhận phản ánh',
    email: 'kvietanh123@gmail.com',
    icon: Lucide.UsersRound,
  },
  {
    label: 'Interaction Manager',
    description: 'Duyệt tương tác',
    email: 'xbg4623@gmail.com',
    icon: Lucide.ClipboardCheck,
  },
  {
    label: 'Service Operator',
    description: 'Xử lý dịch vụ',
    email: 'xbg4622@gmail.com',
    icon: Lucide.Wrench,
  },
];

// Keep this switch while the team is validating role-specific UI.
// Set to true whenever quick role access is needed during testing.
const SHOW_TEST_ROLE_ACCOUNTS = true;

const GoogleLogo = () => (
  <svg aria-label="Google" width="17" height="17" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <g>
      <path d="m0 0H512V512H0" fill="#fff" />
      <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341" />
      <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57" />
      <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73" />
      <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55" />
    </g>
  </svg>
);

export const LoginPage = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('reason') === 'session-expired';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resolveRedirect = (role) => (
    getSafeInternalPath(searchParams.get('redirect')) ||
    getSafeInternalPath(location.state?.from) ||
    getRoleDashboard(role)
  );

  const handleLogin = async (event) => {
    event?.preventDefault();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin đăng nhập.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);

      if (!user?.isVerified) {
        navigate('/verify-email');
        return;
      }

      navigate(resolveRedirect(user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (autofillEmail, autofillPassword = '123456789') => {
    setEmail(autofillEmail);
    setPassword(autofillPassword);
    setError('');
  };

  const handleGoogleLoginCallback = useCallback(
    async (response) => {
      try {
        setLoading(true);
        const idToken = response?.credential;
        if (!idToken) {
          setError('Google login failed to return credential.');
          return;
        }

        const user = await googleLogin(idToken);
        if (!user?.isVerified) {
          navigate('/verify-email');
          return;
        }

        const redirect = (
          getSafeInternalPath(searchParams.get('redirect')) ||
          getSafeInternalPath(location.state?.from) ||
          getRoleDashboard(user.role)
        );
        navigate(redirect, { replace: true });
      } catch (err) {
        setError(err.message || 'Google đăng nhập thất bại.');
      } finally {
        setLoading(false);
      }
    },
    [googleLogin, location.state, navigate, searchParams],
  );

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useGoogleIdentity(googleClientId, handleGoogleLoginCallback);

  const handleGoogleSignIn = () => {
    if (!googleClientId) {
      setError('Google login not configured.');
      return;
    }

    if (!window.google?.accounts?.id) {
      setError('Google SDK not loaded yet. Vui lòng thử lại.');
      return;
    }

    window.google.accounts.id.prompt();
  };

  const quickRoleAccess = SHOW_TEST_ROLE_ACCOUNTS ? (
    <aside
      className="auth-quick-access rounded-3xl border border-white/80 bg-white/76 p-4 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/65"
      aria-labelledby="test-role-accounts-title"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Kiểm thử giao diện
          </p>
          <h2 id="test-role-accounts-title" className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
            Đăng nhập nhanh theo role
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          Mật khẩu: 123456789
        </span>
      </div>

      {/*
        TEST-ONLY QUICK ROLE ACCOUNTS.
        This section is intentionally kept visible while the team validates UI flows
        for Administrator, System Staff, Interaction Manager and Service Operator.
        Do not remove or hide it without explicit team approval.
      */}
      <div className="auth-role-grid mt-4 grid grid-cols-2 gap-2.5">
        {TEST_ROLE_ACCOUNTS.map(({ label, description, email: accountEmail, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => handleAutofill(accountEmail)}
            className="auth-role-card group flex min-h-[62px] items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-900/75 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/60 dark:text-blue-300">
              <Icon size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-[11px] font-bold text-slate-800 dark:text-slate-100">
                {label}
              </strong>
              <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">
                {description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  ) : null;

  return (
    <AuthLayout quickAccess={quickRoleAccess}>
      <article className="auth-login-card relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-[0_24px_65px_rgba(15,23,42,0.13)] sm:p-8 dark:border-slate-700 dark:bg-slate-900">
        <svg
          className="pointer-events-none absolute right-0 top-0 h-36 w-60 text-blue-600"
          viewBox="0 0 240 144"
          fill="none"
          aria-hidden="true"
        >
          <path d="M20 98C72 61 111 118 164 72C193 47 212 41 252 48" stroke="currentColor" strokeWidth="1.2" className="opacity-[0.07]" />
          <path d="M34 116C83 82 121 128 176 89C202 70 222 67 254 73" stroke="currentColor" strokeWidth="1" strokeDasharray="5 8" className="opacity-[0.055]" />
          <circle cx="164" cy="72" r="5" className="fill-blue-500/10" />
          <circle cx="208" cy="48" r="7" className="fill-emerald-500/10" />
          <circle cx="208" cy="48" r="15" stroke="currentColor" className="opacity-[0.05]" />
        </svg>

        <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-blue-50/65 blur-2xl dark:bg-blue-950/20" aria-hidden="true" />
        <header className="relative z-10">
          <span className="auth-login-badge inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Lucide.LogIn size={14} aria-hidden="true" />
            Cổng tài khoản UrbanMind
          </span>
          <h1 id="auth-page-title" className="auth-login-title mt-5 text-[30px] font-bold leading-tight tracking-[-0.035em] text-slate-950 dark:text-white">
            Chào mừng bạn trở lại
          </h1>
          <p className="auth-login-description mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Đăng nhập để theo dõi phản ánh, cập nhật tiến độ và tham gia trao đổi cùng cộng đồng.
          </p>
        </header>

        <div className="auth-login-alerts relative z-10 mt-6 space-y-4">
          {sessionExpired && !error ? (
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-200">
              <Lucide.ClockAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</p>
            </div>
          ) : null}

          {error ? (
            <ErrorAlert
              title="Lỗi đăng nhập"
              message={error}
              onClose={() => setError('')}
            />
          ) : null}
        </div>

        <form onSubmit={handleLogin} className="auth-login-form relative z-10 mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Email hoặc số điện thoại
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400" aria-hidden="true">
                <Lucide.AtSign size={17} />
              </span>
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder="name@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400" aria-hidden="true">
                <Lucide.Lock size={17} />
              </span>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-2xl text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
              >
                {showPassword ? <Lucide.EyeOff size={17} aria-hidden="true" /> : <Lucide.Eye size={17} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm" aria-hidden="true" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                Đăng nhập
                <Lucide.ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="auth-login-divider relative z-10 my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Hoặc</span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="relative z-10 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          <GoogleLogo />
          Đăng nhập với Google
        </button>

        <p className="auth-login-register relative z-10 mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Bạn chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-blue-700 hover:underline dark:text-blue-300">
            Đăng ký ngay
          </Link>
        </p>
        {SHOW_TEST_ROLE_ACCOUNTS ? (
          <details className="relative z-10 mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 lg:hidden dark:border-slate-700 dark:bg-slate-950/60">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tài khoản mẫu để test role
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TEST_ROLE_ACCOUNTS.map(({ label, email: accountEmail }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAutofill(accountEmail)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Mật khẩu mặc định: 123456789</p>
          </details>
        ) : null}
      </article>
    </AuthLayout>
  );
};
