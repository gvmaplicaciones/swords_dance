// src/components/TypeBadge.tsx
// Icono cuadrado de tipo desde /assets/types/{type}.png
// size='icon' (default) = 24×24, solo imagen, sin texto ni fondo
// size='sm'  = 20×20 + texto pill pequeño (contextos con espacio)
// size='md'  = 24×24 + texto pill grande

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  type:  string
  size?: 'icon' | 'sm' | 'md'
}

const TYPE_COLORS: Record<string, string> = {
  normal:   'bg-[#a8a878]',
  fire:     'bg-[#f08030]',
  water:    'bg-[#6890f0]',
  electric: 'bg-[#f8d030] text-gray-800',
  grass:    'bg-[#78c850]',
  ice:      'bg-[#98d8d8] text-gray-800',
  fighting: 'bg-[#c03028]',
  poison:   'bg-[#a040a0]',
  ground:   'bg-[#e0c068] text-gray-800',
  flying:   'bg-[#a890f0]',
  psychic:  'bg-[#f85888]',
  bug:      'bg-[#a8b820]',
  rock:     'bg-[#b8a038]',
  ghost:    'bg-[#705898]',
  dragon:   'bg-[#7038f8]',
  dark:     'bg-[#705848]',
  steel:    'bg-[#b8b8d0] text-gray-800',
  fairy:    'bg-[#f0b6bc] text-gray-800',
}

export default function TypeBadge({ type, size = 'icon' }: Props) {
  const { t } = useTranslation()
  const [imgFailed, setImgFailed] = useState(false)

  const label = t(`types.${type}`, type)

  // ── Icon-only (default): 24×24 cuadrado, solo imagen ─────────────────────
  if (size === 'icon') {
    if (!imgFailed) {
      return (
        <img
          src={`/assets/types/${type}.png`}
          alt={label}
          title={label}
          width={24}
          height={24}
          onError={() => setImgFailed(true)}
          className="object-contain shrink-0"
          style={{ imageRendering: 'auto' }}
        />
      )
    }
    const colorClass = TYPE_COLORS[type] ?? 'bg-gray-500'
    return (
      <span className={`${colorClass} w-6 h-6 rounded text-[8px] font-bold text-white
                        flex items-center justify-center uppercase shrink-0`}>
        {type.slice(0, 2)}
      </span>
    )
  }

  // ── Pill: imagen + texto ──────────────────────────────────────────────────
  const sizeClass = size === 'md'
    ? 'h-6 px-2 text-xs gap-1.5'
    : 'h-5 px-1.5 text-[10px] gap-1'
  const imgSize = size === 'md' ? 16 : 14

  if (!imgFailed) {
    return (
      <span className={`inline-flex items-center ${sizeClass} rounded font-bold text-white
                        bg-bg-elevated border border-white/10 shrink-0 uppercase tracking-wide`}>
        <img
          src={`/assets/types/${type}.png`}
          alt=""
          width={imgSize}
          height={imgSize}
          onError={() => setImgFailed(true)}
          className="object-contain"
        />
        {label}
      </span>
    )
  }

  const colorClass = TYPE_COLORS[type] ?? 'bg-gray-500'
  const textSize   = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span className={`${colorClass} ${textSize} rounded font-bold text-white uppercase tracking-wide shrink-0`}>
      {label}
    </span>
  )
}
