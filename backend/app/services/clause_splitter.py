"""Clause splitter — segment contract into logical clauses."""

import re
from ..core.llm_client import get_llm

# Standard section patterns for Chinese contracts
SECTION_PATTERNS = [
    r"第[一二三四五六七八九十百千万\d]+条",
    r"第\d+条",
    r"[一二三四五六七八九十]+、",
    r"\d+[\.\、)]",
    r"[（(][一二三四五六七八九十]+[)）]",
]

SECTION_NAMES = {
    "主体": ["甲方", "乙方", "当事人", "身份", "主体", "双方"],
    "标的": ["标的", "货物", "服务", "商品", "产品", "标的物", "交付物"],
    "价款": ["价款", "价格", "金额", "费用", "报酬", "付款", "支付"],
    "交付": ["交付", "验收", "交货", "运输", "包装", "交付标准"],
    "违约": ["违约", "责任", "赔偿", "违约金", "损失", "罚则"],
    "知识产权": ["知识产权", "专利", "商标", "著作权", "版权", "技术成果"],
    "保密": ["保密", "机密", "商业秘密", "信息保护"],
    "争议": ["争议", "仲裁", "诉讼", "管辖", "法律适用", "争议解决"],
    "不可抗力": ["不可抗力", "天灾", "战争", "政府行为"],
    "期限": ["期限", "有效期", "起止", "终止", "解除", "续约"],
    "其他": ["通知", "送达", "变更", "补充", "附件", "生效"],
}


class ClauseSplitter:
    """Split contract text into logical clauses with type annotation."""

    def __init__(self):
        self.llm = get_llm()

    def split(self, text: str) -> list[dict]:
        """Split contract into clauses.

        Returns list of {title, content, type, position}.
        """
        # Try rule-based first
        clauses = self._rule_based_split(text)
        if len(clauses) >= 3:
            return self._annotate_clause_types(clauses)

        # Fallback to LLM-based split
        return self._llm_based_split(text)

    def _rule_based_split(self, text: str) -> list[dict]:
        """Split by matching section header patterns."""
        lines = text.split("\n")
        combined_pattern = "|".join(f"({p})" for p in SECTION_PATTERNS)

        clauses = []
        current_title = "前言"
        current_content = []
        position = 0

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            if re.match(combined_pattern, stripped) and len(stripped) < 60:
                if current_content:
                    clauses.append({
                        "title": current_title,
                        "content": "\n".join(current_content).strip(),
                        "position": position,
                    })
                    position += 1
                current_title = stripped[:50]
                current_content = []
            else:
                current_content.append(stripped)

        if current_content:
            clauses.append({
                "title": current_title,
                "content": "\n".join(current_content).strip(),
                "position": position,
            })

        return clauses

    def _annotate_clause_types(self, clauses: list[dict]) -> list[dict]:
        """Annotate each clause with its type."""
        for clause in clauses:
            combined = clause["title"] + clause["content"][:100]
            clause["type"] = self._detect_type(combined)
        return clauses

    def _detect_type(self, text: str) -> str:
        """Detect clause type from keywords."""
        matches = []
        for type_name, keywords in SECTION_NAMES.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > 0:
                matches.append((type_name, score))

        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[0][0] if matches else "其他"

    def _llm_based_split(self, text: str) -> list[dict]:
        """Use LLM to split unstructured contract."""
        prompt = """请将以下合同文本按条款拆分。返回JSON数组格式：
[{"title": "条款标题", "type": "条款类型", "content": "条款内容"}]

条款类型可选：主体、标的、价款、交付、违约、知识产权、保密、争议、不可抗力、期限、其他"""

        result = self.llm.chat(
            system_prompt="你是一位法律文档结构分析师。",
            user_message=f"{prompt}\n\n合同文本：\n{text[:8000]}",
            temperature=0,
            max_tokens=3000,
        )
        return self._parse_llm_result(result)

    def _parse_llm_result(self, raw: str) -> list[dict]:
        import json
        try:
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("\n", 1)[0]
            result = json.loads(raw)
            if isinstance(result, list):
                for i, item in enumerate(result):
                    item["position"] = i
                return result
            return [{"title": "全文", "type": "其他", "content": raw, "position": 0}]
        except (json.JSONDecodeError, IndexError):
            return [{"title": "全文", "type": "其他", "content": raw[:1000], "position": 0}]


clause_splitter = ClauseSplitter()
