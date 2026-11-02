
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.organizations import router as organizations_router
from app.api.routes.gudielines import router as guidelines_router
from app.api.routes.products import router as products_router
from app.api.routes.documents import router as documents_router
from app.api.routes.governance import router as governance_router
from app.core.config import settings


app = FastAPI(
    title="VerityAI API",
    description="Brand governance and evidence management API",
    version="0.1.0",
)

allowed_origins = settings.frontend_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(organizations_router)
app.include_router(guidelines_router)
app.include_router(products_router)
app.include_router(documents_router)
app.include_router(governance_router)


@app.on_event("startup")
def validate_runtime_configuration() -> None:
    settings.validate_runtime()

    upload_dir = Path(settings.UPLOAD_DIR)
    if not upload_dir.is_absolute():
        upload_dir = Path(__file__).resolve().parents[1] / upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "VerityAI API"}
