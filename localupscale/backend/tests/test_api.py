from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    # Les tests utilisent le moteur Pillow (rapide, sans dépendances IA).
    monkeypatch.setenv("LOCALUPSCALE_ENGINE", "pillow")
    return TestClient(create_app())


def test_health(client: TestClient) -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["app"] == "LocalUpscale"


def test_system_expose_avertissements(client: TestClient) -> None:
    r = client.get("/api/system")
    assert r.status_code == 200
    data = r.json()
    assert data["engine"] == "pillow"
    assert data["device"] == "cpu"
    assert "générés" in data["ai_disclaimer"]


def test_liste_modeles_avec_licences(client: TestClient) -> None:
    r = client.get("/api/models")
    assert r.status_code == 200
    models = r.json()
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


def test_traitement_par_lot_complet(
    client: TestClient, sample_image: Path, out_dir: Path, tmp_path: Path
) -> None:
    second = tmp_path / "autre.jpg"
    Image.new("RGB", (10, 4)).save(second, "JPEG")

    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image), str(second)],
            "settings": {
                "scale": 2,
                "model": "photo",
                "face_enhance": False,
                "output_format": "png",
                "output_dir": str(out_dir),
            },
        },
    )
    assert r.status_code == 200
    jobs = r.json()
    assert len(jobs) == 2

    client.app.state.job_queue.wait_idle()

    r = client.get("/api/jobs")
    finals = {j["id"]: j for j in r.json()}
    for job in jobs:
        final = finals[job["id"]]
        assert final["status"] == "done"
        assert final["progress"] == 1.0
        out = Path(final["output_path"])
        assert out.exists()
        assert "_upscaled_x2" in out.name

    # Les sources sont préservées.
    assert sample_image.exists() and second.exists()
    # Journal d'erreurs vide.
    assert client.get("/api/errors").json() == []


def test_erreur_consignee_dans_le_journal(client: TestClient, out_dir: Path) -> None:
    r = client.post(
        "/api/jobs",
        json={
            "paths": ["/chemin/inexistant.png"],
            "settings": {
                "scale": 2,
                "model": "photo",
                "face_enhance": False,
                "output_format": "png",
                "output_dir": str(out_dir),
            },
        },
    )
    assert r.status_code == 200
    client.app.state.job_queue.wait_idle()
    errors = client.get("/api/errors").json()
    assert len(errors) == 1
    assert errors[0]["input_path"] == "/chemin/inexistant.png"


def test_annulation_tache_en_attente(client: TestClient, sample_image: Path, out_dir: Path) -> None:
    r = client.post(
        "/api/jobs",
        json={
            "paths": [str(sample_image)],
            "settings": {
                "scale": 4,
                "model": "anime",
                "face_enhance": False,
                "output_format": "webp",
                "output_dir": str(out_dir),
            },
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
        json={
            "paths": [str(sample_image)],
            "settings": {
                "scale": 3,
                "model": "photo",
                "face_enhance": False,
                "output_format": "png",
                "output_dir": str(out_dir),
            },
        },
    )
    assert r.status_code == 422
