"""Schémas Pydantic de l'API locale."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Scale = Literal[2, 4]
ModelKind = Literal["photo", "anime"]
OutputFormat = Literal["png", "jpg", "webp"]
JobStatus = Literal["pending", "running", "done", "error", "cancelled"]

# Deux traitements distincts, jamais interchangeables :
# - "ia"        : agrandissement Real-ESRGAN (détails générés) ;
# - "classique" : rééchantillonnage Pillow, sans IA, choisi explicitement.
ProcessingMode = Literal["ia", "classique"]


class UpscaleSettings(BaseModel):
    """Réglages choisis par l'utilisateur."""

    mode: ProcessingMode = "ia"
    scale: Scale = 2
    model: ModelKind = "photo"
    face_enhance: bool = False  # « Améliorer les visages » — désactivé par défaut
    output_format: OutputFormat = "png"
    output_dir: str


class ProbeRequest(BaseModel):
    paths: list[str]
    scale: Scale = 2


class ImageInfo(BaseModel):
    path: str
    name: str
    size_bytes: int
    width: int
    height: int
    estimated_width: int
    estimated_height: int
    error: str | None = None


class JobCreateRequest(BaseModel):
    paths: list[str] = Field(min_length=1)
    settings: UpscaleSettings


class JobInfo(BaseModel):
    id: str
    input_path: str
    output_path: str | None = None
    # Le mode suit la tâche jusqu'au résultat : l'interface ne doit jamais
    # présenter une sortie « classique » comme un résultat Real-ESRGAN.
    mode: ProcessingMode
    status: JobStatus
    progress: float = 0.0
    error: str | None = None


class ErrorEntry(BaseModel):
    job_id: str
    input_path: str
    message: str


class SystemInfo(BaseModel):
    ai_engine: str
    ai_engine_available: bool
    ai_engine_unavailable_reason: str | None = None
    device: Literal["gpu", "cpu"]
    cpu_fallback: bool
    cpu_fallback_warning: str | None = None
    face_enhance_available: bool
    face_enhance_unavailable_reason: str | None = None
    classic_mode_label: str
    classic_mode_warning: str
    ai_disclaimer: str


class ModelInfo(BaseModel):
    id: str
    label: str
    description: str
    license: str
    source_url: str
    download_url: str
    file_name: str
    downloaded: bool


class ModelDownloadRequest(BaseModel):
    # L'utilisateur doit accepter explicitement le téléchargement et la licence.
    accept_license: bool = False
