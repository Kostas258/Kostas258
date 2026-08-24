"""Manipulation d'images et de chemins (Pillow).

Règles :
- ne JAMAIS écraser un fichier existant (ni la source, ni une sortie précédente) ;
- nommage des sorties : <nom>_upscaled_x2.<ext> ou <nom>_upscaled_x4.<ext>.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from app.core import config
from app.models.schemas import ImageInfo

_PIL_FORMATS = {"png": "PNG", "jpg": "JPEG", "webp": "WEBP"}


def is_supported_input(path: Path) -> bool:
    return path.suffix.lower() in config.SUPPORTED_INPUT_FORMATS


def probe_image(path: str | Path, scale: int = 2) -> ImageInfo:
    """Nom, poids, résolution d'origine et résolution finale estimée."""
    p = Path(path)
    try:
        if not p.is_file():
            raise FileNotFoundError("Fichier introuvable.")
        if not is_supported_input(p):
            raise ValueError(
                f"Format non pris en charge ({p.suffix}). Formats acceptés : PNG, JPG, JPEG, WebP."
            )
        with Image.open(p) as im:
            width, height = im.size
        return ImageInfo(
            path=str(p),
            name=p.name,
            size_bytes=p.stat().st_size,
            width=width,
            height=height,
            estimated_width=width * scale,
            estimated_height=height * scale,
        )
    except Exception as exc:  # renvoyé au frontend dans le journal d'erreurs
        return ImageInfo(
            path=str(p),
            name=p.name,
            size_bytes=p.stat().st_size if p.is_file() else 0,
            width=0,
            height=0,
            estimated_width=0,
            estimated_height=0,
            error=str(exc),
        )


def build_output_path(
    input_path: str | Path,
    output_dir: str | Path,
    scale: int,
    output_format: str,
) -> Path:
    """Chemin de sortie unique : suffixe _upscaled_xN, jamais d'écrasement."""
    src = Path(input_path)
    out_dir = Path(output_dir)
    stem = f"{src.stem}_upscaled_x{scale}"
    candidate = out_dir / f"{stem}.{output_format}"
    counter = 1
    while candidate.exists() or candidate.resolve() == src.resolve():
        candidate = out_dir / f"{stem} ({counter}).{output_format}"
        counter += 1
    return candidate


def save_image(image: Image.Image, output_path: Path, output_format: str) -> Path:
    """Écrit l'image sans jamais remplacer un fichier existant."""
    if output_format not in _PIL_FORMATS:
        raise ValueError(f"Format de sortie inconnu : {output_format}")
    if output_path.exists():
        raise FileExistsError(
            f"Refus d'écraser un fichier existant : {output_path}. "
            "LocalUpscale ne remplace jamais un fichier."
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    params: dict = {}
    if output_format == "jpg":
        image = image.convert("RGB")
        params["quality"] = 95
    elif output_format == "webp":
        params["quality"] = 95
    image.save(output_path, _PIL_FORMATS[output_format], **params)
    return output_path
