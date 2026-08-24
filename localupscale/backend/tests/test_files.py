from pathlib import Path

import pytest
from PIL import Image

from app.services.files import build_output_path, probe_image, save_image


def test_probe_image_metadonnees(sample_image: Path) -> None:
    info = probe_image(sample_image, scale=4)
    assert info.name == "source.png"
    assert info.width == 8 and info.height == 6
    assert info.estimated_width == 32 and info.estimated_height == 24
    assert info.size_bytes > 0
    assert info.error is None


def test_probe_format_non_supporte(tmp_path: Path) -> None:
    bad = tmp_path / "document.gif"
    Image.new("RGB", (4, 4)).save(bad, "GIF")
    info = probe_image(bad)
    assert info.error is not None
    assert "PNG, JPG, JPEG, WebP" in info.error


def test_probe_fichier_introuvable(tmp_path: Path) -> None:
    info = probe_image(tmp_path / "absent.png")
    assert info.error is not None


def test_suffixe_upscaled(sample_image: Path, out_dir: Path) -> None:
    out = build_output_path(sample_image, out_dir, 2, "png")
    assert out.name == "source_upscaled_x2.png"
    out4 = build_output_path(sample_image, out_dir, 4, "webp")
    assert out4.name == "source_upscaled_x4.webp"


def test_jamais_ecraser_une_sortie_existante(sample_image: Path, out_dir: Path) -> None:
    first = build_output_path(sample_image, out_dir, 2, "png")
    first.write_bytes(b"existant")
    second = build_output_path(sample_image, out_dir, 2, "png")
    assert second != first
    assert second.name == "source_upscaled_x2 (1).png"


def test_jamais_ecraser_la_source(tmp_path: Path) -> None:
    # Cas pathologique : la source porte déjà le nom que produirait la sortie.
    src = tmp_path / "photo_upscaled_x2.png"
    Image.new("RGB", (4, 4)).save(src, "PNG")
    out = build_output_path(tmp_path / "photo.png", tmp_path, 2, "png")
    assert out.resolve() != src.resolve()


def test_save_image_refuse_ecrasement(out_dir: Path) -> None:
    target = out_dir / "x.png"
    target.write_bytes(b"donnees")
    with pytest.raises(FileExistsError):
        save_image(Image.new("RGB", (4, 4)), target, "png")


@pytest.mark.parametrize("fmt", ["png", "jpg", "webp"])
def test_save_image_formats(out_dir: Path, fmt: str) -> None:
    target = out_dir / f"image.{fmt}"
    save_image(Image.new("RGBA", (4, 4)), target, fmt)
    with Image.open(target) as im:
        assert im.size == (4, 4)
