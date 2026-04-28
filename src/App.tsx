// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { BattleProvider } from './store/BattleContext'
import HomeScreen       from './screens/HomeScreen'
import BattleScreen     from './screens/BattleScreen'
import VSScreen         from './screens/VSScreen'
import TeamEditorScreen  from './screens/TeamEditorScreen'
import LandingScreen     from './screens/LandingScreen'
import PremiumScreen     from './screens/PremiumScreen'
import OneVsOneScreen    from './screens/OneVsOneScreen'
import TeamsScreen       from './screens/TeamsScreen'

function isOnboarded(): boolean {
  try { return localStorage.getItem('sd_onboarded') === '1' } catch { return true }
}

export default function App() {
  return (
    <AuthProvider>
    <BattleProvider>
      <div className="w-full max-w-[430px] h-full overflow-hidden relative">
        <Routes>
          <Route path="/landing"  element={<LandingScreen />} />
          <Route path="/premium"  element={<PremiumScreen />} />
          <Route path="/"         element={isOnboarded() ? <HomeScreen /> : <LandingScreen />} />
          <Route path="/battle"   element={<BattleScreen />} />
          <Route path="/vs"       element={<VSScreen />} />
          <Route path="/team"     element={<TeamEditorScreen />} />
          <Route path="/1v1"      element={<OneVsOneScreen />} />
          <Route path="/teams"    element={<TeamsScreen />} />
          <Route path="/en/*"     element={<LandingScreen />} />
          <Route path="/ja/*"     element={<LandingScreen />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BattleProvider>
    </AuthProvider>
  )
}
