export function EmptyState({ title, description, action }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="text-lg font-medium text-gray-900">{title}</p>
      {description && <p className="mt-2 text-base text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
