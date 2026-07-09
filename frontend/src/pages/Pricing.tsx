import { Zap, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: '单次审查',
    price: '¥9.9',
    period: '/次',
    description: '按需使用，灵活便捷',
    features: [
      '12 种合同类型识别',
      '条款智能分割',
      '15 种风险标注',
      '法律依据检索',
      '修改建议生成',
      '审查规则匹配',
    ],
    cta: '立即审查',
    featured: false,
  },
  {
    name: '月度订阅',
    price: '¥999',
    period: '/月',
    description: '无限审查，适合高频使用',
    features: [
      '单次审查全部功能',
      '无限审查次数',
      '优先处理队列',
      '审查历史记录',
      '专属客户支持',
    ],
    cta: '订阅月度版',
    featured: true,
  },
]

export default function Pricing() {
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">简单透明的定价</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            所有功能完全开放，按需或按月灵活选择
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl ${plan.featured
                ? 'bg-white ring-2 ring-[#1e3a5f] shadow-xl'
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
                <PricingIcon name={plan.name} />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/review"
                  className={`block text-center py-3 px-6 rounded-xl font-semibold transition-colors ${plan.featured
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

function PricingIcon({ name }: { name: string }) {
  if (name === '单次审查') {
    return <Zap className="w-8 h-8 text-[#1e3a5f] mb-4" />
  }
  return <Crown className="w-8 h-8 text-[#1e3a5f] mb-4" />
}
