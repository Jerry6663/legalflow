import { Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: '免费版',
    price: '¥0',
    period: '/月',
    description: '适合个人用户和小团队体验',
    features: [
      { text: '每月 10 次审查', included: true },
      { text: '基础审查功能', included: true },
      { text: '风险条款识别', included: true },
      { text: '修改建议', included: true },
      { text: 'RAG 规则库', included: false },
      { text: 'RAG 法条库', included: false },
      { text: '团队协作', included: false },
      { text: 'API 访问', included: false },
    ],
    cta: '免费开始',
    featured: false,
  },
  {
    name: '专业版',
    price: '¥99',
    period: '/月',
    description: '适合中小企业和个人律师',
    features: [
      { text: '无限审查次数', included: true },
      { text: '深度审查功能', included: true },
      { text: '风险条款识别', included: true },
      { text: '修改建议', included: true },
      { text: 'RAG 规则库', included: true },
      { text: 'RAG 法条库', included: true },
      { text: '审查报告导出', included: true },
      { text: '团队协作', included: false },
      { text: 'API 访问', included: false },
    ],
    cta: '订阅专业版',
    featured: true,
  },
  {
    name: '企业版',
    price: '¥299',
    period: '/月',
    description: '适合企业和法律服务机构',
    features: [
      { text: '无限审查次数', included: true },
      { text: '深度审查功能', included: true },
      { text: '风险条款识别', included: true },
      { text: '修改建议', included: true },
      { text: 'RAG 规则库', included: true },
      { text: 'RAG 法条库', included: true },
      { text: '审查报告导出', included: true },
      { text: '团队协作', included: true },
      { text: 'API 访问', included: true },
      { text: '专属客户支持', included: true },
    ],
    cta: '订阅企业版',
    featured: false,
  },
]

export default function Pricing() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">简单透明的定价</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            选择最适合您需求的方案，随时升级或降级
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl ${
                plan.featured
                  ? 'bg-white ring-2 ring-[#1e3a5f] shadow-xl scale-105 md:scale-105'
                  : 'bg-white shadow-sm border border-gray-200'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#1e3a5f] text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                    最受欢迎
                  </span>
                </div>
              )}
              <div className="p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/review"
                  className={`block text-center py-3 px-6 rounded-xl font-semibold transition-colors ${
                    plan.featured
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#1e40af]'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ hint */}
        <div className="text-center mt-16">
          <p className="text-gray-500">
            有特殊需求？{' '}
            <a href="mailto:support@legalflow.ai" className="text-[#1e3a5f] hover:underline font-medium">
              联系我们
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
