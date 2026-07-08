# Phase 0 复盘与教训

## 总体回顾

Phase 0 目标：跑通"上传文件→LLM回答"的Hello World闭环。  
实际耗时：约3小时（代码+调试2h + 部署排错1h）。  
最终成果：62文件项目骨架 + Railway全栈部署 + DeepSeek API可调用。

---

## 14个已解决问题清单

### 一、认证与权限类（3个）

| # | 问题 | 根因 | 修复方式 | 教训 |
|:--:|------|------|----------|------|
| 1 | **GitHub细粒度PAT无法创建仓库** | `github_pat_` prefix的fine-grained token没有`repo create`权限 | 用户生成classic PAT（`ghp_` prefix），勾选`repo`+`workflow` | ⚠️ **首次建仓库必须用classic PAT，或用户先在网页创建仓库再push** |
| 2 | **Vercel CLI拒绝部署** | 无cached credentials，需token | 用户到vercel.com/account/tokens生成Full Account token | ⚠️ **Vercel CLI不支持OAuth在非交互环境；始终先让用户生成token再操作** |
| 3 | **Railway CLI不接受直接token** | `railway login --token xxx`不是有效参数 | 改用`railway login --browserless`获取设备码 + 用户到railway.com激活 | ⚠️ **Railway只能网页激活，给用户URL+code让TA授权即可** |

### 二、依赖与兼容性类（4个）

| # | 问题 | 根因 | 修复方式 | 教训 |
|:--:|------|------|----------|------|
| 4 | **chromadb/fastapi版本冲突** | `chromadb==1.0.2`硬依赖`fastapi==0.115.9`，但我们写了`0.115.6` | 放宽为`fastapi>=0.115.9`，后续完全移除chromadb | ⚠️ **固定版本要用`>=`，不要`==`；大型库互相依赖时只锁主版本范围** |
| 5 | **pydantic-settings导致启动崩溃** | `pydantic-settings`与新版本pydantic不兼容，Railway CI安装最新版后import失败 | **替换为纯 Python `os.environ`** — 零外部依赖，永远不崩 | 🔥 **核心原则：Railway等云平台会安装最新兼容版本，避免依赖有复杂版本链的包** |
| 6 | **sentence-transformers导致OOM** | Railway免费层512MB内存不够加载bge-large-zh模型 | 临时移除，改用ChromaDB内置的all-MiniLM-L6-v2 | ⚠️ **Railway免费层不适合加载本地模型；向量模型优先级：API > 小模型 > 大模型** |
| 7 | **DeepSeek模型名不匹配** | 代码写`deepseek-chat`，实际API返回`deepseek-v4-flash`和`deepseek-v4-pro` | 先`curl /v1/models`确认可用模型，然后更新config/deploy变量 | ⚠️ **接入任何API前先用curl验证端点/模型/Key有效性，不要猜测** |

### 三、代码质量类（3个）

| # | 问题 | 根因 | 修复方式 | 教训 |
|:--:|------|------|----------|------|
| 8 | **`list[str]` 语法错误** | `from typing import list[str]` 不是合法Python；Python 3.12可直接用`list[str]` | 删除typing导入，用原生语法 | ⚠️ **Python 3.12+不需要`from typing import List/Dict/Optional`；用`list[str]` / `str|null`即可。Agent生成代码容易残留旧版typing写法，部署前必须做语法检查** |
| 9 | **12处flake8 lint错误** | 尾随空格(W293) × 10 + 未用import(F401) × 1 + 空行不足(E302) × 1 | 批量替换空白行 + 移除未用导入 + 补充空行 | ⚠️ **GitHub CI有lint阶段，push前必须本地跑`flake8`；每个commit前都应验证** |
| 10 | **`LLMClient`导入不存在** | `core/__init__.py`导出了不存在的类名，但未被实际引用（未触发import error） | 修正为实际存在的`DeepSeekClient`、`get_llm`、`llm_client` | ⚠️ **`__init__.py`的重导出应与实际模块精确对齐；删代码时尤其容易遗忘** |

