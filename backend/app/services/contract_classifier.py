"""Contract type classifier — keyword + LLM hybrid."""

import re
from ..core.llm_client import get_llm

CLASSIFIER_PROMPT = """你是一位合同审查专家。请分析以下合同文本，判断合同类型。

可选类型（必须从列表中选一个）：
劳动合同、劳务合同、买卖合同、保密协议、租赁合同、借款合同、
技术开发合同、委托合同、运输合同、承揽合同、服务合同、合伙协议、其他

返回JSON格式（只返回JSON，不要其他内容）：
{"type": "合同类型", "confidence": 0.95, "keywords": ["关键词1", "关键词2"]}"""

# High-precision keyword patterns — matched BEFORE LLM call
KEYWORD_PATTERNS = [
    (r"劳动(合同|关系|报酬|争议|仲裁|法)", "劳动合同", 0.95),
    (r"劳动合[同书]", "劳动合同", 0.98),
    (r"劳务(合同|派遣|外包|输出)", "劳务合同", 0.95),
    (r"买卖(合同|协议|关系)", "买卖合同", 0.95),
    (r"保密(协议|条款|义务|信息)", "保密协议", 0.95),
    (r"租赁(合同|协议|房屋|设备)", "租赁合同", 0.95),
    (r"借款(合同|协议|利率|本金)", "借款合同", 0.95),
    (r"技术开发|软件(开发|定制)|系统开发", "技术开发合同", 0.90),
    (r"委托(合同|书|代理)|授权委托", "委托合同", 0.95),
    (r"运输(合同|协议|承运)", "运输合同", 0.95),
    (r"承揽(合同|加工|定作)", "承揽合同", 0.95),
    (r"合伙(协议|企业)|入伙|退伙", "合伙协议", 0.95),
    (r"服务(合同|协议|内容)|咨询(服务|合同)", "服务合同", 0.85),
    (r"试用期|工资|社保|加班|年假|工伤|解除劳动|经济补偿|竞业限制",
     "劳动合同", 0.92),
]


class ContractClassifier:
    """Identify contract type — keyword pre-match + LLM fallback."""

    SUPPORTED_TYPES = [
        "劳动合同", "劳务合同", "买卖合同", "保密协议", "租赁合同", "借款合同",
        "合伙协议", "技术开发合同", "委托合同", "运输合同", "承揽合同",
        "服务合同", "其他",
    ]

    def __init__(self):
        self.llm = get_llm()

    def classify(self, text: str, preview_only: bool = False) -> dict:
        """Classify contract type. Uses 4000 chars for better accuracy."""

        # Step 1: Check keyword patterns (fast, reliable)
        kw_result = self._keyword_classify(text)
        if kw_result["confidence"] >= 0.95:
            return kw_result

        # Step 2: LLM classification (for edge cases)
        sample = text[:4000] if len(text) > 4000 else text
        try:
            result = self.llm.chat(
                system_prompt=CLASSIFIER_PROMPT,
                user_message=f"合同文本：\n{sample}",
                temperature=0,
                max_tokens=200,
            )
            llm_result = self._parse_result(result)

            # Validate LLM returned a valid type
            if llm_result["type"] in self.SUPPORTED_TYPES:
                return llm_result
        except Exception:
            pass

        # Step 3: Fallback to keyword result
        return kw_result

    def _keyword_classify(self, text: str) -> dict:
        """Keyword-based pre-classification for high-confidence matches."""
        # Check first 5000 chars and last 500 chars (title often at top)
        search_text = text[:5000] + text[-500:]

        best_type = "其他"
        best_confidence = 0.4
        best_keywords: list[str] = []
        matched_keywords: set[str] = set()

        for pattern, contract_type, confidence in KEYWORD_PATTERNS:
            matches = re.findall(pattern, search_text)
            if matches:
                if isinstance(matches[0], tuple):
                    matched_keywords.update(m[0] for m in matches if m[0])
                elif isinstance(matches[0], str):
                    matched_keywords.update(matches)

                if confidence > best_confidence:
                    best_confidence = confidence
                    best_type = contract_type

        best_keywords = list(matched_keywords)[:5]

        # Special: 劳动合同 + 技术关键词 should NOT be 技术开发合同
        if "劳动合同" in search_text and best_type == "技术开发合同":
            # Check if this is really about labor
            labor_signals = ["工资", "社保", "加班", "年假", "试用期", "解除劳动合同"]
            tech_signals = ["开发", "系统", "软件", "技术方案", "交付物"]
            labor_count = sum(1 for s in labor_signals if s in search_text)
            tech_count = sum(1 for s in tech_signals if s in search_text)
            if labor_count > tech_count:
                best_type = "劳动合同"
                best_confidence = 0.85

        return {
            "type": best_type,
            "confidence": round(best_confidence, 2),
            "keywords": best_keywords,
        }

    def _parse_result(self, raw: str) -> dict:
        """Parse LLM JSON output."""
        import json
        try:
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("\n", 1)[0]
            return json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            return {"type": "其他", "confidence": 0.4, "keywords": []}


contract_classifier = ContractClassifier()
