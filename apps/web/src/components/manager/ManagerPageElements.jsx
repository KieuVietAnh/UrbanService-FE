import * as Lucide from 'lucide-react';

export const ManagerPageHeader = ({
  title,
  description,
  icon: Icon = Lucide.Activity,
  actions,
  statusLabel,
  statusValue,
}) => (
  <header className="admin-page-hero manager-page-header">
    <section className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <span className="admin-hero-icon" aria-hidden="true">
          <Icon size={26} />
        </span>
        <div className="min-w-0">
          <h1 className="admin-hero-title">{title}</h1>
          {description ? <p className="admin-hero-description">{description}</p> : null}
        </div>
      </div>

      {actions || statusLabel || statusValue ? (
        <aside className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          {statusLabel || statusValue ? (
            <dl className="manager-header-status">
              {statusLabel ? <dt>{statusLabel}</dt> : null}
              {statusValue ? <dd>{statusValue}</dd> : null}
            </dl>
          ) : null}
          {actions}
        </aside>
      ) : null}
    </section>
  </header>
);

export const ManagerMetricCard = ({ label, value, description, icon: Icon = Lucide.Activity, toneClass = 'bg-blue-50 text-blue-700' }) => (
  <article className="admin-stat-card p-5">
    <header className="flex items-start justify-between gap-4">
      <dl>
        <dt className="text-xs font-semibold text-slate-400">{label}</dt>
        <dd className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</dd>
        {description ? <dd className="mt-1 text-xs leading-5 text-slate-500">{description}</dd> : null}
      </dl>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`} aria-hidden="true">
        <Icon size={20} />
      </span>
    </header>
  </article>
);

export const ManagerSectionHeader = ({ id, title, description, icon: Icon, actions }) => (
  <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <span className="admin-mini-icon" aria-hidden="true">
          <Icon size={17} />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 id={id} className="admin-section-title">{title}</h2>
        {description ? <p className="admin-section-description mt-1">{description}</p> : null}
      </div>
    </div>
    {actions ? <aside className="shrink-0">{actions}</aside> : null}
  </header>
);

export const ManagerEmptyState = ({ icon: Icon = Lucide.Inbox, title, description, action }) => (
  <section className="admin-empty-panel m-5 flex flex-col items-center justify-center px-6 py-14 text-center sm:m-6">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700" aria-hidden="true">
      <Icon size={24} />
    </span>
    <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
    {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
    {action ? <footer className="mt-5">{action}</footer> : null}
  </section>
);
