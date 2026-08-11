import os
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import crud, schemas, config

router = APIRouter(prefix="/api/files", tags=["files"])

def sanitize_path_segment(name: str) -> str:
    """Removes invalid filesystem characters from a string."""
    # Replace backslash, slash, colon, asterisk, question mark, double quote, less than, greater than, pipe
    sanitized = re.sub(r'[\\/*?:"<>|]', "_", name)
    # Strip leading/trailing spaces and dots
    return sanitized.strip(" .")

@router.post("/upload", response_model=schemas.InstallationFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    software_id: str = Form(...),
    catalog_label_id: str = Form(None),
    catalog_label: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    db_software = crud.get_software(db, software_id)
    if not db_software:
        raise HTTPException(status_code=404, detail="Software not found")

    # Resolve or dynamically create the catalog label if a string is provided
    if catalog_label and catalog_label.strip():
        label_name = catalog_label.strip()
        db_label = crud.get_catalog_label_by_name(db, label_name)
        if not db_label:
            db_label = crud.create_catalog_label(db, schemas.CatalogLabelCreate(name=label_name))
        catalog_label_id = db_label.id

    # Sanitize software name and edition for the path structure
    safe_name = sanitize_path_segment(db_software.name)
    safe_edition = sanitize_path_segment(db_software.edition) if db_software.edition else ""
    
    # Create library target directory: /library/{SoftwareName}
    software_dir = os.path.join(config.settings.LIBRARY_PATH, safe_name)
    os.makedirs(software_dir, exist_ok=True)
    
    # Filename structure: {SoftwareName}_{Edition}_{Filename} or {SoftwareName}_{Filename}
    safe_filename = sanitize_path_segment(file.filename)
    if safe_edition:
        stored_filename = f"{safe_name}_{safe_edition}_{safe_filename}"
    else:
        stored_filename = f"{safe_name}_{safe_filename}"
        
    stored_path = os.path.join(software_dir, stored_filename)
    
    # Avoid overwriting existing files or causing collisions by appending suffix if exists
    base, ext = os.path.splitext(stored_path)
    counter = 1
    while os.path.exists(stored_path):
        stored_path = f"{base}_{counter}{ext}"
        counter += 1

    # Stream the upload to disk to keep memory consumption low
    file_size = 0
    try:
        with open(stored_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
                buffer.write(chunk)
                file_size += len(chunk)
    except Exception as e:
        if os.path.exists(stored_path):
            os.remove(stored_path)
        raise HTTPException(status_code=500, detail=f"Failed to write file to disk: {str(e)}")

    # Register file in DB
    db_file = crud.create_installation_file(
        db,
        software_id=software_id,
        original_filename=file.filename,
        stored_path=stored_path,
        file_size=file_size,
        catalog_label_id=catalog_label_id
    )
    
    return db_file

@router.get("/{file_id}/download")
def download_file(file_id: str, db: Session = Depends(get_db)):
    db_file = crud.get_installation_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File record not found")
        
    if not os.path.exists(db_file.stored_path):
        raise HTTPException(status_code=404, detail="Physical file not found on disk")
        
    # Increment download counter
    crud.increment_download_count(db, file_id)
    
    # Stream the file back
    return FileResponse(
        path=db_file.stored_path,
        media_type="application/octet-stream",
        filename=db_file.original_filename
    )

@router.put("/{file_id}/label", response_model=schemas.InstallationFileResponse)
def update_file_label(file_id: str, payload: dict, db: Session = Depends(get_db)):
    db_file = crud.get_installation_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File record not found")
        
    catalog_label_id = payload.get("catalog_label_id")
    return crud.update_installation_file_label(db, file_id, catalog_label_id)

@router.delete("/{file_id}")
def delete_file(file_id: str, db: Session = Depends(get_db)):
    db_file = crud.get_installation_file(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File record not found")
        
    # Delete the physical file
    if os.path.exists(db_file.stored_path):
        try:
            os.remove(db_file.stored_path)
        except Exception as e:
            # Continue deleting DB record but log warning
            pass
            
    crud.delete_installation_file(db, file_id)
    return {"status": "success", "message": "File deleted"}
