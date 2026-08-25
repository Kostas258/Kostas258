"""Routes de l'API locale (consommée par le frontend Tauri sur 127.0.0.1)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.core import config
from app.engine import face_enhance_status, get_engine, registry
from app.engine.registry import LicenseNotAcceptedError
from app.models.schemas import (
    ErrorEntry,
    ImageInfo,
    JobCreateRequest,
    JobInfo,
    ModelDownloadRequest,
    ModelInfo,
    ProbeRequest,
    SystemInfo,
)
from app.services.files import probe_image
from app.services.jobs import JobQueue

router = APIRouter()


def _queue(request: Request) -> JobQueue:
    return request.app.state.job_queue


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "app": "LocalUpscale"}


@router.get("/system", response_model=SystemInfo)
def system() -> SystemInfo:
    """État réel du système : ce qui est disponible, et ce qui ne l'est pas."""
    ia = get_engine("ia")
    ia_disponible = ia.is_available()
    gpu = ia.uses_gpu()
    # Le mode processeur ne concerne que le moteur IA : il est plus lent,
    # mais il produit bien des détails générés. À ne pas confondre avec le
    # mode classique, qui n'utilise aucune IA.
    sur_processeur = ia_disponible and not gpu
    visages_ok, visages_raison = face_enhance_status()
    return SystemInfo(
        ai_engine=ia.name,
        ai_engine_available=ia_disponible,
        ai_engine_unavailable_reason=ia.unavailable_reason(),
        device="gpu" if gpu else "cpu",
        cpu_fallback=sur_processeur,
        cpu_fallback_warning=config.CPU_FALLBACK_WARNING_FR if sur_processeur else None,
        face_enhance_available=visages_ok,
        face_enhance_unavailable_reason=visages_raison,
        classic_mode_label=config.CLASSIC_MODE_LABEL_FR,
        classic_mode_warning=config.CLASSIC_MODE_WARNING_FR,
        ai_disclaimer=config.AI_DISCLAIMER_FR,
    )


@router.get("/models", response_model=list[ModelInfo])
def list_models() -> list[ModelInfo]:
    return [_model_info(spec.id) for spec in registry.MODELS.values()]


def _model_info(model_id: str) -> ModelInfo:
    spec = registry.MODELS[model_id]
    return ModelInfo(
        id=spec.id,
        label=spec.label,
        description=spec.description,
        license=spec.license,
        source_url=spec.source_url,
        download_url=spec.download_url,
        file_name=spec.file_name,
        downloaded=registry.is_downloaded(spec.id),
    )


@router.post("/models/{model_id}/download", response_model=ModelInfo)
def download_model(model_id: str, body: ModelDownloadRequest) -> ModelInfo:
    if model_id not in registry.MODELS:
        raise HTTPException(404, f"Modèle inconnu : {model_id}")
    try:
        registry.download_model(model_id, accept_license=body.accept_license)
    except LicenseNotAcceptedError as exc:
        raise HTTPException(403, str(exc)) from exc
    except OSError as exc:
        raise HTTPException(502, f"Échec du téléchargement : {exc}") from exc
    return _model_info(model_id)


@router.post("/images/probe", response_model=list[ImageInfo])
def probe(body: ProbeRequest) -> list[ImageInfo]:
    return [probe_image(p, body.scale) for p in body.paths]


@router.post("/jobs", response_model=list[JobInfo])
def create_jobs(body: JobCreateRequest, request: Request) -> list[JobInfo]:
    settings = body.settings
    if settings.scale not in config.SUPPORTED_SCALES:
        raise HTTPException(422, "Facteur d'agrandissement invalide (x2 ou x4).")
    if settings.output_format not in config.SUPPORTED_OUTPUT_FORMATS:
        raise HTTPException(422, "Format de sortie invalide (png, jpg ou webp).")

    if settings.mode == "ia":
        # Refus en amont plutôt qu'un échec par image : l'utilisateur sait
        # immédiatement qu'aucun traitement IA ne sera effectué.
        ia = get_engine("ia")
        if not ia.is_available():
            raise HTTPException(
                409,
                config.ai_engine_unavailable_message(ia.unavailable_reason() or ""),
            )
        if settings.face_enhance:
            disponible, raison = face_enhance_status()
            if not disponible:
                raise HTTPException(409, raison or "Amélioration des visages indisponible.")
    elif settings.face_enhance:
        raise HTTPException(
            422,
            "L'amélioration des visages relève du moteur IA et ne s'applique pas "
            f"au mode « {config.CLASSIC_MODE_LABEL_FR} ».",
        )

    return _queue(request).enqueue(body.paths, settings)


@router.get("/jobs", response_model=list[JobInfo])
def list_jobs(request: Request) -> list[JobInfo]:
    return _queue(request).list_jobs()


@router.get("/jobs/{job_id}", response_model=JobInfo)
def get_job(job_id: str, request: Request) -> JobInfo:
    info = _queue(request).get(job_id)
    if info is None:
        raise HTTPException(404, "Tâche introuvable.")
    return info


@router.post("/jobs/{job_id}/cancel")
def cancel_job(job_id: str, request: Request) -> dict:
    return {"cancelled": _queue(request).cancel(job_id)}


@router.post("/jobs/cancel-all")
def cancel_all(request: Request) -> dict:
    return {"cancelled": _queue(request).cancel_all()}


@router.delete("/jobs/finished")
def clear_finished(request: Request) -> dict:
    return {"removed": _queue(request).clear_finished()}


@router.get("/errors", response_model=list[ErrorEntry])
def errors(request: Request) -> list[ErrorEntry]:
    return _queue(request).errors()
