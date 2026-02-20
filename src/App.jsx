import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppShell from './layouts/AppShell'
import SignInPage from './pages/auth/SignInPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyDetailsPage from './pages/auth/VerifyDetailsPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'
import LandingPage from './pages/LandingPage'
import ChatAnalysisPage from './pages/ChatAnalysisPage'
import DashboardPage from './pages/DashboardPage'
import AnalysesPage from './pages/AnalysesPage'
import BotPage from './pages/BotPage'
import ProfilePage from './pages/ProfilePage'
import VibeCheckPage from './pages/VibeCheckPage'
import VibeMatchPage from './pages/VibeMatchPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/signin" element={<SignInPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/verify" element={<VerifyDetailsPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

        <Route
          path="/chat-analysis"
          element={
            <ProtectedRoute>
              <ChatAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyses"
          element={
            <ProtectedRoute>
              <AnalysesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/love-guru"
          element={
            <ProtectedRoute>
              <BotPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vibe-check"
          element={
            <ProtectedRoute>
              <VibeCheckPage />
            </ProtectedRoute>
          }
        />
        <Route path="/vibe-match" element={<VibeMatchPage />} />
        <Route path="/bot" element={<Navigate to="/love-guru" replace />} />

        <Route path="/upload" element={<Navigate to="/chat-analysis" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
