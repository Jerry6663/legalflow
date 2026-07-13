"""Slow Think Engine — four-step reasoning chain for legal review."""

import time
import json
from ..core.llm_client import get_llm

STEP_TIMEOUT = 120  # seconds per step

class SlowThinkEngine:
    """Four-step reasoning: Hypothesis → Evidence → Assessment → Reflection."""

    def __init__(self):
        self.llm = get_llm()

    def review(self, clause_text: str, clause_type: str,
               contract_type: str, rag_context: list[str] = None) -> dict:
        """Execute the full four-step reasoning chain on a single clause."""
        rules_text = "\n".join(rag_context) if rag_context else "（无匹配规则）"

        # Step 1: Generate risk hypotheses
        hypotheses_text = self._generate_hypotheses(
            clause_text, clause_type, contract_type, rules_text
        )
        if not hypotheses_text:
            return self._empty_result()

        # Step 2: Collect evidence from text and laws
        evidence = self._collect_evidence(
            clause_text, hypotheses_text, rules_text, contract_type
        )

        # Step 3: Assess risks with scoring
        assessment = self._assess_risks(
            clause_text, hypotheses_text, evidence, rules_text
        )

        # Step 4: Reflect and calibrate
        calibrated = self._reflect_and_calibrate(
            clause_text, assessment, contract_type
        )

        return self._parse_final_result(calibrated, clause_text)

    def _generate_hypotheses(self, clause_text, clause_type, contract_type, rules_text):
        prompt = f"""你是合同风险审查专家。请基于以下条款内容，生成3-5个可能存在的法律风险假设。

合同类型：{contract_type}
条款类型：{clause_type}
条款内容：
{clause_text[:2000]}

审查规则参考：
{rules_text[:1500]}

 请列出风险假设， 只返回JSON数组：
["假设1描述", "假设2描述", ...]
如果不认为存在明显风险，返回空数组 []。只返回JSON。"""
        try:
            result = self.llm.chat(
                system_prompt="你是中国合同法专家。生成精准的法律风险假设。",
                user_message=prompt,
                temperature=0.1,
                max_tokens=500,
            )
            parsed = json.loads(result.strip())
            return "\n".join(f"- {h}" for h in parsed) if parsed else ""
        except Exception:
            return ""

    def _collect_evidence(self, clause_text, hypotheses, rules_text, contract_type):
        prompt = f"""你是合同证据分析师。为每个风险假设找到合同原文中的证据和适用法律。

合同类型：{contract_type}
条款内容：
{clause_text[:2000]}

风险假设：
{hypotheses}

 对每个假设，收集：
1. 原文证据（引用条款原文片段）
2. 适用法律（至少引用1条具体法条）
3. 证据强度（强/中/弱）

 返回JSON数组：
[{{"假设": "...", "原文证据": "...", "法律依据": "《XX法》第X条：...", "证据强度": "强"}}, ...]
只返回JSON。"""
        try:
            result = self.llm.chat(
                system_prompt="你是中国法律证据分析专家。精确引用原文和法律条文，不要编造。",
                user_message=prompt,
                temperature=0.1,
                max_tokens=800,
            )
            return json.loads(result.strip())
        except Exception:
            return []

    def _assess_risks(self, clause_text, hypotheses, evidence, rules_text):
        prompt = f"""你是合同风险评审专家。综合评估每个假设的风险等级。

条款内容：
{clause_text[:1500]}

风险假设：
{hypotheses}

 证据分析：
{json.dumps(evidence, ensure_ascii=False, indent=2)[:1000]}

 对每个假设，给出：
1. 风险等级（高风险/中风险/低风险/无风险）
2. 风险类型（违约责任/知识产权/保密/价款支付/交付/争议解决/劳动用工/其他）
3. 详细说明（包含法律依据）
4. 修改建议（如果存在风险）

 返回JSON数组（只返回JSON）：
[{{"假设": "...", "等级": "高风险", "类型": "违约责任", "说明": "...", "修改建议": "..."}}, ...]"""
        try:
            result = self.llm.chat(
                system_prompt="你是中国合同风险评估专家。评估必须严格基于法律条文，置信度不够时标注中风险。",
                user_message=prompt,
                temperature=0.05,
                max_tokens=1000,
            )
            return json.loads(result.strip())
        except Exception:
            return []

    def _reflect_and_calibrate(self, clause_text, assessment, contract_type):
        prompt = f"""你是合同审查质量控制专家。检查风险评估结果是否存在遗漏或误报。

合同类型：{contract_type}
条款内容：
{clause_text[:1500]}

当前评估结果：
{json.dumps(assessment, ensure_ascii=False, indent=2)[:1200]}

请检查并回答：
1. 是否有遗漏的重要风险？如果有，补充。
2. 是否有过度标注的风险？如果有，降级或移除。
3. 最终置信度评估（高/中/低）。

返回校准后的完整JSON数组（格式同输入）。只返回JSON。"""
        try:
            result = self.llm.chat(
                system_prompt="你是合同审查质量审核专家。确保不遗漏重要风险，不误报无害条款。",
                user_message=prompt,
                temperature=0.05,
                max_tokens=1000,
            )
            return json.loads(result.strip())
        except Exception:
            return assessment

    def _empty_result(self):
        return {
            "has_risk": False,
            "risks": [],
            "hypotheses_count": 0,
        }

    def _parse_final_result(self, calibrated, clause_text):
        risks = []
        for item in calibrated:
            if item.get("等级", "").replace(" ", "") in ["高风险", "中风险"]:
                risks.append({
                    "severity": "高风险" if "高风险" in item.get("等级", "") else "中风险",
                    "type": item.get("类型", "其他"),
                    "description": item.get("假设", "") + " — " + item.get("说明", ""),
                    "relevant_text": clause_text[:300],
                    "suggestion": item.get("修改建议", ""),
                    "legal_basis": item.get("说明", "")[:200],
                })

        return {
            "has_risk": len(risks) > 0,
            "risks": risks,
            "hypotheses_count": len(calibrated),
        }
