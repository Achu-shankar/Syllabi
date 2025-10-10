from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


# NEW Enums

class IngestionSourceEnum(str, Enum):
    FILE_UPLOAD = "FILE_UPLOAD"
    URL_SUBMISSION = "URL_SUBMISSION"
    GOOGLE_DRIVE = "GOOGLE_DRIVE"
    NOTION = "NOTION"

class OriginalFileFormatEnum(str, Enum):
    PDF = "PDF"
    TXT = "TXT"
    MD = "MD"
    HTML = "HTML"  # For URL content

class ProcessingStatusEnum(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class IndexingStatusEnum(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


# DEPRECATED Enum (will be removed)
# class ReferenceSourceTypeEnum(str, Enum):
# """Enumeration for the different types of reference sources, aligning with DB and internal logic."""
#     PDF = "PDF"
#     URL = "URL"
#     DOI_ONLY = "DOI_ONLY"         # From SQL Schema
#     MANUAL_ENTRY = "MANUAL_ENTRY" # From SQL Schema
#     RESEARCH_PAPER = "RESEARCH_PAPER" # From SQL Schema, can be inferred by LLM
#     WEB_PAGE = "WEB_PAGE"         # From SQL Schema, can be inferred by LLM
#     DOCX = "DOCX"                 # For internal logic before conversion
#     MARKDOWN = "MARKDOWN"         # For internal logic before conversion
#     TXT = "TXT"                   # Added for clarity, might become PDF
#     OTHER = "OTHER"               # From SQL Schema

class SourceTypeEnum(str, Enum):
    PDF = "PDF"
    TXT = "TXT" 
    MD = "MD"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    # URL removed - it's an ingestion method, not a file type

class ContentSourceBase(BaseModel):
    """Base model for chatbot content sources."""
    source_type: SourceTypeEnum = Field(description="Final processed file type (PDF, TXT, MD, VIDEO, AUDIO).")
    ingestion_source: IngestionSourceEnum = Field(description="How the content was ingested (FILE_UPLOAD, URL_SUBMISSION, GOOGLE_DRIVE).")
    file_name: Optional[str] = Field(default=None, description="Original filename for uploaded files.")
    storage_path: Optional[str] = Field(default=None, description="Path to file in storage.")
    source_url: Optional[str] = Field(default=None, description="URL for web-based content.")
    title: Optional[str] = Field(default=None, description="Title of the content source.")
    indexing_status: IndexingStatusEnum = Field(default=IndexingStatusEnum.PENDING, description="Current indexing status.")
    error_message: Optional[str] = Field(default=None, description="Error message if processing failed.")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata as JSON.")


class ContentSourceCreate(ContentSourceBase):
    """Schema for creating a new content source."""
    chatbot_id: UUID = Field(description="ID of the chatbot this content belongs to.")


class ContentSourceUpdate(BaseModel):
    """Schema for updating an existing content source."""
    source_type: Optional[SourceTypeEnum] = None
    ingestion_source: Optional[IngestionSourceEnum] = None
    file_name: Optional[str] = None
    storage_path: Optional[str] = None
    source_url: Optional[str] = None
    title: Optional[str] = None
    indexing_status: Optional[IndexingStatusEnum] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    processed_at: Optional[datetime] = None


class ContentSource(ContentSourceBase):
    """Schema for representing a content source as stored in the DB."""
    id: UUID
    chatbot_id: UUID
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True



