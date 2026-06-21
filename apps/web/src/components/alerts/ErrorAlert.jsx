// src/components/alerts/ErrorAlert.jsx
import * as Lucide from 'lucide-react';

export const ErrorAlert = ({ message, title = 'Lỗi', onClose, icon = true }) => {
  return (
    <div className="alert alert-error rounded-xl shadow-lg flex items-start gap-3">
      {icon && <Lucide.AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1">
        {title && <h4 className="font-bold text-sm">{title}</h4>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <Lucide.X size={16} />
        </button>
      )}
    </div>
  );
};

export const WarningAlert = ({ message, title = 'Cảnh báo', onClose, icon = true }) => {
  return (
    <div className="alert alert-warning rounded-xl shadow-lg flex items-start gap-3">
      {icon && <Lucide.AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1">
        {title && <h4 className="font-bold text-sm">{title}</h4>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <Lucide.X size={16} />
        </button>
      )}
    </div>
  );
};

export const InfoAlert = ({ message, title = 'Thông tin', onClose, icon = true }) => {
  return (
    <div className="alert alert-info rounded-xl shadow-lg flex items-start gap-3">
      {icon && <Lucide.Info size={20} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1">
        {title && <h4 className="font-bold text-sm">{title}</h4>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <Lucide.X size={16} />
        </button>
      )}
    </div>
  );
};

export const SuccessAlert = ({ message, title = 'Thành công', onClose, icon = true }) => {
  return (
    <div className="alert alert-success rounded-xl shadow-lg flex items-start gap-3">
      {icon && <Lucide.Check size={20} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1">
        {title && <h4 className="font-bold text-sm">{title}</h4>}
        <p className="text-xs leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <Lucide.X size={16} />
        </button>
      )}
    </div>
  );
};
