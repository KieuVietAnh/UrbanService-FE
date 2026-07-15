// src/components/layout/Footer.jsx
import { Link } from 'react-router-dom';
import * as Lucide from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 shrink-0 text-base-content">
      <div className="w-full px-5 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex min-h-[72px] flex-col justify-center gap-3 border-t border-base-300 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Lucide.MapPinned size={17} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-base-content">
                UrbanMind
              </p>
              <p className="mt-0.5 truncate text-xs text-base-content/55">
                © {currentYear} Cổng phản ánh đô thị
              </p>
            </div>
          </div>

          <nav
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-base-content/55"
            aria-label="Liên kết hỗ trợ cuối trang"
          >
            <Link to="/tickets" className="transition-colors hover:text-primary">
              Phản ánh của tôi
            </Link>
            <Link to="/tickets/create" className="transition-colors hover:text-primary">
              Gửi phản ánh
            </Link>
            <Link to="/notifications" className="transition-colors hover:text-primary">
              Thông báo
            </Link>
            <a
              href="mailto:support@urbanmind.vn"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Lucide.LifeBuoy size={13} aria-hidden="true" />
              Trung tâm hỗ trợ
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
