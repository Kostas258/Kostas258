import threading
from pathlib import Path

import pytest
from PIL import Image

from app.engine.base import UpscaleCancelledError, UpscaleTask
from app.engine.pillow_engine import PillowEngine
from app.engine.selector import get_engine


@pytest.mark.parametrize("scale", [2, 4])
def test_pillow_engine_dimensions(sample_image: Path, out_dir: Path, scale: int) -> None:
    engine = PillowEngine()
    task = UpscaleTask(
        input_path=sample_image,
        output_path=out_dir / f"source_upscaled_x{scale}.png",
        scale=scale,
        model="photo",
    )
    steps: list[float] = []
    result = engine.upscale(task, progress=steps.append)
    with Image.open(result) as im:
        assert im.size == (8 * scale, 6 * scale)
    assert steps and steps[-1] == 1.0
    # La source est intacte.
    with Image.open(sample_image) as im:
        assert im.size == (8, 6)


def test_pillow_engine_annulation(sample_image: Path, out_dir: Path) -> None:
    engine = PillowEngine()
    cancel = threading.Event()
    cancel.set()
    task = UpscaleTask(
        input_path=sample_image,
        output_path=out_dir / "annule.png",
        scale=2,
        model="photo",
    )
    with pytest.raises(UpscaleCancelledError):
        engine.upscale(task, cancel_event=cancel)
    assert not (out_dir / "annule.png").exists()


def test_selector_force_pillow() -> None:
    engine = get_engine(force="pillow")
    assert engine.name == "pillow"
    assert engine.is_ai is False


def test_selector_replis_sans_ia(monkeypatch: pytest.MonkeyPatch) -> None:
    # Sans torch/realesrgan installés, le sélecteur doit retomber sur Pillow.
    from app.engine import selector

    selector.reset_engine_cache()
    monkeypatch.delenv("LOCALUPSCALE_ENGINE", raising=False)
    engine = get_engine()
    assert engine.is_available()
