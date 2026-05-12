export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Signed delta for stock movements: +5 / -3 / 0
export function formatStockDelta(delta) {
  return delta > 0 ? `+${delta}` : `${delta}`
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

// Returns promotore display name from event object (user or contact agente)
export function getPromotoreName(event) {
  if (event?.promotore) return `${event.promotore.nome} ${event.promotore.cognome}`
  if (event?.promotore_agente) return `${event.promotore_agente.nome} ${event.promotore_agente.cognome}`
  return null
}

/**
 * Extracts Google Drive file ID from various Drive URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 * Returns null if not a Drive URL
 */
export function extractDriveFileId(url) {
  if (!url) return null
  // Pattern 1: /file/d/FILE_ID/
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  // Pattern 2: ?id=FILE_ID or &id=FILE_ID
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  // Pattern 3: lh3.googleusercontent.com/d/FILE_ID
  match = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return null
}

/**
 * Converts any Google Drive URL to a direct image URL.
 * If the URL is not a Drive URL, returns it unchanged (allows external URLs).
 * Returns null for empty/null input.
 */
export function toDriveImageUrl(url) {
  if (!url) return null
  const fileId = extractDriveFileId(url)
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`
  return url // non-Drive URL, use as-is
}
