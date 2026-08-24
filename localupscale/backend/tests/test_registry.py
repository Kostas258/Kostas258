from pathlib import Path

import pytest

from app.engine import registry


def test_catalogue_expose_licence_et_source() -> None:
    for spec in registry.MODELS.values():
        assert spec.license
        assert spec.source_url.startswith("https://")
        assert spec.download_url.startswith("https://")


def test_telechargement_refuse_sans_accord(tmp_path: Path) -> None:
    with pytest.raises(registry.LicenseNotAcceptedError):
        registry.download_model("photo", accept_license=False, models_dir=tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_modele_deja_present_pas_de_reseau(tmp_path: Path) -> None:
    weights = tmp_path / registry.MODELS["photo"].file_name
    weights.write_bytes(b"poids factices")
    # Aucun accès réseau nécessaire : le fichier existe déjà.
    result = registry.download_model("photo", accept_license=True, models_dir=tmp_path)
    assert result == weights
    assert registry.is_downloaded("photo", models_dir=tmp_path)


def test_modele_inconnu(tmp_path: Path) -> None:
    with pytest.raises(KeyError):
        registry.download_model("inexistant", accept_license=True, models_dir=tmp_path)
