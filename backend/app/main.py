from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import settings, labels, softwares, files
import os

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Software Vault API",
    description="Backend API for cataloging and managing installation files, licenses, and metadata.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In a home network environment, allowing all origins is acceptable and avoids setup issues
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(settings.router)
app.include_router(labels.router)
app.include_router(softwares.router)
app.include_router(files.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Software Vault API. Use /docs for documentation."}
