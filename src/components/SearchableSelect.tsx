// src/components/SearchableSelect.tsx
// Selector con búsqueda — dropdown flotante (position:absolute), no empuja contenido.
// Tap targets mínimo 56px. Modo oscuro siempre.

import { useState, useRef, useEffect, useCallback } from 'react'

export interface SelectOption {
  value:     string
  label:     string         // texto principal
  sublabel?: string         // texto secundario (potencia, descripción...)
  icon?:     React.ReactNode  // sprite, badge de tipo, etc.
}

interface Props {
  options:      SelectOption[]
  value:        string
  onChange:     (value: string, option: SelectOption) => void
  placeholder?: string
  emptyLabel?:  string      // texto del trigger cuando está vacío
  onSearch?:    (q: string) => SelectOption[]  // para búsqueda dinámica (override options)
  renderTrigger?: (opt: SelectOption | null) => React.ReactNode
  className?:   string
  disabled?:    boolean
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  emptyLabel  = 'Sin seleccionar',
  onSearch,
  renderTrigger,
  className = '',
  disabled = false,
}: Props) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  const selectedOpt = options.find(o => o.value === value) ?? null

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Enfocar input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filteredOptions = useCallback((): SelectOption[] => {
    if (onSearch) return onSearch(query)
    if (!query.trim()) return options.slice(0, 40)
    const lower = query.toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(lower) ||
      o.sublabel?.toLowerCase().includes(lower) ||
      o.value.toLowerCase().includes(lower)
    ).slice(0, 40)
  }, [query, options, onSearch])

  function handleSelect(opt: SelectOption) {
    onChange(opt.value, opt)
    setOpen(false)
    setQuery('')
  }

  function handleToggle() {
    if (disabled) return
    setOpen(prev => !prev)
    if (!open) setQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-4 rounded-xl border min-h-[56px]
                    bg-bg-elevated text-left transition-colors
                    ${open ? 'border-cyan-bright' : 'border-bg-highlight'}
                    ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:border-cyan-bright'}`}
      >
        {renderTrigger ? (
          renderTrigger(selectedOpt)
        ) : selectedOpt ? (
          <>
            {selectedOpt.icon && <span className="shrink-0">{selectedOpt.icon}</span>}
            <span className="flex-1 min-w-0">
              <span className="block text-text-primary text-sm font-semibold truncate">{selectedOpt.label}</span>
              {selectedOpt.sublabel && (
                <span className="block text-text-muted text-xs truncate">{selectedOpt.sublabel}</span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 text-text-muted text-sm">{emptyLabel}</span>
        )}
        <span className={`text-text-muted text-xs shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Dropdown flotante */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50
                        bg-bg-elevated border border-cyan-bright/40 rounded-xl
                        shadow-lg shadow-black/40 overflow-hidden"
             style={{ maxHeight: '260px' }}>
          {/* Búsqueda */}
          <div className="p-2 border-b border-bg-highlight sticky top-0 bg-bg-elevated z-10">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-bg-secondary border border-bg-highlight rounded-lg
                         px-3 py-2 text-text-primary text-sm placeholder-text-muted
                         focus:outline-none focus:border-cyan-bright"
            />
          </div>

          {/* Lista */}
          <div className="overflow-y-auto" style={{ maxHeight: '196px' }}>
            {filteredOptions().length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">
                {query.trim() ? 'Sin resultados' : 'Escribe para buscar...'}
              </p>
            ) : (
              filteredOptions().map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                              border-b border-bg-highlight/30 last:border-0
                              transition-colors active:bg-bg-highlight min-h-[48px]
                              ${opt.value === value ? 'bg-cyan-dark/20' : 'hover:bg-bg-secondary'}`}
                >
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold truncate
                      ${opt.value === value ? 'text-cyan-bright' : 'text-text-primary'}`}>
                      {opt.label}
                    </span>
                    {opt.sublabel && (
                      <span className="block text-text-muted text-xs truncate">{opt.sublabel}</span>
                    )}
                  </span>
                  {opt.value === value && <span className="text-cyan-bright text-xs shrink-0">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
