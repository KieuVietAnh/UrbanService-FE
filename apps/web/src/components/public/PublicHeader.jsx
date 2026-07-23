import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const CREATE_FEEDBACK_URL = '/login?redirect=/tickets/create&intent=create-feedback';
const MY_FEEDBACKS_URL = '/login?redirect=/tickets&intent=my-feedbacks';

const navigationItems = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Bảng tin', to: '/community/feed' },
  { label: 'Bản đồ sự cố', to: '/community/map' },
];

const NavigationItem = ({ item, className }) => (
  <Link to={item.to} className={className}>{item.label}</Link>
);

export const PublicHeader = () => {
  const { theme, toggle } = useTheme();

  return (
    <header className="public-header sticky top-0 z-[2000] w-full border-b shadow-[0_8px_30px_rgba(15,23,42,0.055)] backdrop-blur-xl">
      <nav
        className="public-wide-content flex h-[72px] w-full items-center justify-between gap-5 px-5 sm:px-7 lg:px-10 2xl:px-14"
        aria-label="Điều hướng công khai"
      >
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          aria-label="UrbanMind - Trang chủ"
        >
          <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.26)]">
            <Lucide.MapPinned size={20} aria-hidden="true" />
            <span className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-white/15" aria-hidden="true" />
          </span>
          <span>
            <strong className="public-header-brand-title block text-[18px] font-bold leading-none tracking-[-0.025em]">
              UrbanMind
            </strong>
            <span className="public-header-brand-subtitle mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.14em] sm:block">
              Cổng thông tin đô thị
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navigationItems.map((item) => (
            <li key={item.to}>
              <NavigationItem
                item={item}
                className="public-nav-link inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/25"
              />
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            type="button"
            onClick={toggle}
            className="public-theme-button inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
          >
            {theme === 'dark' ? <Lucide.Sun size={17} aria-hidden="true" /> : <Lucide.Moon size={17} aria-hidden="true" />}
          </button>
          <Link
            to={MY_FEEDBACKS_URL}
            className="public-account-link inline-flex h-10 items-center rounded-xl px-3.5 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-700"
          >
            Phản ánh của tôi
          </Link>
          <Link
            to="/login"
            className="public-login-button inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            Đăng nhập
          </Link>
          <Link
            to={CREATE_FEEDBACK_URL}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Lucide.Plus size={16} aria-hidden="true" />
            Gửi phản ánh
          </Link>
        </div>

        <details className="dropdown dropdown-end lg:hidden">
          <summary
            className="public-mobile-menu-button flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
            aria-label="Mở menu"
          >
            <Lucide.Menu size={19} aria-hidden="true" />
          </summary>

          <div className="dropdown-content z-[80] mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_22px_55px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950">
            <ul className="space-y-1" aria-label="Điều hướng trên thiết bị di động">
              {navigationItems.map((item) => (
                <li key={item.to}>
                  <NavigationItem
                    item={item}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  />
                </li>
              ))}
              <li>
                <Link
                  to={MY_FEEDBACKS_URL}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Phản ánh của tôi
                </Link>
              </li>
            </ul>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={toggle}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              >
                {theme === 'dark' ? <Lucide.Sun size={17} /> : <Lucide.Moon size={17} />}
              </button>
              <Link
                to="/login"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Đăng nhập
              </Link>
              <Link
                to={CREATE_FEEDBACK_URL}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white"
              >
                Gửi phản ánh
              </Link>
            </div>
          </div>
        </details>
      </nav>
      <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" aria-hidden="true" />
    </header>
  );
};

export default PublicHeader;
