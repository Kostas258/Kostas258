"""Manipulation d'images et de chemins (Pillow).

Règles :
- ne JAMAIS écraser un fichier existant (ni la source, ni une sortie précédente) ;
- nommage des sorties, selon le mode réellement employé :
  - agrandissement IA        -> <nom>_upscaled_x2.<ext>
  - redimensionnement Pillow -> <nom>_redim_x2.<ext>
- en cas de collision, un compteur est ajouté : <base>_1, <base>_2, …
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from pathlib import Path

from PIL import Image

from app.core import config
from app.models.schemas import ImageInfo

_PIL_FORMATS = {"png": "PNG", "jpg": "JPEG", "webp": "WEBP"}

# Suffixe distinct par mode : un fichier produit sans IA ne doit jamais porter
# le nom d'un résultat Real-ESRGAN.
MODE_SUFFIXES = {"ia": "upscaled", "classique": "redim"}

# Caractères refusés par Windows, plus les caractères de contrôle.
_CARACTERES_INTERDITS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

# Noms réservés sous Windows (insensibles à la casse).
_NOMS_RESERVES = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}

# Marge confortable sous la limite de 255 octets des systèmes de fichiers.
_LONGUEUR_MAX_BASE = 150


def is_supported_input(path: Path) -> bool:
    return path.suffix.lower() in config.SUPPORTED_INPUT_FORMATS


def sanitize_stem(stem: str) -> str:
    """Rend un nom de fichier sûr sans le dénaturer.

    Les accents, espaces et points internes sont conservés (« photo.finale.v2 »
    reste intact) ; seuls les caractères réellement interdits sont remplacés.
    """
    nettoye = _CARACTERES_INTERDITS.sub("_", stem)
    # Windows refuse les espaces et points en fin de nom.
    nettoye = nettoye.rstrip(" .")
    if nettoye.upper() in _NOMS_RESERVES:
        nettoye = f"{nettoye}_"
    if not nettoye:
        nettoye = "image"
    return nettoye[:_LONGUEUR_MAX_BASE]


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
        try:
            taille = p.stat().st_size
        except OSError:
            taille = 0
        return ImageInfo(
            path=str(p),
            name=p.name,
            size_bytes=taille,
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
    mode: str = "ia",
    reserved: Iterable[str | Path] | None = None,
) -> Path:
    """Chemin de sortie unique, jamais écrasant.

    `reserved` liste les chemins déjà attribués à d'autres tâches du même lot
    mais pas encore écrits sur le disque : sans cela, deux sources homonymes
    (« a/photo.png » et « b/photo.png ») recevraient le même nom de sortie.
    """
    src = Path(input_path)
    out_dir = Path(output_dir)
    suffixe = MODE_SUFFIXES.get(mode, MODE_SUFFIXES["ia"])
    base = f"{sanitize_stem(src.stem)}_{suffixe}_x{scale}"

    deja_pris = {Path(p).resolve() for p in (reserved or ())}
    source_resolue = src.resolve()

    def est_libre(candidat: Path) -> bool:
        resolu = candidat.resolve()
        if resolu in deja_pris:
            return False
        if candidat.exists():
            return False
        return resolu != source_resolue

    candidat = out_dir / f"{base}.{output_format}"
    compteur = 1
    while not est_libre(candidat):
        candidat = out_dir / f"{base}_{compteur}.{output_format}"
        compteur += 1
    return candidat


def save_image(image: Image.Image, output_path: Path, output_format: str) -> Path:
    """Écrit l'image sans jamais remplacer un fichier existant.

    Dernière ligne de défense : même si un fichier est apparu entre le calcul
    du nom et l'écriture, rien n'est écrasé.
    """
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
