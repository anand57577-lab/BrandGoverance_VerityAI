
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.organizations import router as organizations_router
from app.api.routes.gudielines import router as guidelines_router
from app.api.routes.products import router as products_router
from app.api.routes.documents import router as documents_router
app = FastAPI(
    title="VerityAI API",
    description="Brand governance and evidence management API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(organizations_router)
app.include_router(guidelines_router)
app.include_router(products_router)
app.include_router(documents_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "VerityAI API"}
