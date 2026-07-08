"""Contract review API endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
import uuid
from ..services.document_parser import document_parser, DocumentParsingError
from ..services.contract_classifier import contract_classifier
from ..services.clause_splitter import clause_splitter
from ..services.risk_classifier import risk_classifier
from ..services.rule_retriever import rule_retriever
from ..services.review_agent import review_agent
from ..core.config import settings

router = APIRouter(prefix="/api/v1/review", tags=["contract-review"])


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
    ext = os.path.splitext(file.filename or "contract.pdf")[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    upload_id = str(uuid.uuid4())
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, f"{upload_id}{ext}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        result = document_parser.parse_contract(file_path)
    except DocumentParsingError as e:
        raise HTTPException(422, detail=str(e))

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
    """Full 7-step contract review workflow powered by ReviewAgent state machine.

    Steps: IDLE -> CLASSIFY -> SPLIT -> ANALYZE_RISKS ->
           RETRIEVE_RULES -> RETRIEVE_LAWS -> GENERATE_REPORT -> COMPLETE

    Returns complete result including a structured markdown report.
    """
    result = review_agent.run(
        text=request.contract_text,
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


@router.get("/health")
async def health():
    return {"status": "ok", "service": "LegalFlow API"}
