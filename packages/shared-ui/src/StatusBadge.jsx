import React from 'react';

export default function StatusBadge({ status }) {
  const label = status || 'Unknown';
  const cls = {
    Submitted: 'badge badge-info',
    'AI Reviewed': 'badge badge-warning',
    Assigned: 'badge badge-primary',
    InProgress: 'badge badge-accent',
    Resolved: 'badge badge-success',
    Closed: 'badge badge-neutral'
  }[status] || 'badge';

  return <span className={`${cls} text-[10px] font-bold`}>{label}</span>;
}
