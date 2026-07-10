// src/pages/management/SLAConfiguration.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { slaApi } from '../../services/api/slaApi';
import { ErrorAlert, SuccessAlert } from '../../components/alerts/ErrorAlert';
import * as Lucide from 'lucide-react';

const buildSlaLevels = ({ criticalHours, highHours, mediumHours, lowHours, setCriticalHours, setHighHours, setMediumHours, setLowHours }) => ([
  {
    key: 'critical',
    label: 'Khẩn cấp',
    apiLevel: 'Critical',
    value: criticalHours,
    setValue: setCriticalHours,
    icon: Lucide.AlertCircle,
    toneClass: 'sla-priority-critical',
    helper: 'Sự cố cần ưu tiên xử lý ngay.',
  },
  {
    key: 'high',
    label: 'Cao',
    apiLevel: 'High',
    value: highHours,
    setValue: setHighHours,
    icon: Lucide.AlertTriangle,
    toneClass: 'sla-priority-high',
    helper: 'Vấn đề ảnh hưởng rõ tới khu vực.',
  },
  {
    key: 'medium',
    label: 'Trung bình',
    apiLevel: 'Medium',
    value: mediumHours,
    setValue: setMediumHours,
    icon: Lucide.Info,
    toneClass: 'sla-priority-medium',
    helper: 'Phản ánh xử lý theo quy trình chuẩn.',
  },
  {
    key: 'low',
    label: 'Thấp',
    apiLevel: 'Low',
    value: lowHours,
    setValue: setLowHours,
    icon: Lucide.Compass,
    toneClass: 'sla-priority-low',
    helper: 'Vấn đề ít khẩn cấp, xử lý theo lịch.',
  },
]);

const StatCard = ({ label, value, description, icon: Icon, toneClass }) => (
  <div className="admin-stat-card p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export const SLAConfiguration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [criticalHours, setCriticalHours] = useState('');
  const [highHours, setHighHours] = useState('');
  const [mediumHours, setMediumHours] = useState('');
  const [lowHours, setLowHours] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [pageMessage, setPageMessage] = useState({ type: '', text: '' });

  const fetchSla = useCallback(async () => {
    setLoading(true);
    try {
      const res = await slaApi.getSlaConfig();
      setCriticalHours(res?.Critical?.hours ?? '');
      setHighHours(res?.High?.hours ?? '');
      setMediumHours(res?.Medium?.hours ?? '');
      setLowHours(res?.Low?.hours ?? '');
    } catch (err) {
      console.error(err);
      setPageMessage({ type: 'error', text: 'Không thể tải cấu hình SLA.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSla();
  }, [fetchSla]);

  const slaLevels = useMemo(() => buildSlaLevels({
    criticalHours,
    highHours,
    mediumHours,
    lowHours,
    setCriticalHours,
    setHighHours,
    setMediumHours,
    setLowHours,
  }), [criticalHours, highHours, lowHours, mediumHours]);

  const configuredLevels = slaLevels.filter((level) => level.value !== '').length;
  const fastestLevel = useMemo(() => slaLevels
    .filter((level) => level.value !== '')
    .sort((a, b) => Number(a.value) - Number(b.value))[0], [slaLevels]);
  const totalHours = slaLevels.reduce((sum, level) => sum + (Number(level.value) || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await Promise.all(slaLevels.map((level) => slaApi.updateSlaConfig({
        level: level.apiLevel,
        hours: level.value,
        updatedBy: user?.userId,
      })));
      setPageMessage({ type: 'success', text: 'Đã cập nhật cấu hình thời hạn SLA thành công!' });
      fetchSla();
    } catch (err) {
      console.error(err);
      setPageMessage({ type: 'error', text: err?.message || 'Lỗi khi cập nhật cấu hình SLA.' });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="admin-page-shell space-y-6">
      {pageMessage.type === 'success' && (
        <SuccessAlert message={pageMessage.text} onClose={() => setPageMessage({ type: '', text: '' })} />
      )}
      {pageMessage.type === 'error' && (
        <ErrorAlert message={pageMessage.text} onClose={() => setPageMessage({ type: '', text: '' })} />
      )}

      <section className="admin-page-hero">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-32 h-44 w-44 rounded-full bg-cyan-100/50 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="admin-hero-icon">
              <Lucide.Timer size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="admin-hero-title">
                Cấu hình thời hạn SLA
              </h2>
              <p className="admin-hero-description">
                Quy định thời gian xử lý cam kết cho từng mức ưu tiên để hệ thống tự động tính hạn hoàn thành phản ánh.
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="sla-configuration-form"
            className="admin-primary-action btn rounded-xl border-0 px-5 text-sm font-semibold"
            disabled={saveLoading || loading}
          >
            {saveLoading ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={17} />}
            Lưu thay đổi
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Mức đã cấu hình" value={`${configuredLevels}/4`} description="Đang có thời hạn xử lý." icon={Lucide.ListChecks} toneClass="bg-blue-50 text-blue-700" />
        <StatCard label="Nhanh nhất" value={fastestLevel ? `${fastestLevel.value} giờ` : '--'} description={fastestLevel ? `Áp dụng cho mức ${fastestLevel.label}.` : 'Chưa có dữ liệu.'} icon={Lucide.Zap} toneClass="bg-rose-50 text-rose-700" />
        <StatCard label="Tổng khung giờ" value={totalHours ? `${totalHours} giờ` : '--'} description="Tổng thời hạn của 4 mức SLA." icon={Lucide.Clock3} toneClass="bg-emerald-50 text-emerald-700" />
      </section>

      <section className="admin-panel p-5 sm:p-6">
        <div className="mb-5">
          <h3 className="admin-section-title">Thiết lập theo mức ưu tiên</h3>
          <p className="admin-section-description">
            Nhập số giờ xử lý tối đa cho từng mức độ. Các thay đổi sẽ được áp dụng cho phản ánh mới sau khi lưu.
          </p>
        </div>

        {loading ? (
          <div className="admin-empty-panel flex min-h-[260px] items-center justify-center">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-blue-700" />
              <p className="mt-3 text-sm text-slate-500">Đang tải cấu hình SLA...</p>
            </div>
          </div>
        ) : (
          <form id="sla-configuration-form" onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {slaLevels.map((level) => {
                const Icon = level.icon;

                return (
                  <div key={level.key} className={`sla-priority-card ${level.toneClass}`}>
                    <label className="mb-4 flex items-start gap-3">
                      <div className="sla-priority-icon mt-0.5">
                        <Icon size={18} />
                      </div>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-950">{level.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {level.helper}
                        </span>
                      </span>
                    </label>

                    <div className="sla-input-group">
                      <input
                        type="number"
                        value={level.value}
                        onChange={(e) => level.setValue(e.target.value)}
                        className="sla-hours-input"
                        min="0"
                        placeholder="Nhập số giờ"
                        required
                      />
                      <span className="sla-hours-suffix">Giờ</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="admin-info-note p-4 text-sm leading-6">
              <div className="flex items-start gap-3">
                <Lucide.Info size={18} className="mt-0.5 shrink-0 text-blue-700" />
                <span>Khi người dân gửi phản ánh mới, hạn xử lý sẽ được tính tự động dựa trên cấu hình giờ ở trên.</span>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
