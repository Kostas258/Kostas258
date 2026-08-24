"""File d'attente de traitement par lot.

Un unique thread de travail consomme les tâches (les moteurs IA saturent
déjà le GPU/CPU ; paralléliser n'apporterait rien). Chaque tâche expose sa
progression, peut être annulée, et toute erreur est consignée dans un
journal consultable par l'interface.
"""

from __future__ import annotations

import queue
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from app.engine.base import UpscaleCancelledError, UpscaleEngine, UpscaleTask
from app.models.schemas import ErrorEntry, JobInfo, UpscaleSettings
from app.services.files import build_output_path


@dataclass
class _Job:
    id: str
    task: UpscaleTask
    status: str = "pending"
    progress: float = 0.0
    error: str | None = None
    cancel_event: threading.Event = field(default_factory=threading.Event)

    def to_info(self) -> JobInfo:
        return JobInfo(
            id=self.id,
            input_path=str(self.task.input_path),
            output_path=str(self.task.output_path) if self.status == "done" else None,
            status=self.status,  # type: ignore[arg-type]
            progress=round(self.progress, 3),
            error=self.error,
        )


class JobQueue:
    def __init__(self, engine: UpscaleEngine) -> None:
        self._engine = engine
        self._jobs: dict[str, _Job] = {}
        self._order: list[str] = []
        self._queue: "queue.Queue[str]" = queue.Queue()
        self._lock = threading.Lock()
        self._errors: list[ErrorEntry] = []
        self._worker = threading.Thread(target=self._run, daemon=True)
        self._worker.start()

    # ------------------------------------------------------------------ API
    def enqueue(self, paths: list[str], settings: UpscaleSettings) -> list[JobInfo]:
        created: list[JobInfo] = []
        with self._lock:
            for raw in paths:
                src = Path(raw)
                out = build_output_path(
                    src, settings.output_dir, settings.scale, settings.output_format
                )
                job = _Job(
                    id=uuid.uuid4().hex[:12],
                    task=UpscaleTask(
                        input_path=src,
                        output_path=out,
                        scale=settings.scale,
                        model=settings.model,
                        face_enhance=settings.face_enhance,
                        output_format=settings.output_format,
                    ),
                )
                self._jobs[job.id] = job
                self._order.append(job.id)
                self._queue.put(job.id)
                created.append(job.to_info())
        return created

    def list_jobs(self) -> list[JobInfo]:
        with self._lock:
            return [self._jobs[jid].to_info() for jid in self._order]

    def get(self, job_id: str) -> JobInfo | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return job.to_info() if job else None

    def cancel(self, job_id: str) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status in {"done", "error", "cancelled"}:
                return False
            job.cancel_event.set()
            if job.status == "pending":
                job.status = "cancelled"
            return True

    def cancel_all(self) -> int:
        with self._lock:
            ids = [j for j in self._order if self._jobs[j].status in {"pending", "running"}]
        return sum(self.cancel(j) for j in ids)

    def clear_finished(self) -> int:
        with self._lock:
            done = [j for j in self._order if self._jobs[j].status in {"done", "error", "cancelled"}]
            for jid in done:
                self._order.remove(jid)
                del self._jobs[jid]
            return len(done)

    def errors(self) -> list[ErrorEntry]:
        with self._lock:
            return list(self._errors)

    def wait_idle(self, timeout: float = 30.0) -> None:
        """Attend la fin de la file (utilisé par les tests)."""
        import time

        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with self._lock:
                busy = any(
                    self._jobs[j].status in {"pending", "running"} for j in self._order
                )
            if not busy:
                return
            time.sleep(0.02)
        raise TimeoutError("La file d'attente n'a pas terminé dans le délai imparti.")

    # --------------------------------------------------------------- worker
    def _run(self) -> None:
        while True:
            job_id = self._queue.get()
            with self._lock:
                job = self._jobs.get(job_id)
                if job is None or job.status != "pending":
                    continue
                job.status = "running"

            def on_progress(value: float, j: _Job = job) -> None:
                j.progress = max(0.0, min(1.0, value))

            try:
                self._engine.upscale(job.task, on_progress, job.cancel_event)
                with self._lock:
                    job.status = "done"
                    job.progress = 1.0
            except UpscaleCancelledError:
                with self._lock:
                    job.status = "cancelled"
            except Exception as exc:
                with self._lock:
                    job.status = "error"
                    job.error = str(exc)
                    self._errors.append(
                        ErrorEntry(
                            job_id=job.id,
                            input_path=str(job.task.input_path),
                            message=str(exc),
                        )
                    )
