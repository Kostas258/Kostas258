import threading
from pathlib import Path

import pytest
from PIL import Image

from app.engine.base import UpscaleCancelledError, UpscaleTask
from app.engine.pillow_engine import PillowEngine
from app.engine.realesrgan_engine import RealESRGANEngine, face_enhance_status
from app.engine.selector import get_engine


@pytest.mark.parametrize("scale", [2, 4])
def test_moteur_classique_dimensions(sample_image: Path, out_dir: Path, scale: int) -> None:
    engine = PillowEngine()
    task = UpscaleTask(
        input_path=sample_image,
        output_path=out_dir / f"source_redim_x{scale}.png",
        scale=scale,
        model="photo",
        mode="classique",
    )
    steps: list[float] = []
    result = engine.upscale(task, progress=steps.append)
    with Image.open(result) as im:
        assert im.size == (8 * scale, 6 * scale)
    assert steps and steps[-1] == 1.0
    # La source est intacte.
    with Image.open(sample_image) as im:
        assert im.size == (8, 6)


def test_moteur_classique_nest_pas_de_lia() -> None:
    assert PillowEngine().is_ai is False
    assert RealESRGANEngine().is_ai is True


def test_moteur_classique_annulation(sample_image: Path, out_dir: Path) -> None:
    engine = PillowEngine()
    cancel = threading.Event()
    cancel.set()
    task = UpscaleTask(
        input_path=sample_image,
        output_path=out_dir / "annule.png",
        scale=2,
        model="photo",
        mode="classique",
    )
    with pytest.raises(UpscaleCancelledError):
        engine.upscale(task, cancel_event=cancel)
    assert not (out_dir / "annule.png").exists()


# ------------------------------------------------- sélection stricte du moteur
def test_selector_mode_ia_donne_realesrgan() -> None:
    assert get_engine("ia").name == "realesrgan"


def test_selector_mode_classique_donne_pillow() -> None:
    assert get_engine("classique").name == "pillow"


def test_selector_refuse_un_mode_inconnu() -> None:
    with pytest.raises(ValueError, match="Mode de traitement inconnu"):
        get_engine("magique")


def test_aucun_repli_silencieux_vers_le_mode_sans_ia() -> None:
    """Le mode « ia » ne doit jamais retomber sur Pillow."""
    moteur = get_engine("ia")
    assert moteur.is_ai is True
    assert moteur.name != "pillow"


def test_moteur_ia_indisponible_leve_une_erreur_explicite(
    sample_image: Path, out_dir: Path
) -> None:
    """Sans torch/realesrgan, aucun fichier ne doit être produit."""
    engine = RealESRGANEngine()
    if engine.is_available():
        pytest.skip("Dépendances IA installées : cas non applicable.")

    from app.engine.base import EngineUnavailableError

    task = UpscaleTask(
        input_path=sample_image,
        output_path=out_dir / "jamais_ecrit.png",
        scale=2,
        model="photo",
        mode="ia",
    )
    with pytest.raises(EngineUnavailableError, match="dépendances IA"):
        engine.upscale(task)
    assert not (out_dir / "jamais_ecrit.png").exists()
    assert engine.unavailable_reason() is not None


# ------------------------------------------------------------ statut GFPGAN
def test_statut_visages_sans_gfpgan(tmp_path: Path) -> None:
    disponible, raison = face_enhance_status(models_dir=tmp_path)
    try:
        import gfpgan  # noqa: F401
    except ImportError:
        assert disponible is False
        assert raison is not None
        assert "GFPGAN" in raison
        return
    # gfpgan installé mais modèle absent du dossier temporaire.
    assert disponible is False
    assert raison is not None and "GFPGANv1.4" in raison
