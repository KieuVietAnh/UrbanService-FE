// src/pages/management/IntegrationSettings.jsx
import { useEffect, useMemo, useState } from 'react';
import { toolsApi } from '@urbanmind/shared-api';
import { SuccessAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

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

const getIntegrationItems = (integrations) => ([
  {
    key: 'zalo',
    name: 'Zalo Mini App & OA',
    description: 'Tiếp nhận tin nhắn phản ánh từ Zalo OA và tạo phiếu kèm vị trí GPS tương ứng.',
    icon: 'Z',
    iconClassName: 'bg-blue-600 text-white',
    endpointLabel: 'Webhook URL',
    endpointValue: integrations?.zalo?.webhookUrl || 'Chưa cấu hình',
  },
  {
    key: 'messenger',
    name: 'Facebook Messenger Bot',
    description: 'Đồng bộ hội thoại để cư dân gửi định vị và hình ảnh trực tiếp qua Fanpage.',
    icon: Lucide.MessageCircle,
    iconClassName: 'bg-indigo-500 text-white',
    endpointLabel: 'API Endpoint',
    endpointValue: integrations?.messenger?.webhookUrl || 'Chưa cấu hình',
  },
  {
    key: 'hotline',
    name: 'Tổng đài Hotline đô thị',
    description: 'Ghi nhận cuộc gọi, chuyển hóa nội dung thành văn bản và hỗ trợ tạo phản ánh.',
    icon: Lucide.PhoneCall,
    iconClassName: 'bg-red-500 text-white',
    endpointLabel: 'Số điện thoại',
    endpointValue: integrations?.hotline?.phone || 'Chưa cấu hình',
  },
  {
    key: 'webform',
    name: 'Cổng thông tin Web Form',
    description: 'Đồng bộ biểu mẫu góp ý từ website chính quyền vào hệ thống UrbanMind.',
    icon: Lucide.Globe,
    iconClassName: 'bg-teal-500 text-white',
    endpointLabel: 'Tích hợp',
    endpointValue: 'Sẵn sàng kết nối qua Iframe API',
  },
]);

const StatCard = ({ label, value, description, icon: Icon, toneClass }) => (
  <div className="admin-stat-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export const IntegrationSettings = () => {
  const [integrations, setIntegrations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadIntegrations = async () => {
      setLoading(true);
      try {
        const integrationsResult = await toolsApi.getIntegrations();
        setIntegrations(integrationsResult || {});
      } catch (err) {
        console.warn('IntegrationSettings failed to load integrations', err);
        setIntegrations({});
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, []);

  const integrationItems = useMemo(() => getIntegrationItems(integrations), [integrations]);
  const enabledCount = useMemo(() => integrationItems.filter((item) => integrations?.[item.key]?.enabled).length, [integrationItems, integrations]);
  const configuredCount = useMemo(() => integrationItems.filter((item) => item.endpointValue !== 'Chưa cấu hình').length, [integrationItems]);

  const handleToggle = (key) => {
    const updated = { ...(integrations || {}) };
    const current = updated[key] || {};
    updated[key] = { ...current, enabled: !current.enabled };
    toolsApi.updateIntegrations(updated);
    setIntegrations(updated);
    setMessage({ type: 'success', text: 'Đã cập nhật cấu hình cổng tích hợp!' });
  };

  if (loading || !integrations) {
    return (
      <div className="admin-panel flex min-h-[360px] items-center justify-center py-20">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-blue-700" />
          <p className="mt-3 text-sm text-slate-500">Đang tải cấu hình tích hợp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-shell space-y-6">
      {message.type === 'success' && (
        <SuccessAlert message={message.text} onClose={() => setMessage({ type: '', text: '' })} />
      )}

      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.PlugZap size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="admin-hero-title">
                Cấu hình tích hợp đa kênh
              </h2>
              <p className="admin-hero-description">
                Quản lý kết nối tiếp nhận phản ánh từ Zalo, Messenger, hotline và biểu mẫu web trên cùng một màn hình.
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold text-slate-400">Trạng thái tổng quan</p>
            <div className="mt-1 flex items-center gap-2 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]" />
              <span className="text-sm font-semibold text-slate-950">{enabledCount}/{integrationItems.length} kênh đang bật</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Tổng kênh" value={integrationItems.length} description="Nguồn tiếp nhận có thể cấu hình." icon={Lucide.Share2} toneClass="bg-blue-50 text-blue-700" />
        <StatCard label="Đang bật" value={enabledCount} description="Kênh đang nhận dữ liệu." icon={Lucide.RadioTower} toneClass="bg-emerald-50 text-emerald-700" />
        <StatCard label="Đã cấu hình" value={configuredCount} description="Có endpoint hoặc thông tin kết nối." icon={Lucide.Settings2} toneClass="bg-blue-50 text-blue-700" />
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {integrationItems.map((item) => {
          const config = integrations[item.key] || {};
          const Icon = item.icon;
          const enabled = Boolean(config.enabled);
          const statusLabel = enabled ? getStatusLabel(config.status) : 'Đã tắt';

          return (
            <article key={item.key} className="flex min-h-[230px] flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${item.iconClassName}`}>
                      {typeof Icon === 'string' ? Icon : <Icon size={19} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-base font-semibold text-slate-950">{item.name}</h4>
                      <p className="mt-1 text-xs text-slate-400">
                        {enabled ? 'Kênh đang hoạt động' : 'Kênh đang tạm tắt'}
                      </p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleToggle(item.key)}
                    className="toggle toggle-primary toggle-sm shrink-0"
                    aria-label={`Bật tắt ${item.name}`}
                  />
                </div>

                <p className="text-sm leading-6 text-slate-500">{item.description}</p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-400">{item.endpointLabel}</span>
                  <span className="break-all font-mono text-xs font-semibold text-blue-700">{item.endpointValue}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <span className="text-slate-400">Trạng thái</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
