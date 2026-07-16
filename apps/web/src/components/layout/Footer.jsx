// src/components/layout/Footer.jsx
import * as Lucide from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-2 shrink-0 text-base-content">
      <div className="w-full px-5 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex min-h-[64px] flex-col justify-center gap-3 border-t border-base-300 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Lucide.MapPinned size={15} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-base-content">
                UrbanMind
              </p>
              <p className="mt-0.5 truncate text-xs text-base-content/50">
                © {currentYear} Cổng phản ánh đô thị
              </p>
            </div>
          </div>

          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-base-content/50"
            aria-label="Thông tin pháp lý và hỗ trợ"
          >
            <a href="#privacy" className="transition-colors hover:text-primary">
              Chính sách riêng tư
            </a>
            <a href="#terms" className="transition-colors hover:text-primary">
              Điều khoản sử dụng
            </a>
            <a
              href="mailto:support@urbanmind.vn"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Lucide.LifeBuoy size={13} aria-hidden="true" />
              Hỗ trợ
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};
