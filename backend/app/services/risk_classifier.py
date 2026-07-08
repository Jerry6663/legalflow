"""Risk classifier — identify and rate legal risks in contract clauses."""

from ..core.llm_client import get_llm

RISK_TYPES = [
    "不公平格式条款",
    "违约责任不明确",
    "知识产权归属模糊",
    "保密条款缺失或不足",
    "争议解决条款不利",
    "付款条件苛刻",
    "交付标准不清晰",
    "自动续费/默示延期陷阱",
    "管辖约定不当",
    "免责条款过度",
    "违约赔偿过高",
    "单方变更权",
    "数据隐私风险",
    "赔偿责任不对等",
    "其他风险",
]

RISK_SEVERITY = ["高风险", "中风险", "低风险", "信息提示"]

RISK_ANALYSIS_PROMPT = """你是一位专业合同审查律师。请审查以下合同条款，识别潜在风险。

输出JSON格式：
{
  "has_risk": true/false,
  "risks": [
    {
      "type": "风险类型（从预定义列表中选择）",
      "severity": "高风险/中风险/低风险/信息提示",
      "description": "风险的具体描述",
      "relevant_text": "涉及风险的原文片段",
      "suggestion": "修改建议",
      "legal_basis": "相关的法律依据（如果适用）"
    }
  ]
}

只返回JSON，不要其他内容。"""


class RiskClassifier:
    """Analyze contract clauses for legal risks using LLM."""

    def __init__(self):
        self.llm = get_llm()

    def analyze_clause(self, clause: dict) -> dict:
        """Analyze a single clause for risks.
        
        Args:
            clause: {title, content, type, position} from ClauseSplitter
            
        Returns:
            {clause, has_risk, risks: [{type, severity, description, 
             relevant_text, suggestion, legal_basis}]}
        """
        clause_text = f"【{clause.get('type', '')}】{clause.get('title', '')}\n{clause.get('content', '')}"

        result = self.llm.chat(
            system_prompt=RISK_ANALYSIS_PROMPT,
            user_message=f"合同条款：\n{clause_text[:3000]}",
            temperature=0,
            max_tokens=1000,
        )

        parsed = self._parse_result(result)
        return {
            **clause,
            "has_risk": parsed.get("has_risk", False),
            "risks": parsed.get("risks", []),
        }

    def analyze_contract(
        self, clauses: list[dict], max_clauses: int = 20
    ) -> dict:
        """Analyze all clauses in a contract.
        
        For large contracts, analyze the most important clauses first:
        - 违约责任 clauses
        - 知识产权 clauses
        - 保密 clauses
        Then the rest up to max_clauses.
        """
        # Priority order for analysis
        priority_types = ["违约", "知识产权", "保密", "价款", "争议"]
        prioritized = sorted(
            clauses,
            key=lambda c: (
                0 if c.get("type") in priority_types else 1,
                priority_types.index(c.get("type", ""))
                if c.get("type") in priority_types
                else 999,
            ),
        )

        analyzed = []
        total_risks = 0

        for clause in prioritized[:max_clauses]:
            result = self.analyze_clause(clause)
            analyzed.append(result)
            total_risks += len(result["risks"])

        # Calculate overall risk level
        high = sum(1 for c in analyzed for r in c["risks"] if r["severity"] == "高风险")
        medium = sum(1 for c in analyzed for r in c["risks"] if r["severity"] == "中风险")

        if high >= 3:
            overall = "高风险"
        elif high >= 1 or medium >= 5:
            overall = "中风险"
        elif medium >= 1:
            overall = "中低风险"
        else:
            overall = "低风险"

        return {
            "clauses": analyzed,
            "total_risks": total_risks,
            "high_risks": high,
            "medium_risks": medium,
            "overall_level": overall,
            "clauses_analyzed": len(analyzed),
            "clauses_total": len(clauses),
        }

    def _parse_result(self, raw: str) -> dict:
        import json
        try:
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("\n", 1)[0]
            return json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            return {"has_risk": False, "risks": []}


risk_classifier = RiskClassifier()
