from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/api/labels", tags=["labels"])

@router.get("", response_model=List[schemas.CatalogLabelResponse])
def list_labels(db: Session = Depends(get_db)):
    return crud.get_catalog_labels(db)

@router.post("", response_model=schemas.CatalogLabelResponse, status_code=status.HTTP_201_CREATED)
def create_label(label: schemas.CatalogLabelCreate, db: Session = Depends(get_db)):
    existing = crud.get_catalog_label_by_name(db, name=label.name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Catalog label '{label.name}' already exists")
    return crud.create_catalog_label(db, label)

@router.put("/{label_id}", response_model=schemas.CatalogLabelResponse)
def rename_label(label_id: str, label: schemas.CatalogLabelCreate, db: Session = Depends(get_db)):
    db_label = crud.get_catalog_label(db, label_id)
    if not db_label:
        raise HTTPException(status_code=404, detail="Catalog label not found")
    
    existing = crud.get_catalog_label_by_name(db, name=label.name)
    if existing and existing.id != label_id:
        raise HTTPException(status_code=400, detail=f"Catalog label '{label.name}' already exists")
        
    return crud.update_catalog_label(db, db_label, name=label.name)

@router.delete("/{label_id}")
def delete_label(label_id: str, db: Session = Depends(get_db)):
    db_label = crud.get_catalog_label(db, label_id)
    if not db_label:
        raise HTTPException(status_code=404, detail="Catalog label not found")
    
    success = crud.delete_catalog_label(db, label_id)
    if not success:
         raise HTTPException(status_code=400, detail="Failed to delete label")
         
    return {"status": "success", "message": f"Catalog label deleted"}
