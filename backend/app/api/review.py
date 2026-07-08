"""Contract review API endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
import uuid
from ..services.document_parser import document_parser, DocumentParsingError
from ..core.llm_client import get_llm
from ..core.config import settings

router = APIRouter(prefix="/api/v1/review", tags=["contract-review"])


class ReviewRequest(BaseModel):
    contract_text: str
    contract_type: str | None = "通用"
    rules: list[str] | None = None


class ReviewResponse(BaseModel):
    review_id: str
    risk_level: str
    findings: list[dict] = []
    summary: str
    raw_report: str


@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    """Upload a contract document for review."""
    ext = os.path.splitext(file.filename or "contract.pdf")[1].lower()
    if ext not in [".pdf", ".docx", ".doc", ".jpg", ".jpeg", ".png"]:
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


@router.post("/analyze", response_model=ReviewResponse)
async def analyze_contract(request: ReviewRequest):
    """Analyze contract text and generate review report."""
    llm = get_llm()

    system_prompt = """你是一位经验丰富的中国合同审查律师。请对以下合同进行专业审查，输出格式如下：

## 风险等级
- 高风险 / 中风险 / 低风险

## 审查发现
逐条列出风险/问题，每条包含：
- 风险等级：高/中/低
- 条款位置：相关条款描述
- 风险描述：具体风险是什么
- 法律依据：引用的法律法规和条款
- 修改建议：如何修改

## 总体评估
对合同的总体评价和建议"""

    response = llm.chat(
        system_prompt=system_prompt,
        user_message=f"合同类型：{request.contract_type}\n\n合同正文：\n{request.contract_text[:30000]}",
        temperature=0.1,
        max_tokens=4096,
    )

    return ReviewResponse(
        review_id=str(uuid.uuid4()),
        risk_level="中风险",
        findings=[],
        summary="审查完成",
        raw_report=response,
    )


@router.get("/health")
async def health():
    return {"status": "ok", "service": "LegalFlow API"}
