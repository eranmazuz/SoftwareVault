from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any

# Settings
class SettingResponse(BaseModel):
    key: str
    value: str | None
    model_config = ConfigDict(from_attributes=True)

class SettingUpdate(BaseModel):
    value: str | None

# Catalog Label
class CatalogLabelBase(BaseModel):
    name: str

class CatalogLabelCreate(CatalogLabelBase):
    pass

class CatalogLabelResponse(CatalogLabelBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Custom Field
class CustomFieldBase(BaseModel):
    key: str
    value: str

class CustomFieldCreate(CustomFieldBase):
    pass

class CustomFieldResponse(CustomFieldBase):
    id: str
    software_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# License
class LicenseBase(BaseModel):
    content: str

class LicenseCreate(LicenseBase):
    pass

class LicenseResponse(LicenseBase):
    id: str
    software_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Installation File
class InstallationFileResponse(BaseModel):
    id: str
    software_id: str
    original_filename: str
    stored_path: str
    file_size: int
    catalog_label_id: str | None
    catalog_label: CatalogLabelResponse | None = None
    uploaded_at: datetime
    downloads: int
    model_config = ConfigDict(from_attributes=True)

# Software
class SoftwareBase(BaseModel):
    name: str
    edition: str | None = None
    os: str
    tags: List[str] | None = []
    cover_path: str | None = None

class SoftwareCreate(SoftwareBase):
    custom_fields: List[CustomFieldCreate] | None = []
    licenses: List[LicenseCreate] | None = []
    cover_url: str | None = None
    domain: str | None = None

class SoftwareUpdate(BaseModel):
    name: str | None = None
    edition: str | None = None
    os: str | None = None
    tags: List[str] | None = None

class SoftwareDetailResponse(SoftwareBase):
    id: str
    created_at: datetime
    updated_at: datetime
    custom_fields: List[CustomFieldResponse] = []
    installation_files: List[InstallationFileResponse] = []
    licenses: List[LicenseResponse] = []
    model_config = ConfigDict(from_attributes=True)

class SoftwareListResponse(SoftwareBase):
    id: str
    created_at: datetime
    updated_at: datetime
    file_count: int = 0
    model_config = ConfigDict(from_attributes=True)

# AI Metadata Extraction Result
class AIMetadataExtraction(BaseModel):
    name: str
    edition: str | None = None
    os: str
    tags: List[str] = []
    cover_url: str | None = None
    domain: str | None = None
