import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import crud, schemas, ai, config
from .files import sanitize_path_segment

router = APIRouter(prefix="/api/softwares", tags=["softwares"])

@router.get("", response_model=List[schemas.SoftwareListResponse])
def list_softwares(
    search: str | None = None,
    os: str | None = None,
    tag: str | None = None,
    db: Session = Depends(get_db)
):
    return crud.get_softwares(db, search=search, os_filter=os, tag_filter=tag)

@router.get("/{software_id}", response_model=schemas.SoftwareDetailResponse)
def get_software(software_id: str, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    return db_software

@router.post("", response_model=schemas.SoftwareDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_software(software: schemas.SoftwareCreate, db: Session = Depends(get_db)):
    db_software = crud.create_software(db, software)
    
    # 1. Gather info and generate cover using AI if requested
    if software.gather_info:
        api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
        data_model = crud.get_setting(db, "openrouter_data_model") or config.settings.OPENROUTER_DATA_MODEL
        cover_model = crud.get_setting(db, "openrouter_cover_model") or config.settings.OPENROUTER_COVER_MODEL
        
        if api_key:
            import httpx
            # A. Gather text information (OS, Edition, Tags, Description)
            info = await ai.gather_software_info(db_software.name, api_key, data_model)
            
            # Update fields in DB
            db_software.edition = info.get("edition") or db_software.edition
            db_software.os = info.get("os") or db_software.os
            db_software.tags = info.get("tags") or db_software.tags
            db.commit()
            db.refresh(db_software)
            
            # B. Generate cover using image model if configured
            if cover_model and cover_model.lower() != "none":
                description = info.get("description") or f"App logo for {db_software.name}"
                cover_url = await ai.generate_software_cover(db_software.name, description, api_key, cover_model)
                
                if cover_url:
                    try:
                        safe_name = sanitize_path_segment(db_software.name)
                        software_dir = os.path.join(config.settings.LIBRARY_PATH, safe_name)
                        os.makedirs(software_dir, exist_ok=True)
                        
                        # Set default cover format as png
                        stored_path = os.path.join(software_dir, "cover.png")
                        
                        headers = {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        }
                        
                        async with httpx.AsyncClient(timeout=15.0) as client:
                            response = await client.get(cover_url, headers=headers, follow_redirects=True)
                            if response.status_code == 200:
                                with open(stored_path, "wb") as f:
                                    f.write(response.content)
                                db_software.cover_path = stored_path
                                db.commit()
                                db.refresh(db_software)
                            else:
                                print(f"Failed to download generated cover: status {response.status_code}", flush=True)
                    except Exception as e:
                        print(f"Failed to download or save generated cover: {str(e)}", flush=True)
                        
    # 2. Allow manual override custom cover file download if url is directly passed
    elif software.cover_url:
        import httpx
        try:
            safe_name = sanitize_path_segment(db_software.name)
            software_dir = os.path.join(config.settings.LIBRARY_PATH, safe_name)
            os.makedirs(software_dir, exist_ok=True)
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            ext = ".png"
            for possible_ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
                if possible_ext in software.cover_url.lower():
                    ext = possible_ext
                    break
            stored_path = os.path.join(software_dir, f"cover{ext}")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(software.cover_url, headers=headers, follow_redirects=True)
                if response.status_code == 200:
                    with open(stored_path, "wb") as f:
                        f.write(response.content)
                    db_software.cover_path = stored_path
                    db.commit()
                    db.refresh(db_software)
        except Exception as e:
            print(f"Failed to download manual cover URL: {str(e)}", flush=True)
            
    return db_software

@router.put("/{software_id}", response_model=schemas.SoftwareDetailResponse)
def update_software(software_id: str, software: schemas.SoftwareUpdate, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    return crud.update_software(db, db_software, software)

@router.delete("/{software_id}")
def delete_software(software_id: str, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    
    # We should delete associated files from the disk
    # Let's import files router logic or handle it directly here
    # To keep it simple, we delete the records, but wait: NFR-10 states that
    # data survives container recreation. Let's delete files from disk if we delete the software.
    import os as py_os
    for inst_file in db_software.installation_files:
        if py_os.path.exists(inst_file.stored_path):
            try:
                py_os.remove(inst_file.stored_path)
            except Exception:
                pass
                
    success = crud.delete_software(db, software_id)
    return {"status": "success", "message": "Software deleted"}

# --- Custom Fields ---
@router.post("/{software_id}/custom-fields", response_model=schemas.CustomFieldResponse)
def add_custom_field(software_id: str, field: schemas.CustomFieldCreate, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    return crud.add_custom_field(db, software_id, field.key, field.value)

@router.delete("/{software_id}/custom-fields/{key}")
def delete_custom_field(software_id: str, key: str, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    success = crud.delete_custom_field(db, software_id, key)
    if not success:
        raise HTTPException(status_code=404, detail="Custom field not found")
    return {"status": "success"}

# --- Licenses ---
@router.post("/{software_id}/licenses", response_model=schemas.LicenseResponse)
def add_license(software_id: str, lic: schemas.LicenseCreate, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    return crud.add_license(db, software_id, lic.content)

@router.put("/{software_id}/licenses/{license_id}", response_model=schemas.LicenseResponse)
def update_license(software_id: str, license_id: str, lic: schemas.LicenseCreate, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    db_lic = crud.update_license(db, license_id, lic.content)
    if not db_lic:
        raise HTTPException(status_code=404, detail="License not found")
    return db_lic

@router.delete("/{software_id}/licenses/{license_id}")
def delete_license(software_id: str, license_id: str, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
    success = crud.delete_license(db, license_id)
    if not success:
        raise HTTPException(status_code=404, detail="License not found")
    return {"status": "success"}

# --- AI Extraction Trigger ---
@router.post("/analyze-filename", response_model=schemas.AIMetadataExtraction)
async def analyze_filename(payload: dict, db: Session = Depends(get_db)):
    filename = payload.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="Filename is required")
        
    api_key = crud.get_setting(db, "openrouter_api_key") or config.settings.OPENROUTER_API_KEY
    model = crud.get_setting(db, "openrouter_data_model") or config.settings.OPENROUTER_DATA_MODEL
    
    if not api_key:
        # Fallback to filename-as-name (FR-27)
        name_fallback = filename
        for ext in [".exe", ".msi", ".dmg", ".pkg", ".zip", ".rar", ".iso", ".tar.gz", ".deb", ".rpm"]:
            if name_fallback.lower().endswith(ext):
                name_fallback = name_fallback[:-len(ext)]
                break
        return schemas.AIMetadataExtraction(name=name_fallback)
        
    # OpenRouter API key exists, call extraction helper
    generic_name = await ai.extract_software_name_from_filename(filename, api_key, model)
    return schemas.AIMetadataExtraction(name=generic_name)


# --- Cover Image Management ---


@router.post("/{software_id}/cover")
async def upload_software_cover(
    software_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")
        
    # Get extension
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".svg"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Supported: jpg, jpeg, png, webp, svg")
        
    safe_name = sanitize_path_segment(db_software.name)
    software_dir = os.path.join(config.settings.LIBRARY_PATH, safe_name)
    os.makedirs(software_dir, exist_ok=True)
    
    stored_filename = f"cover{ext.lower()}"
    stored_path = os.path.join(software_dir, stored_filename)
    
    try:
        with open(stored_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
    except Exception as e:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise HTTPException(status_code=500, detail=f"Failed to save cover image: {str(e)}")
        
    # Update DB
    db_software.cover_path = stored_path
    db.commit()
    db.refresh(db_software)
    
    return {"status": "success", "cover_path": stored_path}

@router.get("/{software_id}/cover")
def get_software_cover(software_id: str, db: Session = Depends(get_db)):
    db_software = crud.get_software(db, software_id)
    if not db_software or not db_software.cover_path:
        raise HTTPException(status_code=404, detail="Cover not found")
        
    if not os.path.exists(db_software.cover_path):
        raise HTTPException(status_code=404, detail="Cover file not found on disk")
        
    # Detect media type
    _, ext = os.path.splitext(db_software.cover_path)
    media_type = "image/png"
    if ext.lower() in [".jpg", ".jpeg"]:
        media_type = "image/jpeg"
    elif ext.lower() == ".svg":
        media_type = "image/svg+xml"
    elif ext.lower() == ".webp":
        media_type = "image/webp"
        
    return FileResponse(db_software.cover_path, media_type=media_type)

