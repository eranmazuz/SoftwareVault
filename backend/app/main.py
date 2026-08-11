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

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Register routers
app.include_router(settings.router)
app.include_router(labels.router)
app.include_router(softwares.router)
app.include_router(files.router)

# Serve SPA Frontend assets
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")

@app.exception_handler(404)
async def spa_fallback_404_handler(request, exc):
    # Keep API 404 responses standard
    if request.url.path.startswith("/api"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
        
    # Redirect all HTML/SPA requests back to index.html
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"detail": "Frontend assets not compiled"})

if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "Welcome to the Software Vault API. Use /docs for documentation. (Frontend static files missing)"}
