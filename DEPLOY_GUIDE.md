# LegalFlow 部署指南

## 一键部署（首次设置后自动）

### 第一步：推送代码到 GitHub

```bash
# 1. 在 GitHub 创建新仓库（无需勾选任何初始化选项）
# 2. 在本地执行：
git remote add origin https://github.com/<你的用户名>/legalflow.git
git add .
git commit -m "Initial commit: Phase 0 complete"
git push -u origin main
```

### 第二步：部署后端到 Railway

1. 打开 https://railway.app → "New Project" → "Deploy from GitHub repo"
2. 选择 `legalflow` 仓库
3. 在 Railway Dashboard 设置环境变量：
   - `DEEPSEEK_API_KEY` = `sk-9ab72f8d34a84686a8a39c7c35f37c9d`
   - `DEEPSEEK_MODEL` = `deepseek-v4-flash`
4. Railway 自动检测 `railway.json` 并部署
5. 部署成功后获得 URL（如 `https://legalflow-api.railway.app`）

### 第三步：部署前端到 Vercel

1. 打开 https://vercel.com/ → "Import Git Repository" → 选择 `legalflow`
2. 项目配置会自动读取 `vercel.json`
3. Framework 选择 **Vite**
4. 设置环境变量：
   - `VITE_API_URL` = `https://legalflow-api.railway.app/api/v1`（上一步获取的后端URL）
5. 点击 "Deploy"，等待完成
6. 部署成功后获得 URL（如 `https://legalflow.vercel.app`）

### 之后每次更新

只需 `git push`，Vercel 和 Railway 自动拉取最新代码重新部署。

---

## 本地开发

```bash
# 后端
cd backend
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload

# 前端（新终端）
cd frontend
npm run dev
```

## 部署架构

```
用户 → Vercel (前端) → Railway (后端) → DeepSeek API
                                          ↓
                                     Chroma (向量库)
```
