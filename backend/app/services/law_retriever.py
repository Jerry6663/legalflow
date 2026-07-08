"""Law retriever — search Chinese legal provisions."""

import os
import re
from pathlib import Path


class LawEntry:
    def __init__(self, source: str, article: str, content: str, keywords: list[str] | None = None):
        self.source = source
        self.article = article
        self.content = content
        self.keywords = keywords or []


class LawRetriever:
    """Search legal provisions from knowledge base."""

    def __init__(self):
        self._laws: list[LawEntry] = []
        self._loaded = False

    def load(self) -> int:
        """Load all law files from knowledge_base/laws/"""
        if self._loaded:
            return len(self._laws)

        laws_dir = Path(__file__).parent.parent.parent.parent / "knowledge_base" / "laws"
        if not laws_dir.exists():
            return 0

        for md_file in sorted(laws_dir.glob("*.md")):
            if md_file.name == "README.md":
                continue
            source = self._source_from_filename(md_file.name)
            entries = self._parse_file(md_file, source)
            self._laws.extend(entries)

        self._loaded = True
        return len(self._laws)

    def search(self, query: str, contract_type: str | None = None, top_k: int = 5,
               source_filter: str | None = None) -> list[dict]:
        """Search laws by keyword matching.

        Args:
            query: Natural language query or clause content
            contract_type: For relevance weighting
            top_k: Max results
            source_filter: Limit to specific law source (e.g. "民法典")
        """
        if not self._loaded:
            self.load()

        query_lower = query.lower()
        query_words = set(query_lower.split())

        scored = []
        for law in self._laws:
            if source_filter and source_filter not in law.source:
                continue

            score = 0
            # Exact article match
            if law.article in query:
                score += 10

            # Keyword match in content
            content_lower = law.content.lower()
            for word in query_words:
                if len(word) >= 2 and word in content_lower:
                    score += 2
                if word in " ".join(law.keywords):
                    score += 3

            # Contract type relevance
            if contract_type:
                type_kw = {
                    "买卖合同": ["买卖", "价款", "交付", "质量"],
                    "劳务合同": ["劳务", "劳动", "雇佣", "报酬"],
                    "技术开发合同": ["技术", "开发", "知识产权", "成果"],
                    "保密协议": ["保密", "商业秘密", "机密"],
                }
                for kw in type_kw.get(contract_type, []):
                    if kw in law.content:
                        score += 2

            if score > 0:
                scored.append((score, law))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, law in scored[:top_k]:
            results.append({
                "score": score,
                "source": law.source,
                "article": law.article,
                "content": law.content[:300],
                "relevance": "高" if score >= 8 else "中" if score >= 4 else "低",
            })
        return results

    def search_for_risk(self, risk_type: str, clause_content: str, top_k: int = 3) -> list[dict]:
        """Search laws relevant for a specific risk type."""
        query = f"{risk_type} {clause_content[:200]}"
        return self.search(query, top_k=top_k)

    def _source_from_filename(self, filename: str) -> str:
        name = filename.replace(".md", "")
        mapping = {
            "民法典合同编要点": "民法典·合同编",
            "劳动法要点": "劳动法",
            "公司法要点": "公司法",
        }
        return mapping.get(name, name)

    def _parse_file(self, filepath: Path, source: str) -> list[LawEntry]:
        """Parse markdown file into LawEntry objects."""
        content = filepath.read_text(encoding="utf-8")
        entries = []

        # Pattern: ### 第XXX条 or ### 第XXX条 - 标题
        pattern = r'###\s+(第[^：\n]+(?:条|[条款]))[：\s]*([^\n]*)'
        matches = re.findall(pattern, content)

        # Alternative: look for article numbers in content blocks
        if not matches:
            sections = re.split(r'\n###\s+', content)
            for section in sections:
                lines = section.strip().split('\n', 2)
                if not lines:
                    continue
                article = lines[0].strip()
                body = lines[-1].strip() if len(lines) > 1 else ""
                if len(body) > 10:
                    entries.append(LawEntry(
                        source=source,
                        article=article[:50],
                        content=body[:500],
                        keywords=self._extract_keywords(body),
                    ))
            return entries

        for article, title in matches:
            full_text = f"{article} {title}".strip()
            idx = content.find(full_text)
            if idx >= 0:
                body_start = idx + len(full_text)
                rest = content[body_start:]
                next_section = rest.find("\n###")
                body = rest[:next_section].strip() if next_section > 0 else rest.strip()
            else:
                body = ""

            if len(body) > 5:
                entries.append(LawEntry(
                    source=source,
                    article=full_text[:60],
                    content=body[:500],
                    keywords=self._extract_keywords(body),
                ))

        return entries

    def _extract_keywords(self, text: str) -> list[str]:
        """Extract legal keywords from text."""
        legal_terms = [
            "合同", "违约", "赔偿", "解除", "无效", "撤销", "变更",
            "履行", "交付", "价款", "知识产权", "保密", "管辖", "仲裁",
            "责任", "义务", "权利", "效力", "期限", "终止", "公司",
            "股东", "劳动", "工资", "解雇", "加班", "工伤", "侵权",
        ]
        found = [t for t in legal_terms if t in text]
        return list(set(found))


law_retriever = LawRetriever()
