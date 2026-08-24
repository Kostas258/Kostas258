"""Point d'entrée du backend LocalUpscale.

Serveur strictement local (127.0.0.1) : aucune donnée, aucune image ne quitte
la machine. Pas de compte, pas de clé API, pas de télémétrie.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.routes import router
from app.engine import get_engine
from app.services.jobs import JobQueue


def create_app() -> FastAPI:
    app = FastAPI(
        title="LocalUpscale",
        version=__version__,
        description="Upscaler d'images par IA, 100 % local et hors ligne.",
    )
    # Seule l'application Tauri locale (et le serveur de dev Vite) consomme l'API.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:1420",
            "http://127.0.0.1:1420",
            "tauri://localhost",
        ],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.engine = get_engine()
    app.state.job_queue = JobQueue(app.state.engine)
    app.include_router(router, prefix="/api")
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    from app.core import config

    uvicorn.run(app, host=config.HOST, port=config.PORT)
