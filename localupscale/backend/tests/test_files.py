from pathlib import Path

import pytest
from PIL import Image

from app.services.files import build_output_path, probe_image, sanitize_stem, save_image


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
    assert info.size_bytes == 0


# --------------------------------------------------------------- nommage IA
def test_suffixe_upscaled_pour_le_mode_ia(sample_image: Path, out_dir: Path) -> None:
    out = build_output_path(sample_image, out_dir, 2, "png", "ia")
    assert out.name == "source_upscaled_x2.png"
    out4 = build_output_path(sample_image, out_dir, 4, "webp", "ia")
    assert out4.name == "source_upscaled_x4.webp"


def test_suffixe_redim_pour_le_mode_classique(sample_image: Path, out_dir: Path) -> None:
    """Un fichier sans IA ne doit jamais porter le nom d'un résultat IA."""
    out = build_output_path(sample_image, out_dir, 4, "png", "classique")
    assert out.name == "source_redim_x4.png"
    assert "upscaled" not in out.name


# ------------------------------------------------------------- collisions
def test_collision_avec_un_fichier_existant(sample_image: Path, out_dir: Path) -> None:
    premier = build_output_path(sample_image, out_dir, 4, "png", "ia")
    assert premier.name == "source_upscaled_x4.png"
    premier.write_bytes(b"existant")

    second = build_output_path(sample_image, out_dir, 4, "png", "ia")
    assert second.name == "source_upscaled_x4_1.png"
    second.write_bytes(b"existant aussi")

    troisieme = build_output_path(sample_image, out_dir, 4, "png", "ia")
    assert troisieme.name == "source_upscaled_x4_2.png"


def test_collision_entre_sources_homonymes_du_meme_lot(tmp_path: Path, out_dir: Path) -> None:
    """Deux images « photo.png » de dossiers différents, aucun fichier écrit.

    Sans réservation, les deux recevraient le même nom de sortie.
    """
    (a := tmp_path / "a").mkdir()
    (b := tmp_path / "b").mkdir()
    Image.new("RGB", (4, 4)).save(a / "photo.png", "PNG")
    Image.new("RGB", (4, 4)).save(b / "photo.png", "PNG")

    reserves: list[Path] = []
    p1 = build_output_path(a / "photo.png", out_dir, 2, "png", "ia", reserves)
    reserves.append(p1)
    p2 = build_output_path(b / "photo.png", out_dir, 2, "png", "ia", reserves)

    assert p1.name == "photo_upscaled_x2.png"
    assert p2.name == "photo_upscaled_x2_1.png"
    assert p1 != p2


def test_jamais_ecraser_la_source(tmp_path: Path) -> None:
    # Cas pathologique : la source porte déjà le nom que produirait la sortie.
    src = tmp_path / "photo_upscaled_x2.png"
    Image.new("RGB", (4, 4)).save(src, "PNG")
    out = build_output_path(tmp_path / "photo.png", tmp_path, 2, "png", "ia")
    assert out.resolve() != src.resolve()
    assert out.name == "photo_upscaled_x2_1.png"


# ------------------------------------------------------- noms particuliers
def test_nom_avec_plusieurs_points(tmp_path: Path, out_dir: Path) -> None:
    src = tmp_path / "photo.finale.v2.jpeg"
    Image.new("RGB", (4, 4)).save(src, "JPEG")
    out = build_output_path(src, out_dir, 2, "png", "ia")
    assert out.name == "photo.finale.v2_upscaled_x2.png"


@pytest.mark.parametrize(
    ("stem", "attendu"),
    [
        ("photo:test", "photo_test"),
        ('gui"llemets', "gui_llemets"),
        ("chemin/interdit", "chemin_interdit"),
        ("pipe|etoile*", "pipe_etoile_"),
        ("fin en points...", "fin en points"),
        ("  ", "image"),
        ("CON", "CON_"),
        ("été à Nîmes", "été à Nîmes"),  # accents et espaces préservés
    ],
)
def test_sanitize_stem(stem: str, attendu: str) -> None:
    assert sanitize_stem(stem) == attendu


def test_nom_tres_long_est_tronque(tmp_path: Path, out_dir: Path) -> None:
    long_nom = "a" * 400
    out = build_output_path(tmp_path / f"{long_nom}.png", out_dir, 2, "png", "ia")
    assert len(out.stem) < 200
    assert out.name.endswith("_upscaled_x2.png")


def test_caracteres_speciaux_produisent_un_fichier_reel(tmp_path: Path, out_dir: Path) -> None:
    src = tmp_path / "été 2024 (final).png"
    Image.new("RGB", (4, 4)).save(src, "PNG")
    out = build_output_path(src, out_dir, 2, "png", "ia")
    save_image(Image.new("RGB", (8, 8)), out, "png")
    assert out.is_file()


# ------------------------------------------------------------- écriture
def test_save_image_refuse_ecrasement(out_dir: Path) -> None:
    target = out_dir / "x.png"
    target.write_bytes(b"donnees")
    with pytest.raises(FileExistsError):
        save_image(Image.new("RGB", (4, 4)), target, "png")
    assert target.read_bytes() == b"donnees"


@pytest.mark.parametrize("fmt", ["png", "jpg", "webp"])
def test_save_image_formats(out_dir: Path, fmt: str) -> None:
    target = out_dir / f"image.{fmt}"
    save_image(Image.new("RGBA", (4, 4)), target, fmt)
    with Image.open(target) as im:
        assert im.size == (4, 4)