### 四、部署配置类（4个）

| # | 问题 | 根因 | 修复方式 | 教训 |
|:--:|------|------|----------|------|
| 11 | **Nixpacks构建失败3次** | Python依赖冲突 + 构建配置不透明 | 切换到Dockerfile — 构建过程完全可控，无需依赖Nixpacks自动检测 | 🔥 **Railway部署统一用Dockerfile，不用Nixpacks自动检测** |
| 12 | **Dockerfile CMD语法** | `CMD uvicorn ... --port $PORT` 的shell形式在Docker中变量展开不稳定 | 改为exec形式：`CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]` | ⚠️ **Dockerfile中需要shell变量展开时，显式用`sh -c`** |
| 13 | **Vercel域名被GFW拦截** | `.vercel.app`域名在国内不可达 | **前后端统一部署到Railway同一容器** — 前端dist复制到`backend/static/`，FastAPI mount静态文件 + SPA路由回退 | 🔥 **中国用户的MVP部署策略：Railway全栈 > Vercel+分体部署** |
| 14 | **Railway 404 "Application not found"连续7次** | 多种原因叠加：每次修复一个bug就触发新bug；从dep冲突→语法错误→配置问题→import错误环环相扣 | 系统排查：1) 验证本地语法 2) 最小化依赖 3) 测试简化版 4) 逐步加回 | ⚠️ **远程部署排查策略：先极简Hello World验证部署通路，再加复杂度** |

---

## 🔥 Phase 1 必备清单（吸取教训）

### 部署基线：当前稳定状态

```
Dockerfile  → python:3.12-slim
requirements → fastapi + uvicorn + openai + httpx + python-dotenv + python-multipart
config.py   → 纯 os.environ（不用pydantic-settings）
main.py     → FastAPI + 静态文件服務 + SPA路由回退
部署平台     → Railway (Dockerfile)，域名 legalflow-production-b834.up.railway.app
```

### 代码上线前自检（每次commit前）

```
[ ] flake8 app --max-line-length=120 --extend-ignore=E203,W503
[ ] python3 -m py_compile app/**/*.py
[ ] 检查 typing导入（Python 3.12不用 typing.List/Dict/Optional）
[ ] 检查 __init__.py 导出是否与模块实际内容一致
[ ] 检查 requirements.txt 是否有版本冲突风险（尽量用>=而非==）
[ ] 新增依赖前评估：API > 纯Python库 > 大模型库 > 系统级依赖
```

### 部署前自检

```
[ ] 先用 curl 验证外部 API Key 有效
[ ] 新增模型/端点前先用 API 确认可用模型列表
[ ] 新增重型依赖前先估算内存占用
[ ] Dockerfile CMD 用 sh -c + ${VAR:-default} 模式
[ ] 部署后用 curl 测试 /health 端点
```

### 架构原则

```
1. 一个仓库，一个Dockerfile，一个URL（应对GFW等网络问题）
2. 依赖最少化 — 每个新包都是潜在崩溃点
3. 配置最简化 — os.environ > pydantic-settings > .env文件
4. 先Hello World，再加功能 — 每次加功能前确认部署基线稳定
```

---

## Phase 0 成功亮点

| 亮点 | 说明 |
|------|------|
| 知识库质量 | 82条法规 + 162条审查规则 + 3份合同模板，Phase 1可直接向量化使用 |
| 文档解析 | PDF/DOCX双引擎，Phase 1无需重写 |
| LLM客户端 | 同步/异步/流式三模式完整，成本估算函数就绪 |
| CI/CD | GitHub Actions配置齐全，flake8自动检查 |
| 部署基线 | 一个Dockerfile搞定全栈，`git push → railway up` 即可 |

---

> 核心教训：**在远程环境（Railway/CI）出问题时，先本地复现→然后最小化→最后逐步加回。不要同时改多个文件再部署。**
