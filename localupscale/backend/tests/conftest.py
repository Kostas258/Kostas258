from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image


@pytest.fixture()
def sample_image(tmp_path: Path) -> Path:
    """Petite image PNG 8x6 pour les tests."""
    path = tmp_path / "source.png"
    Image.new("RGB", (8, 6), color=(120, 30, 200)).save(path, "PNG")
    return path


@pytest.fixture()
def out_dir(tmp_path: Path) -> Path:
    d = tmp_path / "sorties"
    d.mkdir()
    return d
