import { Link } from 'react-router-dom'
import { Shield, BookOpen, Scale, ArrowRight, FileCheck } from 'lucide-react'

const features = [
  {
    icon: FileCheck,
    title: 'AI智能审查',
    description: '基于大语言模型的智能合同审查，自动识别风险条款、缺失条款和不合理约定，提供修改建议。',
  },
  {
    icon: BookOpen,
    title: 'RAG规则库',
    description: '内置丰富的审查规则库，覆盖各类合同类型的审查要点，确保审查全面无遗漏。',
  },
  {
    icon: Scale,
    title: 'RAG法条库',
    description: '关联最新法律法规数据库，审查结果有法可依，提升合同审查的法律专业性。',
  },
]

const stats = [
  { value: '98%', label: '审查准确率' },
  { value: '<30秒', label: '平均审查时间' },
  { value: '5000+', label: '规则条目' },
  { value: '1000+', label: '服务用户数' },
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
              AI驱动的智能合同审查平台
            </h1>
            <p className="text-xl text-blue-100 mb-4 max-w-2xl mx-auto leading-relaxed">
              让一人团队拥有10人法务部的合同审查能力
            </p>
            <p className="text-base text-blue-200/80 mb-10 max-w-xl mx-auto">
              基于先进的人工智能技术，为您提供专业、高效、全面的合同审查服务
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/review"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#1e3a5f] font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-xl"
              >
                立即体验
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

      {/* Stats Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-[#1e3a5f]">{stat.value}</div>
                <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              为什么选择 LegalFlow？
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              三大核心技术，为您提供全方位的合同审查服务
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-[#1e3a5f]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            准备好提升合同审查效率了吗？
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            无需庞大的法务团队，LegalFlow 为您提供专业级的合同审查能力
          </p>
          <Link
            to="/review"
            className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#1e40af] transition-colors shadow-lg"
          >
            开始免费使用
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
