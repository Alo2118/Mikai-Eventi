import { useState } from 'react'
import { Icon } from '../ui/Icon'
import { MAGAZZINO_ICONS } from '../../lib/icons'

const SIZE_CLASSES = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-lg',
  xl: 'w-28 h-28 text-xl',
}

const ICON_SIZE = { xs: 14, sm: 16, md: 20, lg: 28, xl: 36 }

function getInitials(product) {
  const brand = product?.brand?.nome || product?.product?.brand?.nome
  if (brand) return brand.slice(0, 2).toUpperCase()
  const nome = product?.nome || product?.product?.nome
  if (nome) {
    const words = nome.trim().split(/\s+/)
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
    return nome.slice(0, 2).toUpperCase()
  }
  return '??'
}

export function ProductThumb({ product, size = 'md', className = '' }) {
  const [errored, setErrored] = useState(false)
  const fotoUrl = product?.foto_url || product?.product?.foto_url
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md
  const baseClass = `inline-flex items-center justify-center shrink-0 rounded-lg overflow-hidden bg-gray-100 text-gray-500 font-semibold ${sizeClass} ${className}`

  if (fotoUrl && !errored) {
    return (
      <span className={baseClass}>
        <img
          src={fotoUrl}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      </span>
    )
  }

  // Fallback: iniziali brand/nome o icona
  const initials = getInitials(product)
  if (initials === '??') {
    return (
      <span className={baseClass} aria-hidden="true">
        <Icon icon={MAGAZZINO_ICONS.noPhoto} size={ICON_SIZE[size] || 20} />
      </span>
    )
  }

  return (
    <span className={baseClass} aria-hidden="true">
      {initials}
    </span>
  )
}
