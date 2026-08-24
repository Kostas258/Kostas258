"""Catalogue des modèles Real-ESRGAN.

Règle stricte : AUCUN téléchargement automatique. Un modèle n'est récupéré
que si l'utilisateur accepte explicitement (accept_license=True), et
l'interface affiche la licence et la source avant l'accord.
"""

from __future__ import annotations

import urllib.request
from dataclasses import dataclass
from pathlib import Path

from app.core import config

_REALESRGAN_RELEASES = "https://github.com/xinntao/Real-ESRGAN/releases/download"


@dataclass(frozen=True)
class ModelSpec:
    id: str
    label: str
    description: str
    license: str
    source_url: str
    download_url: str
    file_name: str


MODELS: dict[str, ModelSpec] = {
    "photo": ModelSpec(
        id="photo",
        label="Photo",
        description="RealESRGAN_x4plus — photos et images réalistes.",
        license="BSD 3-Clause (code Real-ESRGAN) — vérifier la page source",
        source_url="https://github.com/xinntao/Real-ESRGAN",
        download_url=f"{_REALESRGAN_RELEASES}/v0.1.0/RealESRGAN_x4plus.pth",
        file_name="RealESRGAN_x4plus.pth",
    ),
    "anime": ModelSpec(
        id="anime",
        label="Illustration / anime",
        description="RealESRGAN_x4plus_anime_6B — dessins, illustrations et anime.",
        license="BSD 3-Clause (code Real-ESRGAN) — vérifier la page source",
        source_url="https://github.com/xinntao/Real-ESRGAN",
        download_url=f"{_REALESRGAN_RELEASES}/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
        file_name="RealESRGAN_x4plus_anime_6B.pth",
    ),
    "face": ModelSpec(
        id="face",
        label="Amélioration des visages (GFPGAN)",
        description="GFPGANv1.4 — utilisé uniquement si « Améliorer les visages » est activé.",
        license="Apache 2.0 (code GFPGAN) — vérifier la page source",
        source_url="https://github.com/TencentARC/GFPGAN",
        download_url="https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth",
        file_name="GFPGANv1.4.pth",
    ),
}


class LicenseNotAcceptedError(RuntimeError):
    """Téléchargement refusé : l'utilisateur n'a pas accepté la licence."""


def model_path(model_id: str, models_dir: Path | None = None) -> Path:
    spec = MODELS[model_id]
    return (models_dir or config.MODELS_DIR) / spec.file_name


def is_downloaded(model_id: str, models_dir: Path | None = None) -> bool:
    return model_path(model_id, models_dir).is_file()


def download_model(
    model_id: str,
    accept_license: bool,
    models_dir: Path | None = None,
) -> Path:
    """Télécharge un modèle UNIQUEMENT avec l'accord explicite de l'utilisateur."""
    if model_id not in MODELS:
        raise KeyError(f"Modèle inconnu : {model_id}")
    if not accept_license:
        raise LicenseNotAcceptedError(
            "Téléchargement refusé : vous devez accepter la licence du modèle "
            f"({MODELS[model_id].license}) avant de le récupérer depuis "
            f"{MODELS[model_id].source_url}."
        )
    dest = model_path(model_id, models_dir)
    if dest.is_file():
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    urllib.request.urlretrieve(MODELS[model_id].download_url, tmp)  # noqa: S310
    tmp.replace(dest)
    return dest
