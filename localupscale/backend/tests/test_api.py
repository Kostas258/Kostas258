from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app())


def _settings(out_dir: Path, **overrides) -> dict:
    base = {
        "mode": "classique",
        "scale": 2,
        "model": "photo",
        "face_enhance": False,
        "output_format": "png",
        "output_dir": str(out_dir),
    }
    base.update(overrides)
    return base


def _ia_indisponible() -> bool:
    from app.engine import get_engine

    return not get_engine("ia").is_available()


def test_health(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["app"] == "LocalUpscale"


# ----------------------------------------------------- honnêteté du /system
def test_system_decrit_letat_reel(client: TestClient) -> None:
    r = client.get("/api/system")
    assert r.status_code == 200
    data = r.json()
    assert data["ai_engine"] == "realesrgan"
    assert "générés" in data["ai_disclaimer"]
    assert data["classic_mode_label"] == "Redimensionnement classique — sans IA"
    assert "PAS un agrandissement par IA" in data["classic_mode_warning"]


def test_system_signale_le_moteur_ia_indisponible(client: TestClient) -> None:
    if not _ia_indisponible():
        pytest.skip("Dépendances IA installées : cas non applicable.")
    data = client.get("/api/system").json()
    assert data["ai_engine_available"] is False
    assert data["ai_engine_unavailable_reason"]
    # Sans moteur IA, aucune alerte « processeur plus lent » : il n'y a pas d'IA
    # qui tourne, et le message serait trompeur.
    assert data["cpu_fallback"] is False
    assert data["cpu_fallback_warning"] is None


def test_system_signale_les_visages_indisponibles(client: TestClient) -> None:
    data = client.get("/api/system").json()
    if data["face_enhance_available"]:
        pytest.skip("GFPGAN installé et modèle présent : cas non applicable.")
    assert data["face_enhance_unavailable_reason"]
    assert "GFPGAN" in data["face_enhance_unavailable_reason"]


# ------------------------------------------------------------------ modèles
def test_liste_modeles_avec_licences(client: TestClient) -> None:
    models = client.get("/api/models").json()
    ids = {m["id"] for m in models}
    assert {"photo", "anime", "face"} <= ids
    for m in models:
        assert m["license"] and m["source_url"]


def test_telechargement_modele_sans_accord_403(client: TestClient) -> None:
    r = client.post("/api/models/photo/download", json={"accept_license": False})
    assert r.status_code == 403
    assert "licence" in r.json()["detail"].lower()


def test_probe(client: TestClient, sample_image: Path) -> None:
    r = client.post("/api/images/probe", json={"paths": [str(sample_image)], "scale": 4})
    assert r.status_code == 200
    info = r.json()[0]
    assert info["width"] == 8
    assert info["estimated_width"] == 32


# -------------------------------------------- refus explicite du traitement IA
def test_mode_ia_indisponible_refuse_avec_message_explicite(
    client: TestClient, sample_image: Path, out_dir: Path
) -> None:
    if not _ia_indisponible():
        pytest.skip("Dépendances IA installées : cas non applicable.")
    r = client.post(
        "/api/jobs",
        json={"paths": [str(sample_image)], "settings": _settings(out_dir, mode="ia")},
    )
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert "Aucun traitement IA n'a été effectué" in detail
    # Aucun fichier produit, et surtout aucun fichier « _upscaled_ » trompeur.
    assert list(out_dir.iterdir()) == []


class _FauxMoteurIA:
    """Moteur IA présent et fonctionnel, pour isoler le contrôle GFPGAN."""

    name = "realesrgan"
    is_ai = True

    def is_available(self) -> bool:
        return True

    def unavailable_reason(self) -> str | None:
        return None

    def uses_gpu(self) -> bool:
        return False


def test_visages_indisponibles_refuses(
    client: TestClient, sample_image: Path, out_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Moteur IA disponible mais GFPGAN absent : refus explicite, aucun fichier."""
    from app.api import routes

    monkeypatch.setattr(routes, "get_engine", lambda mode="ia": _FauxMoteurIA())
    monkeypatch.setattr(
        routes,
        "face_enhance_status",
        lambda *a, **k: (False, "GFPGAN n'est pas installé. Voir le README."),
    )
    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image)],
            "settings": _settings(out_dir, mode="ia", face_enhance=True),
        },
    )
    assert r.status_code == 409
    assert "GFPGAN" in r.json()["detail"]
    assert list(out_dir.iterdir()) == []


def test_visages_absents_nempechent_pas_le_reste(
    client: TestClient, sample_image: Path, out_dir: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Sans GFPGAN, un traitement sans amélioration des visages passe."""
    from app.api import routes

    monkeypatch.setattr(routes, "get_engine", lambda mode="ia": _FauxMoteurIA())
    monkeypatch.setattr(routes, "face_enhance_status", lambda *a, **k: (False, "absent"))
    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image)],
            "settings": _settings(out_dir, mode="ia", face_enhance=False),
        },
    )
    assert r.status_code == 200


