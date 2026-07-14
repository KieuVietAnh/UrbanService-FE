// src/pages/settings/SettingsPage.jsx
import { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';

const SUPPORTED_THEMES = ['corporate', 'dark'];

export const SettingsPage = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('urbanmind_theme') || document.documentElement.getAttribute('data-theme') || 'corporate';

    return SUPPORTED_THEMES.includes(savedTheme) ? savedTheme : 'corporate';
  });
  const [pushNotifs, setPushNotifs] = useState(() => {
    return localStorage.getItem('urbanmind_push_notifications') !== 'false';
  });
  const [emailNotifs, setEmailNotifs] = useState(() => {
    return localStorage.getItem('urbanmind_email_notifications') === 'true';
  });
  const [saveNotice, setSaveNotice] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('urbanmind_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!saveNotice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSaveNotice(null);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [saveNotice]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('urbanmind_theme', theme);
    localStorage.setItem('urbanmind_push_notifications', String(pushNotifs));
    localStorage.setItem('urbanmind_email_notifications', String(emailNotifs));

    setSaveNotice({
      type: 'success',
      title: 'Đã lưu cài đặt',
      description: 'Thiết lập giao diện và thông báo đã được cập nhật trên trình duyệt này.',
    });
  };

  const themeOptions = [
    {
      value: 'corporate',
      name: 'Sáng chuyên nghiệp',
      description: 'Nền sáng, dễ đọc, phù hợp thao tác quản trị ban ngày.',
      icon: Lucide.Sun,
      preview: 'from-blue-500 to-cyan-400',
    },
    {
      value: 'dark',
      name: 'Tối tập trung',
      description: 'Nền tối, giảm chói khi theo dõi dashboard trong thời gian dài.',
      icon: Lucide.Moon,
      preview: 'from-slate-800 to-slate-600',
    },
  ];

  const notificationOptions = [
    {
      id: 'push-notifications',
      title: 'Thông báo đẩy',
      description: 'Nhận cập nhật trạng thái phản ánh trực tiếp trên trình duyệt.',
      enabled: pushNotifs,
      onChange: setPushNotifs,
      icon: Lucide.BellRing,
    },
    {
      id: 'email-notifications',
      title: 'Email thông báo',
      description: 'Nhận email tóm tắt tiến độ xử lý và những thay đổi quan trọng.',
      enabled: emailNotifs,
      onChange: setEmailNotifs,
      icon: Lucide.Mail,
    },
  ];

  const activeTheme = themeOptions.find(item => item.value === theme) || themeOptions[0];
  const ActiveThemeIcon = activeTheme.icon;

  return (
    <div className="admin-page-shell space-y-6">
      <section className="admin-page-hero settings-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.Settings2 size={26} />
            </div>
            <div className="min-w-0">
              <h1 className="admin-hero-title">
                Cài đặt hệ thống
              </h1>
              <p className="admin-hero-description">
                Tùy biến giao diện và kênh nhận thông báo theo cách bạn vận hành UrbanMind hằng ngày.
              </p>
            </div>
          </div>

          <aside className="settings-active-theme-card shrink-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur" aria-label="Giao diện đang sử dụng">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <ActiveThemeIcon size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Đang sử dụng</p>
                <p className="mt-0.5 whitespace-nowrap text-sm font-semibold text-slate-950">{activeTheme.name}</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="admin-panel p-5">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <Lucide.Palette size={18} className="text-blue-600" />
                  Giao diện ứng dụng
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Chọn bộ giao diện phù hợp với môi trường làm việc. Hệ thống không thay đổi dữ liệu nghiệp vụ.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleThemeChange(option.value)}
                    className={`group rounded-3xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="mb-4 h-24 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-inner">
                      <div className={`h-full bg-gradient-to-br ${option.preview} p-3`}>
                        <div className="h-3 w-20 rounded-full bg-white/80" />
                        <div className="mt-6 grid grid-cols-3 gap-2">
                          <div className="h-10 rounded-xl bg-white/80" />
                          <div className="h-10 rounded-xl bg-white/60" />
                          <div className="h-10 rounded-xl bg-white/40" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow-sm'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-950">{option.name}</p>
                          {isActive && (
                            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="admin-panel p-5">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <Lucide.BellRing size={18} className="text-blue-600" />
                  Kênh nhận thông báo
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Bật hoặc tắt các kênh thông báo phục vụ quá trình theo dõi phản ánh đô thị.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {notificationOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                        <Icon size={18} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-slate-950">{option.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {option.description}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={option.enabled}
                      onChange={(e) => option.onChange(e.target.checked)}
                      className="checkbox checkbox-primary checkbox-sm mt-1"
                    />
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="admin-panel p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Lucide.Info size={19} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-950">Ghi chú cài đặt</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Những thiết lập này đang lưu cục bộ trên trình duyệt, chưa gọi API cấu hình tài khoản.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="admin-inset-panel p-4">
                <p className="text-xs font-semibold text-slate-800">Giao diện</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Áp dụng ngay sau khi chọn, không cần tải lại trang.</p>
              </div>
              <div className="admin-inset-panel p-4">
                <p className="text-xs font-semibold text-slate-800">Thông báo</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Lưu trạng thái bật/tắt để UI có thể dùng lại ở phiên sau.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">Trạng thái</p>
                <h3 className="mt-2 text-lg font-semibold">Sẵn sàng lưu</h3>
                <p className="mt-2 text-xs leading-5 text-white/60">
                  Kiểm tra lại lựa chọn rồi bấm lưu để đồng bộ trạng thái vào localStorage.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Lucide.Save size={18} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="btn mt-5 w-full rounded-2xl border-0 bg-white text-xs font-semibold normal-case text-slate-950 hover:bg-slate-100"
            >
              <Lucide.Save size={17} />
              Lưu cài đặt
            </button>
          </section>
        </aside>
      </section>

      {saveNotice && (
        <div className="toast toast-end toast-bottom z-50">
          <div className="alert border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xl">
            <Lucide.CheckCircle2 size={18} />
            <div>
              <p className="text-sm font-semibold">{saveNotice.title}</p>
              <p className="text-xs leading-5 text-emerald-700">{saveNotice.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
