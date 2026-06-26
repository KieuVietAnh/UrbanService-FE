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
      name: 'Corporate',
      description: 'Giao diện sáng, rõ ràng, phù hợp môi trường quản trị.',
      icon: Lucide.Sun,
    },
    {
      value: 'dark',
      name: 'Dark mode',
      description: 'Giao diện tối, giảm chói khi làm việc lâu.',
      icon: Lucide.Moon,
    },
  ];

  const notificationOptions = [
    {
      id: 'push-notifications',
      title: 'Thông báo đẩy',
      description: 'Nhận cập nhật trạng thái sự cố trực tiếp trên trình duyệt.',
      enabled: pushNotifs,
      onChange: setPushNotifs,
      icon: Lucide.BellRing,
    },
    {
      id: 'email-notifications',
      title: 'Email thông báo',
      description: 'Gửi email định kỳ tóm tắt tiến trình xử lý sự cố.',
      enabled: emailNotifs,
      onChange: setEmailNotifs,
      icon: Lucide.Mail,
    },
  ];

  const activeTheme = themeOptions.find(item => item.value === theme) || themeOptions[0];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.Settings2 size={14} />
                Cấu hình cá nhân
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Cài đặt hệ thống
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Tùy biến giao diện, kênh nhận thông báo và các thiết lập hiển thị phù hợp với cách bạn vận hành UrbanMind.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-base-content/40">
                Giao diện hiện tại
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-primary">
                <activeTheme.icon size={16} />
                {activeTheme.name}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4 border-b border-base-300 pb-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-black text-base-content">
                <Lucide.Palette size={17} className="text-primary" />
                Giao diện ứng dụng
              </h3>
              <p className="mt-1 text-xs font-medium leading-5 text-base-content/55">
                Chọn bộ màu đang được hệ thống hỗ trợ. Thiết lập sẽ được lưu trên trình duyệt hiện tại.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleThemeChange(option.value)}
                  className={`group rounded-2xl border p-4 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                      : 'border-base-300 bg-base-200/70 hover:border-primary/40 hover:bg-base-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-primary text-primary-content' : 'bg-base-100 text-primary'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-base-content">{option.name}</p>
                        {isActive && (
                          <span className="badge badge-primary badge-sm font-bold">Đang chọn</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium leading-5 text-base-content/55">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-base-content">
            <Lucide.Info size={17} className="text-primary" />
            Ghi chú cài đặt
          </h3>
          <div className="mt-4 space-y-3 text-xs font-medium leading-5 text-base-content/60">
            <div className="rounded-2xl bg-base-200/70 p-4">
              Các thay đổi giao diện được áp dụng ngay trên thiết bị hiện tại.
            </div>
            <div className="rounded-2xl bg-base-200/70 p-4">
              Cài đặt thông báo được lưu trên trình duyệt hiện tại, chưa thay đổi luồng API hiện có.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-base-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black text-base-content">
              <Lucide.BellRing size={17} className="text-primary" />
              Kênh nhận thông báo
            </h3>
            <p className="mt-1 text-xs font-medium leading-5 text-base-content/55">
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
                className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-base-300 bg-base-200/70 p-4 transition-colors hover:border-primary/30 hover:bg-base-100"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>
                  <div>
                    <span className="block text-sm font-black text-base-content">{option.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-base-content/55">
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveSettings}
          className="btn btn-primary rounded-2xl px-6 text-xs font-black shadow-lg shadow-primary/20"
        >
          <Lucide.Save size={17} />
          Lưu cài đặt
        </button>
      </div>

      {saveNotice && (
        <div className="toast toast-end toast-bottom z-50">
          <div className="alert border border-success/20 bg-success text-success-content shadow-xl">
            <Lucide.CheckCircle2 size={18} />
            <div>
              <p className="text-sm font-black">{saveNotice.title}</p>
              <p className="text-xs font-semibold opacity-85">{saveNotice.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
