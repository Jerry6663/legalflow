"""Rule retriever — load and search contract review rules via ChromaDB."""

import os
import json
from pathlib import Path
from .vector_store import vector_store

COLLECTION_NAME = "legalflow_rules"

# Path to knowledge base
_RULES_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..",
    "knowledge_base", "rules", "合同审查规则.md"
)

# Build absolute path
RULES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "knowledge_base", "rules", "合同审查规则.md")
)


class RuleRetriever:
    """Load and search contract review rules from knowledge base."""

    def __init__(self):
        self._loaded = False
        self._rule_count = 0

    def load_rules(self) -> int:
        """Parse rules from markdown and load into ChromaDB.
        
        Returns number of rules loaded.
        """
        if self._loaded:
            return self._rule_count

        rules_file = Path(RULES_PATH)
        if not rules_file.exists():
            # Try alternate path
            alt_path = Path(__file__).parent.parent.parent.parent / "knowledge_base" / "rules" / "合同审查规则.md"
            if alt_path.exists():
                rules_file = alt_path
            else:
                print(f"Rules file not found at {RULES_PATH}")
                return 0

        content = rules_file.read_text(encoding="utf-8")
        rules = self._parse_rules(content)

        if not rules:
            return 0

        documents = []
        metadatas = []
        ids = []

        for i, rule in enumerate(rules):
            documents.append(
                f"{rule['id']}: {rule['name']}\n"
                f"风险等级: {rule['level']}\n"
                f"适用类型: {rule['applicable']}\n"
                f"审查要点: {rule['checkpoint']}\n"
                f"法律依据: {rule.get('legal_basis', '')}\n"
                f"修改建议: {rule.get('suggestion', '')}"
            )
            metadatas.append({
                "rule_id": rule["id"],
                "name": rule["name"],
                "level": rule["level"],
                "applicable": rule["applicable"],
                "type": "contract_review_rule",
            })
            ids.append(f"rule_{i}_{rule['id']}")

        # Try to load into ChromaDB
        try:
            vector_store.add_documents(
                collection_name=COLLECTION_NAME,
                documents=documents,
                metadatas=metadatas,
                ids=ids,
            )
        except Exception as e:
            print(f"ChromaDB load warning (may be offline mode): {e}")
            # Even if ChromaDB fails, store rules in memory for keyword search
            self._rules_memory = rules

        self._rule_count = len(rules)
        self._loaded = True
        return self._rule_count

    def search(self, query: str, contract_type: str | None = None, 
               risk_level: str | None = None, top_k: int = 10) -> list[dict]:
        """Search for relevant rules.
        
        Args:
            query: Natural language query about the clause
            contract_type: Filter by applicable contract type
            risk_level: Filter by risk level (高/中/低)
            top_k: Number of results
            
        Returns:
            List of rules with score and content
        """
        if not self._loaded:
            self.load_rules()

        # Enrich query with contract type context
        enriched_query = query
        if contract_type:
            enriched_query = f"{contract_type}合同 {query}"

        try:
            results = vector_store.search(
                collection_name=COLLECTION_NAME,
                query=enriched_query,
                n_results=top_k,
            )
            return self._format_results(results, risk_level)
        except Exception:
            # Fallback to keyword matching if ChromaDB is unavailable
            return self._keyword_search(query, contract_type, risk_level, top_k)

    def search_for_clause(self, clause: dict, contract_type: str, 
                          top_k: int = 5) -> list[dict]:
        """Search rules relevant to a specific clause."""
        query = f"{clause.get('type', '')} {clause.get('title', '')} {clause.get('content', '')[:500]}"
        return self.search(query, contract_type=contract_type, top_k=top_k)

    def _parse_rules(self, content: str) -> list[dict]:
        """Parse rules from markdown content."""
        rules = []
        current = {}
        
        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("### R"):
                if current and "id" in current:
                    rules.append(current)
                # Parse: ### R001 - 规则名称
                parts = line.replace("### ", "").split(" - ", 1)
                current = {
                    "id": parts[0].strip() if parts else "",
                    "name": parts[1].strip() if len(parts) > 1 else "",
                    "level": "",
                    "applicable": "",
                    "checkpoint": "",
                    "legal_basis": "",
                    "suggestion": "",
                }
            elif line.startswith("**风险等级**") and current:
                current["level"] = line.split("**风险等级**", 1)[1].strip(": ：")
            elif line.startswith("**适用合同类型**") and current:
                current["applicable"] = line.split("**适用合同类型**", 1)[1].strip(": ：")
            elif line.startswith("**审查要点**") and current:
                current["checkpoint"] = line.split("**审查要点**", 1)[1].strip(": ：")
            elif line.startswith("**法律依据**") and current:
                current["legal_basis"] = line.split("**法律依据**", 1)[1].strip(": ：")
            elif line.startswith("**修改建议**") and current:
                current["suggestion"] = line.split("**修改建议**", 1)[1].strip(": ：")

        if current and "id" in current:
            rules.append(current)
        
        return rules

    def _format_results(self, results: list[dict], risk_level: str | None) -> list[dict]:
        """Format ChromaDB results with filtering."""
        formatted = []
        for r in results:
            metadata = r.get("metadata", {})
            if risk_level and metadata.get("level") != risk_level:
                continue
            formatted.append({
                "score": round(1 - r.get("distance", 0), 4) if r.get("distance") else 1.0,
                "rule": metadata.get("name", ""),
                "level": metadata.get("level", ""),
                "applicable": metadata.get("applicable", ""),
                "content": r.get("document", ""),
            })
        return formatted

    def _keyword_search(self, query: str, contract_type: str | None, 
                        risk_level: str | None, top_k: int) -> list[dict]:
        """Simple keyword-based fallback search."""
        if not hasattr(self, "_rules_memory"):
            return []
        
        results = []
        for rule in self._rules_memory:
            score = 0
            full_text = f"{rule['name']} {rule['checkpoint']} {rule.get('legal_basis', '')}"
            for word in query[:200].split():
                if word in full_text:
                    score += 1
            
            if contract_type and contract_type in rule.get("applicable", ""):
                score += 3
            if risk_level and rule.get("level") == risk_level:
                score += 2
            
            if score > 0:
                results.append({
                    "score": score,
                    "rule": rule["name"],
                    "level": rule.get("level", ""),
                    "applicable": rule.get("applicable", ""),
                    "content": f"{rule['id']}: {rule['name']}\n风险等级: {rule.get('level', '')}\n审查要点: {rule.get('checkpoint', '')}",
                })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]


rule_retriever = RuleRetriever()
