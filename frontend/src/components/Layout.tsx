import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Scale, User, LogOut, MessageSquare, Star, X } from 'lucide-react'
import { getMe, logout, authFetch } from '../lib/api'

const navLinks = [
  { to: '/', label: '首页' },
  { to: '/review', label: '合同审查' },
  { to: '/history', label: '历史记录' },
  { to: '/rules', label: '规则库' },
  { to: '/pricing', label: '定价' },
]

interface UserInfo {
  username: string
  review_count: number
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    setUser(null)
    navigate('/')
  }

  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const submitFeedback = async () => {
    try {
      await authFetch('/review/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback: feedbackText }),
      })
      setFeedbackSubmitted(true)
    } catch {
      // Silently fail — feedback is best-effort
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Scale className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight">LegalFlow</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {user ? (
                <>
                  <span className="ml-2 px-3 py-2 text-sm text-white/90 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {user.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-4 h-4" />
                    退出
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  登录
                </Link>
              )}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#1e3a5f] text-white/60 text-sm py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} LegalFlow. All rights reserved.</p>
          <p className="mt-1">AI驱动的智能合同审查平台</p>
        </div>
      </footer>

      {/* Floating Feedback Button */}
      <button
        onClick={() => {
          setShowFeedback(!showFeedback)
          setFeedbackSubmitted(false)
        }}
        className="fixed bottom-6 right-6 w-12 h-12 bg-[#1e3a5f] text-white rounded-full shadow-lg hover:bg-[#2a4f7f] transition-colors flex items-center justify-center z-50"
        title="反馈"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {feedbackSubmitted ? '感谢反馈' : '给我们反馈'}
              </h3>
              <button
                onClick={() => setShowFeedback(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="text-center py-4">
                <p className="text-gray-600">您的反馈已提交，感谢您的支持！</p>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="mt-4 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#2a4f7f] transition-colors"
                >
                  关闭
                </button>
              </div>
            ) : (
              <>
                {/* Star Rating */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">满意度评价</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-colors"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (hoverRating || rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Feedback */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">文字反馈（可选）</p>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="请告诉我们您的使用体验或建议…"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={submitFeedback}
                  disabled={rating === 0}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    rating > 0
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#2a4f7f]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  提交反馈
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
