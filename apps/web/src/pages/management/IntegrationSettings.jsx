// src/pages/management/IntegrationSettings.jsx
import { useState, useEffect } from 'react';
import { toolsApi } from '@urbanmind/shared-api';
import * as Lucide from 'lucide-react';

export const IntegrationSettings = () => {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read from shared tools API
    setIntegrations(toolsApi.getIntegrations());
    setLoading(false);
  }, []);

  const handleToggle = (key) => {
    const updated = { ...integrations };
    updated[key].enabled = !updated[key].enabled;
    toolsApi.updateIntegrations(updated);
    setIntegrations(updated);
    alert('Đã cập nhật cấu hình cổng tích hợp!');
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      Active: 'Đang bật',
      Connected: 'Đã kết nối',
      Ready: 'Sẵn sàng',
      Disabled: 'Đã tắt',
      Inactive: 'Tạm ngưng',
    };

    return statusMap[status] || status || 'Chưa rõ';
  };

  if (loading || !integrations) {
    return (
      <div className="flex justify-center rounded-[2rem] border border-base-300 bg-base-100 py-20 shadow-sm">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const integrationItems = [
    {
      key: 'zalo',
      name: 'Zalo Mini App & OA',
      description: 'Tự động bắt tin nhắn báo lỗi của người dân qua Zalo OA và tạo phiếu phản ánh GPS tương ứng.',
      icon: 'Z',
      iconClassName: 'bg-blue-600 text-white',
      endpointLabel: 'Webhook URL',
      endpointValue: integrations.zalo.webhookUrl,
    },
    {
      key: 'messenger',
      name: 'Facebook Messenger Bot',
      description: 'Đồng bộ hội thoại, cho phép cư dân gửi định vị và ảnh chụp trực tiếp qua Chatbot Fanpage.',
      icon: Lucide.MessageCircle,
      iconClassName: 'bg-indigo-500 text-white',
      endpointLabel: 'API Endpoint',
      endpointValue: integrations.messenger.webhookUrl,
    },
    {
      key: 'hotline',
      name: 'Tổng Đài Hotline Đô Thị',
      description: 'Nhận diện cuộc gọi ghi âm, sử dụng mô hình Speech-to-Text để chuyển hóa ý kiến thành văn bản.',
      icon: Lucide.PhoneCall,
      iconClassName: 'bg-red-500 text-white',
      endpointLabel: 'Số điện thoại',
      endpointValue: integrations.hotline.phone,
    },
    {
      key: 'webform',
      name: 'Cổng Thông Tin Web Form',
      description: 'Tích hợp form gửi ý kiến trên website chính quyền thành phố, đồng bộ trường dữ liệu UrbanMind.',
      icon: Lucide.Globe,
      iconClassName: 'bg-teal-500 text-white',
      endpointLabel: 'Tích hợp',
      endpointValue: 'Sẵn sàng kết nối qua Iframe API',
    },
  ];

  const enabledCount = integrationItems.filter(item => integrations[item.key].enabled).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.PlugZap size={14} />
                Cổng tích hợp
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Cấu Hình Tích Hợp Đa Kênh
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Quản lý kết nối tiếp nhận phản ánh từ Zalo, Messenger, hotline và biểu mẫu web trong cùng một khu vực cấu hình.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Đang bật</p>
              <div className="mt-1 flex items-end gap-1 text-base-content">
                <span className="text-2xl font-black">{enabledCount}</span>
                <span className="pb-1 text-xs font-bold text-base-content/45">/ {integrationItems.length} kênh</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {integrationItems.map((item) => {
          const config = integrations[item.key];
          const Icon = item.icon;
          const statusLabel = config.enabled ? getStatusLabel(config.status) : 'Đã tắt';

          return (
            <div key={item.key} className="flex min-h-[220px] flex-col justify-between rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${item.iconClassName}`}>
                      {typeof Icon === 'string' ? Icon : <Icon size={18} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-extrabold text-base-content">{item.name}</h4>
                      <p className="mt-1 text-[11px] font-bold text-base-content/40">
                        {config.enabled ? 'Kênh đang hoạt động' : 'Kênh đang tạm tắt'}
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={() => handleToggle(item.key)}
                    className="toggle toggle-primary toggle-sm shrink-0"
                  />
                </div>

                <p className="text-xs font-semibold leading-6 text-base-content/55">{item.description}</p>
              </div>

              <div className="mt-5 rounded-2xl border border-base-300 bg-base-200/60 p-3 text-[10px] font-bold text-base-content/45">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span>{item.endpointLabel}</span>
                  <span className="break-all font-mono text-primary">{item.endpointValue}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span>Trạng thái</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${config.enabled ? 'bg-success/10 text-success' : 'bg-base-300 text-base-content/45'}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
