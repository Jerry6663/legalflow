import { Link } from 'react-router-dom'
import { Shield, ArrowRight, Sparkles, BookOpen, Zap, Building2, Briefcase, User } from 'lucide-react'

const sellingPoints = [
  {
    icon: Sparkles,
    title: 'AI智能审查',
    description: '基于DeepSeek V4大模型，自动识别12种合同类型，精准标注15种风险类型，提供修改建议与法律依据。',
  },
  {
    icon: BookOpen,
    title: '法规知识库',
    description: '内置民法典、劳动法、公司法等核心法规，覆盖162条审查规则，审查结果有法可依、有理有据。',
  },
  {
    icon: Zap,
    title: '即用即走',
    description: '无需注册即可使用，上传合同→AI审查→获取报告，三步完成，平均10秒获得专业审查结果。',
  },
]

const useCases = [
  {
    icon: Building2,
    role: '企业法务',
    description: '日常合同批量审查，统一审查标准，降低法律风险，让一人团队拥有10人法务部的审查能力。',
  },
  {
    icon: Briefcase,
    role: '执业律师',
    description: '快速预审合同，聚焦关键条款，提升工作效率。让AI处理重复性审查，律师专注于策略性判断。',
  },
  {
    icon: User,
    role: '个人用户',
    description: '租房合同、劳动合同、服务协议……不再担心看不懂条款，AI帮你逐条审查，保障个人权益。',
  },
]

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1e3a5f] via-[#1e40af] to-[#2563eb] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm mb-6">
              <Shield className="w-4 h-4" />
              <span>AI驱动的合同审查新时代</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
              AI智能合同审查平台
            </h1>
            <p className="text-xl text-blue-100 mb-4 max-w-2xl mx-auto leading-relaxed">
              基于DeepSeek V4大模型，10秒完成专业合同审查
            </p>
            <p className="text-base text-blue-200/80 mb-10 max-w-xl mx-auto">
              支持12种合同类型识别、15种风险标注、法律依据检索、修改建议生成。让一人团队拥有10人法务部的审查能力。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/review"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#1e3a5f] font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-xl"
              >
                开始审查
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                查看定价
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Selling Points Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              为什么选择 LegalFlow？
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              三大核心能力，全方位提升合同审查效率与质量
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {sellingPoints.map((point) => (
              <div
                key={point.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                  <point.icon className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{point.title}</h3>
                <p className="text-gray-600 leading-relaxed">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              适用场景
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              无论您是法务、律师还是个人，LegalFlow 都能帮您轻松完成合同审查
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((uc) => (
              <div
                key={uc.role}
                className="text-center p-8 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-[#1e3a5f] to-[#1e40af] rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <uc.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{uc.role}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            准备好提升合同审查效率了吗？
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            无需庞大的法务团队，LegalFlow 为您提供专业级的合同审查能力。上传合同，10秒获得结果。
          </p>
          <Link
            to="/review"
            className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#1e40af] transition-colors shadow-lg"
          >
            开始审查
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
