"""Async task queue — enables thousands of concurrent submissions.

Pattern: fire-and-forget with polling.
Accept unlimited review requests instantly → background processing → frontend polls.

This decouples HTTP concurrency from LLM processing capacity.
"""

import asyncio
from .review_agent import review_agent

# In-memory task store: job_id → {status, result, error}
_jobs: dict[str, dict] = {}
_queue: asyncio.Queue = asyncio.Queue()
_worker_started = False
_worker_lock = asyncio.Lock()


async def _worker():
    """Background worker — processes one review at a time."""
    while True:
        job_id, text, contract_type = await _queue.get()
        try:
            _jobs[job_id]["status"] = "processing"
            result = await asyncio.to_thread(
                review_agent.run,
                text=text,
                contract_type=contract_type,
            )
            _jobs[job_id]["status"] = "done"
            _jobs[job_id]["result"] = result
        except Exception as e:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"] = str(e)[:500]
        finally:
            _queue.task_done()


async def _ensure_worker():
    global _worker_started
    if not _worker_started:
        async with _worker_lock:
            if not _worker_started:
                _worker_started = True
                asyncio.create_task(_worker())


async def submit_review(text: str, contract_type: str = "通用") -> str:
    """Submit a review job. Returns job_id instantly.

    User doesn't wait — they get a job_id immediately and poll for results.
    Supports 1000+ concurrent submissions with zero queuing at HTTP layer.
    """
    import uuid
    await _ensure_worker()

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "status": "queued",
        "queue_position": _queue.qsize() + 1,
        "result": None,
        "error": None,
    }

    await _queue.put((job_id, text, contract_type))
    return job_id


def get_job_status(job_id: str) -> dict | None:
    """Poll for job status and result.

    Returns None if job_id not found.
    Returns {"status": "queued|processing|done|error", "result": {...}, "error": "..."}
    """
    job = _jobs.get(job_id)
    if not job:
        return None
    return {
        "status": job["status"],
        "queue_position": _queue.qsize() if job["status"] == "queued" else 0,
        "result": job["result"],
        "error": job.get("error"),
    }


def get_queue_stats() -> dict:
    """Get current queue statistics for monitoring."""
    return {
        "queued": _queue.qsize(),
        "total_jobs": len(_jobs),
        "processing": sum(1 for j in _jobs.values() if j["status"] == "processing"),
        "completed": sum(1 for j in _jobs.values() if j["status"] == "done"),
    }
