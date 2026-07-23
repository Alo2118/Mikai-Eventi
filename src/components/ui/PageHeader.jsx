export function PageHeader({ title, subtitle, actions, mobileHidden = false }) {
  return (
    <div className={'px-6 py-5 md:px-8' + (mobileHidden ? ' hidden md:block' : '')}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-base text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  )
}
