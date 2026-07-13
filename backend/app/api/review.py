"""Contract review API endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from pydantic import BaseModel
import os
import re
import uuid
import asyncio
from ..services.document_parser import document_parser, DocumentParsingError
from ..services.contract_classifier import contract_classifier
from ..services.clause_splitter import clause_splitter
from ..services.risk_classifier import risk_classifier
from ..services.rule_retriever import rule_retriever
from ..services.review_agent import review_agent
from ..core.config import settings

router = APIRouter(prefix="/api/v1/review", tags=["contract-review"])


# Token dependency
async def auth_required(authorization: str = Header(None)) -> dict:
    """Optional auth wrapper. Returns user or raises 401."""
    from ..services.auth import get_user_by_token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "请先登录")
    token = authorization.split(" ", 1)[1]
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(401, "登录已过期，请重新登录")
    return user


# Limit concurrent LLM processing to prevent OOM (Railway free tier: 512MB)
_review_semaphore = asyncio.Semaphore(2)


class ReviewRequest(BaseModel):
    contract_text: str
    contract_type: str | None = "通用"


class AnalysisResponse(BaseModel):
    review_id: str
    contract_type: str
    confidence: float
    keywords: list[str]
    clauses: list[dict]
    risks: list[dict]
    matched_rules: list[dict]
    overall_level: str
    summary: str


@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    """Upload a contract document for review."""
    safe_filename = re.sub(r'[^\w\.\-]', '_', file.filename or "contract.pdf")
    ext = os.path.splitext(safe_filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    upload_id = str(uuid.uuid4())
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"{upload_id}{ext}")

    content = await file.read()

    # Size check
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "文件大小不能超过 20MB")
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        result = document_parser.parse_contract(file_path)
    except DocumentParsingError as e:
        raise HTTPException(422, detail=str(e))
    finally:
        # Clean up uploaded file to prevent disk bloat
        try:
            os.remove(file_path)
        except OSError:
            pass

    return {
        "upload_id": upload_id,
        "file_name": file.filename,
        "file_size": len(content),
        "parsed": result,
    }


@router.post("/analyze")
async def analyze_contract(request: ReviewRequest) -> AnalysisResponse:
    """Phase 1: Full contract analysis pipeline.
    
    Steps:
    1. Classify contract type
    2. Split into clauses
    3. Analyze each clause for risks
    4. Retrieve matching review rules
    5. Compile results
    """
    text = request.contract_text

    # Sanitize input
    from ..core.sanitizer import sanitize_text
    text = sanitize_text(text, max_length=50000)

    review_id = str(uuid.uuid4())

    # Step 1: Classify contract type
    if request.contract_type == "通用" or not request.contract_type:
        classification = contract_classifier.classify(text)
        contract_type = classification.get("type", "通用")
        confidence = classification.get("confidence", 0.5)
        keywords = classification.get("keywords", [])
    else:
        contract_type = request.contract_type
        confidence = 1.0
        keywords = []

    # Step 2: Split into clauses
    clauses = clause_splitter.split(text)

    # Step 3: Risk analysis (limit to 10 clauses for speed)
    risk_result = risk_classifier.analyze_contract(clauses, max_clauses=10)

    # Step 4: Retrieve matching rules for clauses with risks
    matched_rules = []
    for clause in risk_result["clauses"]:
        if clause.get("has_risk"):
            rules = rule_retriever.search_for_clause(
                clause, contract_type=contract_type, top_k=3
            )
            matched_rules.append({
                "clause_title": clause.get("title", ""),
                "clause_type": clause.get("type", ""),
                "rules": rules,
            })

    # Step 5: Generate summary
    summary = _generate_summary(risk_result, matched_rules, contract_type)

    return AnalysisResponse(
        review_id=review_id,
        contract_type=contract_type,
        confidence=confidence,
        keywords=keywords,
        clauses=clauses,
        risks=risk_result["clauses"],
        matched_rules=matched_rules,
        overall_level=risk_result["overall_level"],
        summary=summary,
    )


class FullReviewResponse(BaseModel):
    review_id: str
    contract_type: str
    confidence: float
    keywords: list[str]
    clauses: list[dict]
    risks: list[dict]
    matched_rules: list[dict]
    matched_laws: list[dict]
    overall_level: str
    report: str
    steps: list[dict]


@router.post("/analyze/full")
async def analyze_contract_full(request: ReviewRequest) -> FullReviewResponse:
    """Full 7-step review workflow (non-blocking — supports concurrent requests).

    Uses asyncio.to_thread to prevent event loop blocking + semaphore(2)
    to limit concurrent LLM calls on Railway's constrained free tier.
    """
    async with _review_semaphore:
        from ..core.sanitizer import sanitize_text
        text = sanitize_text(request.contract_text, max_length=50000)
        result = await asyncio.to_thread(
            review_agent.run,
            text=text,
            contract_type=request.contract_type or "通用",
        )

    return FullReviewResponse(
        review_id=result["review_id"],
        contract_type=result["contract_type"],
        confidence=result["confidence"],
        keywords=result["keywords"],
        clauses=result["clauses"],
        risks=result["risks"],
        matched_rules=result["matched_rules"],
        matched_laws=result["matched_laws"],
        overall_level=result["overall_level"],
        report=result["report"],
        steps=result["steps"],
    )


def _generate_summary(risk_result: dict, matched_rules: list[dict], contract_type: str) -> str:
    """Generate a human-readable summary of the review."""
    total = risk_result["total_risks"]
    high = risk_result["high_risks"]
    medium = risk_result["medium_risks"]
    level = risk_result["overall_level"]
    clauses_count = risk_result["clauses_analyzed"]
    total_clauses = risk_result["clauses_total"]

    parts = [
        f"审查完成。合同类型：{contract_type}。",
        f"共审查 {clauses_count}/{total_clauses} 个条款，",
        f"发现 {total} 个风险点",
    ]

    if high > 0:
        parts.append(f"（其中高风险 {high} 个）")
    if medium > 0:
        parts.append(f"（中风险 {medium} 个）")

    parts.append(f"。综合风险等级：{level}。")
    parts.append(f"匹配审查规则 {len(matched_rules)} 条。")

    return "".join(parts)


# ===== Async Task Queue Endpoints (unlimited HTTP concurrency) =====

class SubmitResponse(BaseModel):
    job_id: str
    status: str
    queue_position: int


class JobStatusResponse(BaseModel):
    status: str
    queue_position: int
    result: dict | None = None
    error: str | None = None


@router.post("/submit")
async def submit_review(request: ReviewRequest) -> SubmitResponse:
    """Submit a review job — returns instantly. Frontend polls for results.

    HTTP layer handles thousands of concurrent submissions.
    LLM processing happens in background queue.
    """
    from ..services.task_queue import submit_review as submit

    job_id = await submit(
        text=request.contract_text,
        contract_type=request.contract_type or "通用",
    )
    from ..services.task_queue import get_job_status
    status = get_job_status(job_id)
    return SubmitResponse(
        job_id=job_id,
        status=status["status"] if status else "queued",
        queue_position=status["queue_position"] if status else 0,
    )


@router.get("/job/{job_id}")
async def get_job(job_id: str) -> JobStatusResponse:
    """Poll for review job status. Frontend calls this every 2 seconds."""
    from ..services.task_queue import get_job_status

    status = get_job_status(job_id)
    if not status:
        raise HTTPException(404, "Job not found")

    return JobStatusResponse(
        status=status["status"],
        queue_position=status.get("queue_position", 0),
        result=status.get("result"),
        error=status.get("error"),
    )


@router.get("/queue/stats")
async def queue_stats():
    """Queue monitoring endpoint."""
    from ..services.task_queue import get_queue_stats
    return get_queue_stats()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "LegalFlow API"}


# ===== Feedback Endpoint =====

class FeedbackRequest(BaseModel):
    rating: int  # 1-5
    feedback: str = ""


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    """User feedback — stored in memory for MVP."""
    return {"status": "received", "message": "感谢您的反馈！"}


# ===== Auth Endpoints =====

class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str
    review_count: int


class UserResponse(BaseModel):
    username: str
    review_count: int


@router.post("/auth/register")
async def auth_register(req: AuthRequest):
    from ..services.auth import register
    if len(req.username) < 3 or len(req.password) < 6:
        raise HTTPException(400, "用户名至少3位，密码至少6位")
    token = register(req.username, req.password)
    if not token:
        raise HTTPException(400, "用户名已存在")
    return AuthResponse(token=token, username=req.username, review_count=0)


@router.post("/auth/login")
async def auth_login(req: AuthRequest):
    from ..services.auth import login, get_user_by_token
    token = login(req.username, req.password)
    if not token:
        raise HTTPException(401, "用户名或密码错误")
    user = get_user_by_token(token)
    return AuthResponse(token=token, username=req.username, review_count=user["review_count"] if user else 0)


@router.get("/rules")
async def list_rules():
    """List all review rules from the knowledge base."""
    rule_retriever.load_rules()
    if hasattr(rule_retriever, '_rules_memory') and rule_retriever._rules_memory:
        return {"rules": rule_retriever._rules_memory, "total": len(rule_retriever._rules_memory)}
    return {"rules": [], "total": 0}


@router.get("/auth/me")
async def auth_me(authorization: str = Header(None)):
    from ..services.auth import get_user_by_token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "请先登录")
    user = get_user_by_token(authorization.split(" ", 1)[1])
    if not user:
        raise HTTPException(401, "登录已过期")
    return UserResponse(username=user["username"], review_count=user["review_count"])


@router.get("/history")
async def review_history(authorization: str = Header(None)):
    """Get review history for current user."""
    from ..services.auth import get_user_by_token
    from ..core.database import get_reviews
    user = None
    if authorization and authorization.startswith("Bearer "):
        user = get_user_by_token(authorization.split(" ", 1)[1])
    reviews = get_reviews(username=user["username"] if user else None)
    return {"reviews": reviews}


@router.get("/review/{review_id}")
async def get_review_detail(review_id: str):
    """Get full review result by ID."""
    from ..core.database import get_review
    review = get_review(review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    return review


@router.get("/audit/{review_id}")
async def get_audit_trail(review_id: str):
    """Get audit logs for a review."""
    from ..core.database import get_audit_logs
    logs = get_audit_logs(review_id)
    return {"logs": logs}
