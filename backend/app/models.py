import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, BigInteger, Integer, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=True)

class CatalogLabel(Base):
    __tablename__ = "catalog_labels"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Software(Base):
    __tablename__ = "softwares"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), index=True, nullable=False)
    edition = Column(String(255), nullable=True)
    os = Column(String(100), index=True, nullable=False)
    tags = Column(JSON, nullable=True) # JSON list of strings
    cover_path = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    custom_fields = relationship("CustomField", back_populates="software", cascade="all, delete-orphan")
    installation_files = relationship("InstallationFile", back_populates="software", cascade="all, delete-orphan")
    licenses = relationship("License", back_populates="software", cascade="all, delete-orphan")

class CustomField(Base):
    __tablename__ = "custom_fields"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    software_id = Column(String(36), ForeignKey("softwares.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    software = relationship("Software", back_populates="custom_fields")

    __table_args__ = (
        UniqueConstraint("software_id", "key", name="uq_software_custom_field"),
    )

class InstallationFile(Base):
    __tablename__ = "installation_files"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    software_id = Column(String(36), ForeignKey("softwares.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(500), nullable=False)
    stored_path = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    catalog_label_id = Column(String(36), ForeignKey("catalog_labels.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    downloads = Column(Integer, default=0, nullable=False)

    software = relationship("Software", back_populates="installation_files")
    catalog_label = relationship("CatalogLabel")

class License(Base):
    __tablename__ = "licenses"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    software_id = Column(String(36), ForeignKey("softwares.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    software = relationship("Software", back_populates="licenses")
