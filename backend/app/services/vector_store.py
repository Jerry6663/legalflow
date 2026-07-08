"""Vector store service — ChromaDB (lazy loading)."""

import os
from ..core.config import settings


def _get_chromadb():
    """Lazy import chromadb to avoid crashes when unavailable."""
    import chromadb
    return chromadb

chromadb_module = None
Settings = None
try:
    chromadb_module = _get_chromadb()
    Settings = chromadb_module.config.Settings
except Exception:
    pass


class VectorStore:
    """ChromaDB vector store for legal document retrieval (RAG).

    Uses ChromaDB's default embedding function (all-MiniLM-L6-v2)
    to avoid heavyweight sentence-transformers dependency.
    """

    def __init__(self, persist_dir: str | None = None):
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIR
        os.makedirs(self.persist_dir, exist_ok=True)
        self._client = None
        self._collections = {}

    @property
    def client(self):
        if self._client is None:
            if chromadb_module is None or Settings is None:
                raise RuntimeError("ChromaDB is not available on this platform")
            self._client = chromadb_module.PersistentClient(
                path=self.persist_dir,
                settings=Settings(anonymized_telemetry=False),
            )
        return self._client

    def get_collection(self, name: str):
        """Get or create a collection."""
        if name not in self._collections:
            self._collections[name] = self.client.get_or_create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"},
            )
        return self._collections[name]

    def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: list[dict],
        ids: list[str],
    ):
        """Add documents to a collection."""
        collection = self.get_collection(collection_name)
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )

    def search(
        self,
        collection_name: str,
        query: str,
        n_results: int = 5,
    ) -> list[dict]:
        """Search for similar documents."""
        collection = self.get_collection(collection_name)
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
        )
        output = []
        for i in range(len(results["ids"][0])):
            output.append({
                "id": results["ids"][0][i],
                "document": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i] if results.get("distances") else None,
            })
        return output

    def delete_collection(self, name: str):
        """Delete a collection."""
        self.client.delete_collection(name)
        if name in self._collections:
            del self._collections[name]


vector_store = VectorStore()
