import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './i18n/i18n.ts'

function isOnboarded(): boolean {
  try { return localStorage.getItem('sd_onboarded') === '1' } catch { return false }
}

const rootEl = document.getElementById('root')!
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

const path = window.location.pathname
const isLandingPath = path === '/' || path.startsWith('/en') || path.startsWith('/ja')
const canHydrate = rootEl.hasChildNodes() && isLandingPath && (path !== '/' || !isOnboarded())

if (canHydrate) {
  ReactDOM.hydrateRoot(rootEl, app)
} else {
  ReactDOM.createRoot(rootEl).render(app)
}
