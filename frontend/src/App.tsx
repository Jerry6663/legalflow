import { Component, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Review from './pages/Review'
import Rules from './pages/Rules'
import Pricing from './pages/Pricing'
import History from './pages/History'
import Login from './pages/Login'
import { getToken, getMe } from './lib/api'

// ===== Error Boundary =====
interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || '未知错误' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">页面出错了</h1>
            <p className="text-gray-600 mb-4">{this.state.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, message: '' })
                window.location.reload()
              }}
              className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#1e40af] transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ===== Home Redirect =====
function HomeRoute() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setChecking(false)
      return
    }
    getMe()
      .then(() => navigate('/review', { replace: true }))
      .catch(() => setChecking(false))
  }, [navigate])

  useEffect(() => {
    document.title = 'LegalFlow - AI合同审查平台'
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e3a5f]" />
      </div>
    )
  }

  return <Home />
}

// ===== Page Title Wrappers =====
function ReviewPage() {
  useEffect(() => { document.title = '合同审查 - LegalFlow' }, [])
  return <Review />
}

function RulesPage() {
  useEffect(() => { document.title = '审查规则库 - LegalFlow' }, [])
  return <Rules />
}

function PricingPage() {
  useEffect(() => { document.title = '定价 - LegalFlow' }, [])
  return <Pricing />
}

function HistoryPage() {
  useEffect(() => { document.title = '审查历史 - LegalFlow' }, [])
  return <History />
}

function LoginPage() {
  useEffect(() => { document.title = '登录 - LegalFlow' }, [])
  return <Login />
}

// ===== App =====
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/legalflow">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRoute />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="login" element={<LoginPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
