// scanner-overlay.jsx — v6 native camera
// Usa input[capture="environment"] para abrir la cámara nativa del móvil.
// Sin getUserMedia, sin visor en vivo — máxima calidad HDR nativa.
// onCapture(base64: string) — JPEG puro, sin prefijo data:...

import { useRef } from "react"

export default function ScannerOverlay({ onCapture }) {
  const fileInputRef = useRef(null)

  function handleImageCapture(event) {
    const file = event.target.files?.[0]
    if (!file) return

    // Limpiar el input para que onChange dispare aunque se elija la misma foto
    event.target.value = ""

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataURL = e.target.result
      if (typeof dataURL !== "string") return
      const base64 = dataURL.split(",")[1]
      if (!base64 || base64.length === 0) {
        console.error("[Scanner] base64 vacío tras leer el archivo")
        return
      }
      console.log(`[Scanner] Imagen leída: ${file.name} — base64 ${base64.length} chars`)
      onCapture?.(base64)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100dvh", padding: "32px 24px",
      background: "#0a1628", gap: 40,
      fontFamily: "system-ui, sans-serif",
    }}>

      {/* Logo */}
      <div style={{ textAlign: "center" }}>
        <img
          src="/swordsdance-logo.png"
          alt="SwordsDance"
          style={{ width: 80, height: 80, marginBottom: 16, opacity: 0.9 }}
          onError={(e) => { e.target.style.display = "none" }}
        />
        <div style={{ color: "#00d4ff", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>
          SwordsDance
        </div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>
          Escáner de equipo rival
        </div>
      </div>

      {/* Input nativo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleImageCapture}
      />

      {/* Botón principal */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "20px 40px",
            background: "transparent",
            border: "2px solid #00d4ff",
            borderRadius: 20,
            color: "#00d4ff",
            fontSize: 18, fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(0,212,255,0.2)",
            minWidth: 260,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 24 }}>📷</span>
          Escanear equipo rival
        </button>

        <p style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 13, textAlign: "center",
          lineHeight: 1.6, maxWidth: 280,
          margin: 0,
        }}>
          Enfoca el equipo rival completo y haz la foto
        </p>
      </div>

    </div>
  )
}