def test_visages_refuses_en_mode_classique(
    client: TestClient, sample_image: Path, out_dir: Path
) -> None:
    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image)],
            "settings": _settings(out_dir, mode="classique", face_enhance=True),
        },
    )
    assert r.status_code == 422
    assert "moteur IA" in r.json()["detail"]


# ------------------------------------------------------- mode classique assumé
def test_mode_classique_produit_un_fichier_redim(
    client: TestClient, sample_image: Path, out_dir: Path
) -> None:
    r = client.post(
        "/api/jobs",
        json={"paths": [str(sample_image)], "settings": _settings(out_dir, mode="classique")},
    )
    assert r.status_code == 200
    job = r.json()[0]
    assert job["mode"] == "classique"

    client.app.state.job_queue.wait_idle()
    final = client.get(f"/api/jobs/{job['id']}").json()
    assert final["status"] == "done"
    out = Path(final["output_path"])
    assert out.is_file()
    # Jamais présenté comme un résultat Real-ESRGAN.
    assert "_redim_x2" in out.name
    assert "upscaled" not in out.name


def test_traitement_par_lot_complet(
    client: TestClient, sample_image: Path, out_dir: Path, tmp_path: Path
) -> None:
    second = tmp_path / "autre.jpg"
    Image.new("RGB", (10, 4)).save(second, "JPEG")

    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image), str(second)],
            "settings": _settings(out_dir, mode="classique"),
        },
    )
    assert r.status_code == 200
    jobs = r.json()
    assert len(jobs) == 2

    client.app.state.job_queue.wait_idle()
    finals = {j["id"]: j for j in client.get("/api/jobs").json()}
    for job in jobs:
        final = finals[job["id"]]
        assert final["status"] == "done"
        assert final["progress"] == 1.0
        assert Path(final["output_path"]).exists()

    assert sample_image.exists() and second.exists()
    assert client.get("/api/errors").json() == []


def test_lot_avec_sources_homonymes_ne_perd_aucune_image(
    client: TestClient, out_dir: Path, tmp_path: Path
) -> None:
    """Régression : deux « photo.png » distinctes dans un même lot."""
    (a := tmp_path / "dossier_a").mkdir()
    (b := tmp_path / "dossier_b").mkdir()
    Image.new("RGB", (6, 4), "red").save(a / "photo.png", "PNG")
    Image.new("RGB", (6, 4), "blue").save(b / "photo.png", "PNG")

    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(a / "photo.png"), str(b / "photo.png")],
            "settings": _settings(out_dir, mode="classique"),
        },
    )
    assert r.status_code == 200
    client.app.state.job_queue.wait_idle()

    finals = client.get("/api/jobs").json()
    assert [j["status"] for j in finals] == ["done", "done"]
    sorties = {Path(j["output_path"]).name for j in finals}
    assert sorties == {"photo_redim_x2.png", "photo_redim_x2_1.png"}
    assert client.get("/api/errors").json() == []
    assert len(list(out_dir.iterdir())) == 2


def test_erreur_consignee_dans_le_journal(client: TestClient, out_dir: Path) -> None:
    r = client.post(
        "/api/jobs",
        json={"paths": ["/chemin/inexistant.png"], "settings": _settings(out_dir)},
    )
    assert r.status_code == 200
    client.app.state.job_queue.wait_idle()
    errors = client.get("/api/errors").json()
    assert len(errors) == 1
    assert errors[0]["input_path"] == "/chemin/inexistant.png"


def test_annulation_tache(client: TestClient, sample_image: Path, out_dir: Path) -> None:
    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image)],
            "settings": _settings(out_dir, scale=4, output_format="webp"),
        },
    )
    job_id = r.json()[0]["id"]
    client.post(f"/api/jobs/{job_id}/cancel")
    client.app.state.job_queue.wait_idle()
    status = client.get(f"/api/jobs/{job_id}").json()["status"]
    assert status in {"cancelled", "done"}  # la tâche a pu se terminer avant l'annulation


def test_reglages_invalides_rejetes(client: TestClient, sample_image: Path, out_dir: Path) -> None:
    r = client.post(
        "/api/jobs",
        json={"paths": [str(sample_image)], "settings": _settings(out_dir, scale=3)},
    )
    assert r.status_code == 422


def test_mode_inconnu_rejete(client: TestClient, sample_image: Path, out_dir: Path) -> None:
    r = client.post(
        "/api/jobs",
        json={"paths": [str(sample_image)], "settings": _settings(out_dir, mode="magique")},
    )
    assert r.status_code == 422
