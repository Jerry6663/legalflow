"""Review agent — orchestrated contract review workflow."""

import json
import time
import uuid

from ..core.llm_client import get_llm
from .contract_classifier import contract_classifier
from .clause_splitter import clause_splitter
from .risk_classifier import risk_classifier
from .rule_retriever import rule_retriever
from .law_retriever import law_retriever


class ReviewState:
    """State machine states for contract review workflow."""

    IDLE = "idle"
    CLASSIFY = "classify"
    SPLIT = "split"
    ANALYZE_RISKS = "analyze_risks"
    RETRIEVE_RULES = "retrieve_rules"
    RETRIEVE_LAWS = "retrieve_laws"
    GENERATE_REPORT = "generate_report"
    COMPLETE = "complete"
    ERROR = "error"


class ReviewAgent:
    """Orchestrate full contract review workflow as a state machine."""

    def __init__(self):
        self.llm = get_llm()
        self.state = ReviewState.IDLE
        self.context: dict = {}
        self._steps: list[dict] = []
        self._progress_callback = None

    def run(self, text: str, contract_type: str = "通用") -> dict:
        """Execute the full review workflow.

        Returns: {review_id, contract_type, clauses, risks, rules, laws,
                  overall_level, summary, report, steps}
        """
        self.context = {
            "review_id": str(uuid.uuid4()),
            "text": text,
            "contract_type": contract_type,
            "started_at": time.time(),
        }
        self._steps = []

        try:
            self._transition(ReviewState.CLASSIFY)
            self._transition(ReviewState.SPLIT)
            self._transition(ReviewState.ANALYZE_RISKS)
            self._transition(ReviewState.RETRIEVE_RULES)
            self._transition(ReviewState.RETRIEVE_LAWS)
            self._transition(ReviewState.GENERATE_REPORT)
            self._transition(ReviewState.COMPLETE)
        except Exception as e:
            self.state = ReviewState.ERROR
            self._add_step("error", str(e))

        return self._build_result()

    def _transition(self, next_state: str):
        self.state = next_state
        handler = {
            ReviewState.CLASSIFY: self._do_classify,
            ReviewState.SPLIT: self._do_split,
            ReviewState.ANALYZE_RISKS: self._do_analyze_risks,
            ReviewState.RETRIEVE_RULES: self._do_retrieve_rules,
            ReviewState.RETRIEVE_LAWS: self._do_retrieve_laws,
            ReviewState.GENERATE_REPORT: self._do_generate_report,
            ReviewState.COMPLETE: self._do_complete,
        }.get(next_state)

        if handler:
            try:
                handler()
            except Exception as e:
                self._add_step(next_state, f"降级处理: {str(e)[:100]}")
                # Continue to next state instead of crashing
        else:
            self._add_step(next_state, "skipped")

    def _do_classify(self):
        if self.context["contract_type"] != "通用":
            self._add_step("classify", f"使用指定类型: {self.context['contract_type']}")
            return
        result = contract_classifier.classify(self.context["text"])
        self.context["contract_type"] = result.get("type", "通用")
        self.context["confidence"] = result.get("confidence", 0.5)
        self.context["keywords"] = result.get("keywords", [])
        self._add_step("classify", f"识别为: {self.context['contract_type']}")

    def _do_split(self):
        clauses = clause_splitter.split(self.context["text"])
        self.context["clauses"] = clauses
        self._add_step("split", f"拆分为 {len(clauses)} 个条款")

    def _do_analyze_risks(self):
        clauses = self.context.get("clauses", [])
        result = risk_classifier.analyze_contract(clauses, max_clauses=12)
        self.context["risk_result"] = result
        self.context["overall_level"] = result["overall_level"]
        self._add_step("analyze_risks", f"发现 {result['total_risks']} 个风险点")

    def _do_retrieve_rules(self):
        risk_result = self.context.get("risk_result", {})
        contract_type = self.context.get("contract_type", "")
        matched = []
        for clause in risk_result.get("clauses", []):
            if clause.get("has_risk"):
                rules = rule_retriever.search_for_clause(clause, contract_type, top_k=3)
                if rules:
                    matched.append({
                        "clause_title": clause.get("title", ""),
                        "clause_type": clause.get("type", ""),
                        "rules": rules,
                    })
        self.context["matched_rules"] = matched
        self._add_step("retrieve_rules", f"匹配 {len(matched)} 条规则")

    def _do_retrieve_laws(self):
        risk_result = self.context.get("risk_result", {})
        matched = []
        for clause in risk_result.get("clauses", []):
            if clause.get("has_risk"):
                for risk in clause.get("risks", []):
                    laws = law_retriever.search_for_risk(
                        risk.get("type", ""),
                        clause.get("content", ""),
                        top_k=2,
                    )
                    if laws:
                        matched.append({
                            "clause_title": clause.get("title", ""),
                            "risk_type": risk.get("type", ""),
                            "laws": laws,
                        })
        self.context["matched_laws"] = matched
        self._add_step("retrieve_laws", f"匹配 {len(matched)} 条法规")

    def _do_generate_report(self):
        report = self._build_markdown_report()
        self.context["report"] = report
        self._add_step("generate_report", "报告生成完成")

    def _do_complete(self):
        elapsed = round(time.time() - self.context.get("started_at", 0), 1)
        self._add_step("complete", f"审查完成，耗时 {elapsed} 秒")

    def _add_step(self, step: str, detail: str):
        self._steps.append({
            "step": step,
            "detail": detail,
            "timestamp": time.time(),
        })

    def _build_markdown_report(self) -> str:
        """Generate a structured markdown review report."""
        ct = self.context.get("contract_type", "")
        level = self.context.get("overall_level", "")
        risk_result = self.context.get("risk_result", {})

        lines = [
            "# 合同审查报告",
            "",
            f"**合同类型**: {ct}",
            f"**风险等级**: {level}",
            f"**审查时间**: {time.strftime('%Y-%m-%d %H:%M')}",
            "",
            "---",
            "",
            "## 审查概要",
            "",
        ]

        # Summary
        total_risks = risk_result.get("total_risks", 0)
        high = risk_result.get("high_risks", 0)
        medium = risk_result.get("medium_risks", 0)
        lines.append(f"- 审查条款数: {risk_result.get('clauses_analyzed', 0)}/{risk_result.get('clauses_total', 0)}")
        lines.append(f"- 风险点总数: {total_risks}（高风险 {high}，中风险 {medium}）")
        lines.append(f"- 匹配审查规则: {len(self.context.get('matched_rules', []))} 条")
        lines.append(f"- 匹配合规法条: {len(self.context.get('matched_laws', []))} 条")
        lines.append("")

        # Risk details
        lines.append("---")
        lines.append("")
        lines.append("## 风险详情")
        lines.append("")

        for i, clause in enumerate(risk_result.get("clauses", []), 1):
            if not clause.get("has_risk"):
                continue
            lines.append(f"### {i}. {clause.get('title', '条款')[:40]}")
            lines.append(f"**条款类型**: {clause.get('type', '')}")
            lines.append("")
            for risk in clause.get("risks", []):
                icon = self._risk_icon(risk["severity"])
                lines.append(f"{icon} **{risk['severity']}** — {risk['type']}")
                lines.append(f"> {risk['description']}")
                if risk.get("relevant_text"):
                    lines.append(f"> 原文: \"{risk['relevant_text'][:100]}\"")
                if risk.get("suggestion"):
                    lines.append(f"**修改建议**: {risk['suggestion']}")
                if risk.get("legal_basis"):
                    lines.append(f"**法律依据**: {risk['legal_basis']}")
                lines.append("")
            lines.append("")

        # Matched rules
        lines.append("---")
        lines.append("")
        lines.append("## 匹配审查规则")
        lines.append("")
        matched_rules = self.context.get("matched_rules", [])
        if matched_rules:
            for match in matched_rules[:10]:
                lines.append(f"**条款: {match.get('clause_title', '')[:30]}**")
                for rule in match.get("rules", [])[:2]:
                    lines.append(f"- [{rule.get('level', '')}] {rule.get('rule', '')}")
                lines.append("")
        else:
            lines.append("*未匹配到审查规则*")
            lines.append("")
        lines.append("")

        # Matched laws
        lines.append("---")
        lines.append("")
        lines.append("## 相关法律法规")
        lines.append("")
        seen = set()
        matched_laws = self.context.get("matched_laws", [])
        for match in matched_laws[:10]:
            for law in match.get("laws", [])[:2]:
                key = f"{law['source']}{law['article']}"
                if key not in seen:
                    seen.add(key)
                    lines.append(f"**{law['source']}** {law['article']}")
                    lines.append(f"> {law['content'][:200]}")
                    lines.append("")

        if not seen:
            lines.append("*未匹配到相关法规*")
            lines.append("")

        lines.append("---")
        lines.append("*本报告由 LegalFlow AI 自动生成，仅供参考，不构成法律意见。*")

        return "\n".join(lines)

    def _risk_icon(self, severity: str) -> str:
        """Return an emoji icon based on risk severity."""
        if severity == "高风险":
            return "🔴"
        elif severity == "中风险":
            return "🟡"
        else:
            return "🔵"

    def _build_result(self) -> dict:
        return {
            "review_id": self.context.get("review_id", ""),
            "contract_type": self.context.get("contract_type", ""),
            "confidence": self.context.get("confidence", 0.5),
            "keywords": self.context.get("keywords", []),
            "clauses": self.context.get("clauses", []),
            "risks": self.context.get("risk_result", {}).get("clauses", []),
            "matched_rules": self.context.get("matched_rules", []),
            "matched_laws": self.context.get("matched_laws", []),
            "overall_level": self.context.get("overall_level", "未知"),
            "report": self.context.get("report", ""),
            "steps": self._steps,
        }


review_agent = ReviewAgent()
