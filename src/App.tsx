import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './components/LoginPage'
import SignUpPage from './components/SignUpPage'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'

// Import existing components
import NotesView from './components/NotesView'
import AIChat from './components/AIChat'
import StudyDashboard from './components/StudyDashboard'
import StudyPlans from './components/StudyPlans'
import FileManager from './components/FileManager'
import ExamMode from './components/ExamMode'
import RemindersView from './components/RemindersView'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/notes" element={<NotesView />} />
              <Route path="/ai" element={<AIChat />} />
              <Route path="/progress" element={<StudyDashboard />} />
              <Route path="/plans" element={<StudyPlans />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/exam" element={<ExamMode />} />
              <Route path="/reminders" element={<RemindersView />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
