import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/notes" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            StudyBuddy
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Din personlige studiepartner med AI-drevet læring
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Kom i gang
            </Link>
            <Link
              to="/login"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-50 transition font-medium border-2 border-blue-600"
            >
              Logg inn
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold mb-2">Notater</h3>
            <p className="text-gray-600">
              Opprett, organiser og søk i notatene dine med kraftig AI-støtte
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold mb-2">AI-hjælp</h3>
            <p className="text-gray-600">
              Få hjelp til å forstå konsepter og forbedre læringen din
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Spor fremgang</h3>
            <p className="text-gray-600">
              Hold oversikt over studietiden og se din framgang over tid
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
