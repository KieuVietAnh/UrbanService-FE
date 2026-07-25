export const SEVERITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];

export const getSeverityBadgeClasses = (severity = '') => {
  const normalized = `${severity || ''}`.trim().toLowerCase();

  if (normalized === 'critical') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (normalized === 'high') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'medium') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  if (normalized === 'low') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
};

export const normalizeAreaAlertRecord = (record = {}) => {
  const title = record?.title || record?.Title || 'Cảnh báo khu vực';
  const startAt = record?.startAt || record?.StartAt || record?.start_time || record?.startTime || '';
  const endAt = record?.endAt || record?.EndAt || record?.end_time || record?.endTime || '';
  const severity = record?.severity || record?.Severity || 'Medium';

  return {
    id: record?.id || record?.alertId || record?.areaAlertId || record?.alert_id || `${title}-${startAt || Date.now()}`,
    title,
    message: record?.message || record?.Message || record?.description || '',
    severity: severity || 'Medium',
    area: record?.area || record?.Area || '',
    areaName: record?.areaName || record?.AreaName || record?.area || '',
    category: record?.category || record?.Category || '',
    categoryName: record?.categoryName || record?.CategoryName || record?.category || '',
    hotspot: record?.hotspot || record?.Hotspot || '',
    latitude: record?.latitude ?? record?.Latitude ?? null,
    longitude: record?.longitude ?? record?.Longitude ?? null,
    radiusMeters: record?.radiusMeters ?? record?.radius_meters ?? record?.RadiusMeters ?? null,
    startAt,
    endAt,
    alertType: record?.alertType || record?.AlertType || record?.type || 'Area Alert',
    status: record?.status || record?.Status || 'Active',
    createdAt: record?.createdAt || record?.CreatedAt || null,
  };
};

export const validateAreaAlertForm = (values = {}) => {
  const errors = {};
  const area = `${values.area || ''}`.trim();
  const title = `${values.title || ''}`.trim();
  const message = `${values.message || ''}`.trim();
  const severity = `${values.severity || ''}`.trim();
  const startAt = `${values.startAt || ''}`.trim();

  if (!area) errors.area = 'Vui lòng chọn khu vực';
  if (!title) errors.title = 'Vui lòng nhập tiêu đề cảnh báo';
  if (!message) errors.message = 'Vui lòng nhập nội dung cảnh báo';
  if (!severity) errors.severity = 'Vui lòng chọn mức độ nghiêm trọng';
  if (!startAt) errors.startAt = 'Vui lòng chọn thời gian bắt đầu';

  return { isValid: Object.keys(errors).length === 0, errors };
};
