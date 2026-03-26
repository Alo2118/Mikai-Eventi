export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const currencyFormatterFull = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value) {
  if (value == null) return '—'
  return currencyFormatter.format(Number(value)) + ' €'
}

export function formatCurrencyDecimals(value) {
  if (value == null) return '—'
  return '€ ' + currencyFormatterFull.format(Number(value))
}

export function formatPercentage(value, decimals = 0) {
  if (value == null) return '—'
  return Number(value).toFixed(decimals) + '%'
}
