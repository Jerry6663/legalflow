# LegalFlow — AI合同审查平台

AI驱动的智能合同审查平台，面向中小律所和企业的轻量级合同审查与合规管理工具。

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Jerry6663/legalflow)

## 在线地址

- **前端 (已上线)**: https://frontend-lemon-nu-75.vercel.app
- **后端**: 上线中... 点上方 Railway 按钮一键部署

## 技术栈

| 层 | MVP期 | 生产期 |
|---|-------|--------|
| 前端 | Vercel + React + TypeScript + Tailwind | 阿里云OSS/CDN |
| 后端 | Railway + FastAPI + LangGraph | 阿里云ECS + Docker |
| LLM | DeepSeek-V3 | DeepSeek-V3 |
| 向量库 | Chroma | Qdrant |
| 数据库 | Neon (PostgreSQL) | 阿里云RDS |

## 项目结构

```
contract-review/
├── backend/                  # FastAPI后端
│   ├── app/
│   │   ├── api/             # API路由
│   │   ├── core/            # 配置、LLM客户端
│   │   ├── agents/          # AI Agent编排
│   │   ├── services/        # 文档解析、向量库
│   │   ├── models/          # 数据模型
│   │   └── schemas/         # Pydantic schema
│   ├── tests/
│   └── requirements.txt
├── frontend/                 # React前端
│   └── src/
│       ├── components/
│       ├── pages/
│       └── lib/
├── knowledge_base/           # 法律知识库
│   ├── laws/                # 法规库
│   ├── contracts/           # 合同模板
│   └── rules/               # 审查规则
└── .github/workflows/       # CI/CD
```

## 快速开始

### 后端

```bash
cd backend
cp .env.example .env
# 编辑 .env 填入你的 DeepSeek API Key
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## License

MIT
