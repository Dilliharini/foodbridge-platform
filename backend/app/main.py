from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import Base, engine
from .routers import auth, dashboard, donations, pickups, requests

app = FastAPI(
    title="FoodBridge API",
    description="REST API for safe surplus food redistribution.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin] if settings.frontend_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(donations.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(pickups.router, prefix="/api")


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}