import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './i18n/i18n.ts'


const rootEl = document.getElementById('root')!
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

const path = window.location.pathname
const isLandingPath = path.startsWith('/en') || path.startsWith('/ja')
const canHydrate = rootEl.hasChildNodes() && isLandingPath

if (canHydrate) {
  ReactDOM.hydrateRoot(rootEl, app)
} else {
  ReactDOM.createRoot(rootEl).render(app)
}
