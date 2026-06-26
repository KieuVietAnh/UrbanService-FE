// src/pages/management/SLAConfiguration.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { slaApi } from '../../services/api/slaApi';
import * as Lucide from 'lucide-react';

export const SLAConfiguration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Input states
  const [criticalHours, setCriticalHours] = useState('');
  const [highHours, setHighHours] = useState('');
  const [mediumHours, setMediumHours] = useState('');
  const [lowHours, setLowHours] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSla = async () => {
    setLoading(true);
    try {
      const res = await slaApi.getSlaConfig();
      setCriticalHours(res.Critical.hours);
      setHighHours(res.High.hours);
      setMediumHours(res.Medium.hours);
      setLowHours(res.Low.hours);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSla();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await slaApi.updateSlaConfig('Critical', criticalHours, user.userId);
      await slaApi.updateSlaConfig('High', highHours, user.userId);
      await slaApi.updateSlaConfig('Medium', mediumHours, user.userId);
      await slaApi.updateSlaConfig('Low', lowHours, user.userId);
      alert('Đã cập nhật cấu hình thời hạn SLA thành công!');
      fetchSla();
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const slaLevels = [
    {
      key: 'critical',
      label: 'Khẩn cấp',
      originalLabel: 'Critical',
      value: criticalHours,
      setValue: setCriticalHours,
      icon: Lucide.AlertCircle,
      tone: 'text-error',
      cardTone: 'border-error/15 bg-error/5',
      helper: 'Sự cố cần ưu tiên xử lý ngay.',
    },
    {
      key: 'high',
      label: 'Cao',
      originalLabel: 'High',
      value: highHours,
      setValue: setHighHours,
      icon: Lucide.AlertTriangle,
      tone: 'text-warning',
      cardTone: 'border-warning/20 bg-warning/5',
      helper: 'Vấn đề ảnh hưởng rõ tới khu vực.',
    },
    {
      key: 'medium',
      label: 'Trung bình',
      originalLabel: 'Medium',
      value: mediumHours,
      setValue: setMediumHours,
      icon: Lucide.Info,
      tone: 'text-info',
      cardTone: 'border-info/20 bg-info/5',
      helper: 'Phản ánh cần xử lý theo quy trình chuẩn.',
    },
    {
      key: 'low',
      label: 'Thấp',
      originalLabel: 'Low',
      value: lowHours,
      setValue: setLowHours,
      icon: Lucide.Compass,
      tone: 'text-base-content/50',
      cardTone: 'border-base-300 bg-base-200/40',
      helper: 'Vấn đề ít khẩn cấp, có thể xử lý theo lịch.',
    },
  ];

  const configuredLevels = slaLevels.filter(level => level.value !== '').length;
  const fastestLevel = slaLevels
    .filter(level => level.value !== '')
    .sort((a, b) => Number(a.value) - Number(b.value))[0];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-base-300 bg-base-100 shadow-sm">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-28 h-28 w-28 rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                <Lucide.Timer size={14} />
                Cấu hình SLA
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-base-content sm:text-3xl">
                  Cấu Hình Thời Hạn SLA
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-base-content/60">
                  Quy định thời gian xử lý cam kết cho từng mức độ ưu tiên, giúp hệ thống tự động tính hạn hoàn thành phản ánh.
                </p>
              </div>
            </div>

            <button
              type="submit"
              form="sla-configuration-form"
              className="btn btn-primary rounded-2xl px-5 text-xs font-black shadow-lg shadow-primary/20"
              disabled={saveLoading || loading}
            >
              {saveLoading ? <span className="loading loading-spinner loading-sm" /> : <Lucide.Save size={17} />}
              Lưu thay đổi
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Mức ưu tiên</p>
              <p className="mt-2 text-2xl font-black text-base-content">{configuredLevels}/4</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lucide.ListChecks size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Nhanh nhất</p>
              <p className="mt-2 text-2xl font-black text-base-content">
                {fastestLevel ? `${fastestLevel.value} giờ` : '--'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-error/10 text-error">
              <Lucide.Zap size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-base-content/40">Trạng thái</p>
              <p className="mt-2 text-sm font-black text-success">Sẵn sàng áp dụng</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/10 text-success">
              <Lucide.CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-base-300 bg-base-100 p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <form id="sla-configuration-form" onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {slaLevels.map((level) => {
                const Icon = level.icon;

                return (
                  <div key={level.key} className={`rounded-3xl border p-4 ${level.cardTone}`}>
                    <label className="mb-3 flex items-start justify-between gap-3">
                      <span>
                        <span className={`flex items-center gap-1.5 text-xs font-black ${level.tone}`}>
                          <Icon size={15} />
                          {level.label} ({level.originalLabel}) *
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold leading-5 text-base-content/50">
                          {level.helper}
                        </span>
                      </span>
                    </label>

                    <div className="join w-full">
                      <input
                        type="number"
                        value={level.value}
                        onChange={(e) => level.setValue(e.target.value)}
                        className="input input-bordered join-item w-full text-sm font-black"
                        min="0"
                        required
                      />
                      <span className="btn btn-neutral join-item text-xs font-black">Giờ</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="alert alert-info rounded-2xl text-[11px] font-semibold leading-5">
              <Lucide.Info size={16} />
              <span>Khi người dân gửi phản ánh mới, hạn xử lý tự động được tính dựa trên cấu hình giờ ở trên.</span>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
