// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { BattleProvider } from './store/BattleContext'
import HomeScreen       from './screens/HomeScreen'
import BattleScreen     from './screens/BattleScreen'
import VSScreen         from './screens/VSScreen'
import TeamEditorScreen  from './screens/TeamEditorScreen'
import PremiumScreen     from './screens/PremiumScreen'
import OneVsOneScreen    from './screens/OneVsOneScreen'
import TeamsScreen       from './screens/TeamsScreen'

export default function App() {
  return (
    <AuthProvider>
    <BattleProvider>
      <div className="w-full max-w-[430px] h-full overflow-hidden relative">
        <Routes>
          <Route path="/"         element={<HomeScreen />} />
          <Route path="/premium"  element={<PremiumScreen />} />
          <Route path="/battle"   element={<BattleScreen />} />
          <Route path="/vs"       element={<VSScreen />} />
          <Route path="/team"     element={<TeamEditorScreen />} />
          <Route path="/1v1"      element={<OneVsOneScreen />} />
          <Route path="/teams"    element={<TeamsScreen />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BattleProvider>
    </AuthProvider>
  )
}
