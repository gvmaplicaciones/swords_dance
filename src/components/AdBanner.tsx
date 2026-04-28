// src/components/AdBanner.tsx
// Placeholder for Google Ad Manager banner (320×50 mobile banner)
// Replace the div contents with actual GAM ad code when ready

interface Props {
  slot?: string  // GAM ad slot ID
  className?: string
}

export default function AdBanner({ className = '' }: Props) {
  // In production, replace this with actual Google Ad Manager tag:
  // <div id="div-gpt-ad-XXXXX-0"> ... </div>
  return (
    <div className={`flex items-center justify-center bg-bg-elevated/40 border border-bg-elevated
                     rounded-lg overflow-hidden shrink-0 ${className}`}
         style={{ minHeight: 50, maxHeight: 60 }}>
      <span className="text-text-muted text-[10px] font-mono tracking-wide select-none">
        publicidad
      </span>
    </div>
  )
}
