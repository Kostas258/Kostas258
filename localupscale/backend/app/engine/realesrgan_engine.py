"""Moteur Real-ESRGAN exécuté localement (PyTorch).

- GPU (CUDA/MPS) si disponible, sinon exécution sur processeur (nettement plus lent).
- Les poids de modèles doivent avoir été téléchargés avec l'accord explicite
  de l'utilisateur (voir registry.py) : rien n'est récupéré ici.
- Si les dépendances manquent, le moteur échoue avec un message explicite ;
  il ne bascule JAMAIS vers un traitement sans IA.
"""

from __future__ import annotations

import threading
from pathlib import Path

from app.engine import registry
from app.engine.base import (
    EngineUnavailableError,
    ProgressCallback,
    UpscaleCancelledError,
    UpscaleEngine,
    UpscaleTask,
)

_RAISON_DEPENDANCES_IA = (
    "Les dépendances IA ne sont pas installées. "
    "Exécutez : pip install -e '.[ia]' dans le dossier backend."
)

_RAISON_GFPGAN_ABSENT = (
    "GFPGAN n'est pas installé. L'amélioration des visages nécessite "
    "l'installation séparée : pip install -e '.[visages]' dans le dossier backend."
)

_RAISON_GFPGAN_MODELE = (
    "Le modèle GFPGANv1.4 n'est pas téléchargé. Récupérez-le depuis l'écran "
    "« Modèles IA » (affichage de la licence et accord explicite requis)."
)


def face_enhance_status(models_dir: Path | None = None) -> tuple[bool, str | None]:
    """L'option « Améliorer les visages » est-elle réellement utilisable ?

    Retourne (disponible, raison_indisponibilité). L'interface s'en sert pour
    désactiver l'option plutôt que de laisser croire qu'elle fonctionne.
    """
    try:
        import gfpgan  # noqa: F401
    except ImportError:
        return False, _RAISON_GFPGAN_ABSENT
    if not registry.is_downloaded("face", models_dir):
        return False, _RAISON_GFPGAN_MODELE
    return True, None


def _check_cancel(cancel_event: threading.Event | None) -> None:
    if cancel_event is not None and cancel_event.is_set():
        raise UpscaleCancelledError("Traitement annulé par l'utilisateur.")


class RealESRGANEngine(UpscaleEngine):
    name = "realesrgan"
    is_ai = True

    def __init__(self, models_dir: Path | None = None) -> None:
        self._models_dir = models_dir

    # ------------------------------------------------------------------ état
    def is_available(self) -> bool:
        try:
            import realesrgan  # noqa: F401
            import torch  # noqa: F401
        except ImportError:
            return False
        return True

    def unavailable_reason(self) -> str | None:
        return None if self.is_available() else _RAISON_DEPENDANCES_IA

    def uses_gpu(self) -> bool:
        try:
            import torch

            return bool(
                torch.cuda.is_available()
                or (hasattr(torch.backends, "mps") and torch.backends.mps.is_available())
            )
        except ImportError:
            return False

    # ------------------------------------------------------------- traitement
    def _build_upsampler(self, task: UpscaleTask):
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer

        weights = registry.model_path(task.model, self._models_dir)
        if not weights.is_file():
            raise EngineUnavailableError(
                f"Le modèle « {task.model} » n'est pas installé. "
                "Téléchargez-le depuis l'écran Modèles (accord de licence requis)."
            )
        if task.model == "anime":
            net = RRDBNet(
                num_in_ch=3, num_out_ch=3, num_feat=64, num_block=6, num_grow_ch=32, scale=4
            )
        else:
            net = RRDBNet(
                num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4
            )
        return RealESRGANer(
            scale=4,
            model_path=str(weights),
            model=net,
            tile=256,  # découpage en tuiles : limite la mémoire, GPU comme processeur
            half=self.uses_gpu(),
            device=None if self.uses_gpu() else "cpu",
        )

    def upscale(
        self,
        task: UpscaleTask,
        progress: ProgressCallback | None = None,
        cancel_event: threading.Event | None = None,
    ) -> Path:
        # La disponibilité est vérifiée AVANT tout import lourd : sans cela,
        # l'utilisateur recevrait un ModuleNotFoundError brut au lieu du
        # message expliquant qu'aucun traitement IA n'a été effectué.
        if not self.is_available():
            raise EngineUnavailableError(_RAISON_DEPENDANCES_IA)
        if task.face_enhance:
            disponible, raison = face_enhance_status(self._models_dir)
            if not disponible:
                raise EngineUnavailableError(raison or _RAISON_GFPGAN_ABSENT)
        _check_cancel(cancel_event)
        if progress:
            progress(0.05)

        import numpy as np
        from PIL import Image

        upsampler = self._build_upsampler(task)
        _check_cancel(cancel_event)
        if progress:
            progress(0.15)

        with Image.open(task.input_path) as im:
            arr = np.array(im.convert("RGB"))

        output, _ = upsampler.enhance(arr, outscale=task.scale)
        _check_cancel(cancel_event)
        if progress:
            progress(0.80)

        if task.face_enhance:
            output = self._enhance_faces(output)
            _check_cancel(cancel_event)

        result = Image.fromarray(output)
        from app.services.files import save_image

        save_image(result, task.output_path, task.output_format)
        if progress:
            progress(1.0)
        return task.output_path

    def _enhance_faces(self, arr):
        """Restauration de visages via GFPGAN (installation séparée requise)."""
        from gfpgan import GFPGANer

        weights = registry.model_path("face", self._models_dir)
        restorer = GFPGANer(model_path=str(weights), upscale=1, arch="clean")
        _, _, restored = restorer.enhance(arr, has_aligned=False, only_center_face=False)
        return restored if restored is not None else arr
