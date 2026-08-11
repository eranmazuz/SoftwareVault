from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from . import models, schemas
import json

# --- Settings ---
def get_setting(db: Session, key: str) -> str | None:
    db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    return db_setting.value if db_setting else None

def set_setting(db: Session, key: str, value: str | None) -> models.Setting:
    db_setting = db.query(models.Setting).filter(models.Setting.key == key).first()
    if db_setting:
        db_setting.value = value
    else:
        db_setting = models.Setting(key=key, value=value)
        db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

# --- Catalog Labels ---
def get_catalog_labels(db: Session):
    return db.query(models.CatalogLabel).order_by(models.CatalogLabel.name).all()

def get_catalog_label(db: Session, label_id: str):
    return db.query(models.CatalogLabel).filter(models.CatalogLabel.id == label_id).first()

def get_catalog_label_by_name(db: Session, name: str):
    return db.query(models.CatalogLabel).filter(models.CatalogLabel.name == name).first()

def create_catalog_label(db: Session, label: schemas.CatalogLabelCreate):
    db_label = models.CatalogLabel(name=label.name)
    db.add(db_label)
    db.commit()
    db.refresh(db_label)
    return db_label

def update_catalog_label(db: Session, db_label: models.CatalogLabel, name: str):
    db_label.name = name
    db.commit()
    db.refresh(db_label)
    return db_label

def delete_catalog_label(db: Session, label_id: str):
    db_label = get_catalog_label(db, label_id)
    if db_label:
        db.delete(db_label)
        db.commit()
        return True
    return False

# --- Software ---
def get_softwares(db: Session, search: str | None = None, os_filter: str | None = None, tag_filter: str | None = None):
    query = db.query(models.Software)
    
    conditions = []
    if search:
        search_term = f"%{search}%"
        conditions.append(or_(
            models.Software.name.ilike(search_term),
            models.Software.edition.ilike(search_term)
        ))
    if os_filter:
        conditions.append(models.Software.os.ilike(os_filter))
        
    if conditions:
        query = query.filter(and_(*conditions))

    results = query.order_by(models.Software.name).all()
    
    # Simple tag filtering in Python if tag_filter is set (since SQLite/PostgreSQL tags JSON format can vary)
    if tag_filter:
        tag_filter_lower = tag_filter.lower()
        filtered_results = []
        for s in results:
            if s.tags and any(tag_filter_lower == str(t).lower() for t in s.tags):
                filtered_results.append(s)
        results = filtered_results

    # Annotate file_count
    annotated_results = []
    for s in results:
        file_count = db.query(models.InstallationFile).filter(models.InstallationFile.software_id == s.id).count()
        s.file_count = file_count
        annotated_results.append(s)
        
    return annotated_results

def get_software(db: Session, software_id: str):
    return db.query(models.Software).filter(models.Software.id == software_id).first()

def create_software(db: Session, software: schemas.SoftwareCreate):
    db_software = models.Software(
        name=software.name,
        edition=software.edition,
        os=software.os,
        tags=software.tags or []
    )
    db.add(db_software)
    db.flush() # get UUID

    if software.custom_fields:
        for cf in software.custom_fields:
            db_cf = models.CustomField(software_id=db_software.id, key=cf.key, value=cf.value)
            db.add(db_cf)

    if software.licenses:
        for lic in software.licenses:
            db_lic = models.License(software_id=db_software.id, content=lic.content)
            db.add(db_lic)

    db.commit()
    db.refresh(db_software)
    return db_software

def update_software(db: Session, db_software: models.Software, software: schemas.SoftwareUpdate):
    for var, value in vars(software).items():
        if value is not None:
            setattr(db_software, var, value)
    db.commit()
    db.refresh(db_software)
    return db_software

def delete_software(db: Session, software_id: str):
    db_software = get_software(db, software_id)
    if db_software:
        db.delete(db_software)
        db.commit()
        return True
    return False

# --- Custom Fields ---
def add_custom_field(db: Session, software_id: str, key: str, value: str):
    # Check if exists
    db_cf = db.query(models.CustomField).filter(
        models.CustomField.software_id == software_id,
        models.CustomField.key == key
    ).first()
    
    if db_cf:
        db_cf.value = value
    else:
        db_cf = models.CustomField(software_id=software_id, key=key, value=value)
        db.add(db_cf)
        
    db.commit()
    db.refresh(db_cf)
    return db_cf

def delete_custom_field(db: Session, software_id: str, key: str):
    db_cf = db.query(models.CustomField).filter(
        models.CustomField.software_id == software_id,
        models.CustomField.key == key
    ).first()
    if db_cf:
        db.delete(db_cf)
        db.commit()
        return True
    return False

# --- Licenses ---
def add_license(db: Session, software_id: str, content: str):
    db_lic = models.License(software_id=software_id, content=content)
    db.add(db_lic)
    db.commit()
    db.refresh(db_lic)
    return db_lic

def update_license(db: Session, license_id: str, content: str):
    db_lic = db.query(models.License).filter(models.License.id == license_id).first()
    if db_lic:
        db_lic.content = content
        db.commit()
        db.refresh(db_lic)
    return db_lic

def delete_license(db: Session, license_id: str):
    db_lic = db.query(models.License).filter(models.License.id == license_id).first()
    if db_lic:
        db.delete(db_lic)
        db.commit()
        return True
    return False

# --- Installation Files ---
def create_installation_file(db: Session, software_id: str, original_filename: str, stored_path: str, file_size: int, catalog_label_id: str | None):
    db_file = models.InstallationFile(
        software_id=software_id,
        original_filename=original_filename,
        stored_path=stored_path,
        file_size=file_size,
        catalog_label_id=catalog_label_id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def update_installation_file_label(db: Session, file_id: str, catalog_label_id: str | None):
    db_file = db.query(models.InstallationFile).filter(models.InstallationFile.id == file_id).first()
    if db_file:
        db_file.catalog_label_id = catalog_label_id
        db.commit()
        db.refresh(db_file)
    return db_file

def increment_download_count(db: Session, file_id: str):
    db_file = db.query(models.InstallationFile).filter(models.InstallationFile.id == file_id).first()
    if db_file:
        db_file.downloads += 1
        db.commit()
        db.refresh(db_file)
    return db_file

def get_installation_file(db: Session, file_id: str):
    return db.query(models.InstallationFile).filter(models.InstallationFile.id == file_id).first()

def delete_installation_file(db: Session, file_id: str):
    db_file = get_installation_file(db, file_id)
    if db_file:
        db.delete(db_file)
        db.commit()
        return True
    return False
