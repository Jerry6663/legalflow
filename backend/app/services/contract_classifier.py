"""Contract type classifier — identifies contract category from text."""

from ..core.llm_client import get_llm

CLASSIFIER_PROMPT = """你是一位合同审查专家。请分析以下合同文本，判断合同类型。

可选类型：买卖合同、劳务合同、保密协议、租赁合同、借款合同、合伙协议、
技术开发合同、委托合同、运输合同、承揽合同、服务合同、其他

返回JSON格式：
{"type": "合同类型", "confidence": 0.95, "keywords": ["关键词1", "关键词2"]}

只返回JSON，不要其他内容。"""


class ContractClassifier:
    """Identify contract type from document text."""

    SUPPORTED_TYPES = [
        "买卖合同", "劳务合同", "保密协议", "租赁合同", "借款合同",
        "合伙协议", "技术开发合同", "委托合同", "运输合同", "承揽合同",
        "服务合同", "其他",
    ]

    def __init__(self):
        self.llm = get_llm()

    def classify(self, text: str, preview_only: bool = False) -> dict:
        """Classify contract type from full text or preview.

        For efficiency, classify from first 2000 chars.
        """
        sample = text[:2000] if len(text) > 2000 else text

        result = self.llm.chat(
            system_prompt=CLASSIFIER_PROMPT,
            user_message=f"合同文本：\n{sample}",
            temperature=0,
            max_tokens=200,
        )
        return self._parse_result(result)

    def _parse_result(self, raw: str) -> dict:
        """Parse LLM JSON output, with fallback."""
        import json
        try:
            # Extract JSON from possible markdown wrapping
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("\n", 1)[0]
            return json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            return {"type": "其他", "confidence": 0.5, "keywords": []}


contract_classifier = ContractClassifier()
