from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

class TaskStatusEnum(str, Enum):
    """Enumeration for the possible statuses of a background task."""
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class TaskTypeEnum(str, Enum):
    """Enumeration for the different types of background tasks."""
    DOCUMENT_PROCESSING = "DOCUMENT_PROCESSING"
    METADATA_EXTRACTION = "METADATA_EXTRACTION"
    CONTENT_INDEXING = "CONTENT_INDEXING"
    URL_PROCESSING = "URL_PROCESSING"
    DOI_CITATION_FETCH = "DOI_CITATION_FETCH"
    PDF_GENERATION_FROM_URL = "PDF_GENERATION_FROM_URL"
    DOCUMENT_INDEXING = "DOCUMENT_INDEXING"
    MULTIMEDIA_PROCESSING = "MULTIMEDIA_PROCESSING"
    MULTIMEDIA_INDEXING = "MULTIMEDIA_INDEXING"
    GOOGLE_DRIVE_PROCESSING = "GOOGLE_DRIVE_PROCESSING"
    GOOGLE_DRIVE_INDEXING = "GOOGLE_DRIVE_INDEXING"
    

class TaskBase(BaseModel):
    """Base model for task properties that are common across different representations."""
    task_identifier: UUID
    user_id: str
    chatbot_id: UUID
    reference_id: Optional[UUID] = None
    task_type: TaskTypeEnum
    status: TaskStatusEnum = TaskStatusEnum.QUEUED
    current_step_description: Optional[str] = None
    progress_percentage: int = Field(default=0, ge=0, le=100)
    input_payload: Optional[Dict[str, Any]] = None
    result_payload: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None

class TaskCreate(BaseModel):
    """Schema for creating a new task. Contains fields provided by the client."""
    user_id: str
    chatbot_id: UUID
    reference_id: Optional[UUID] = None
    task_type: TaskTypeEnum
    input_payload: Optional[Dict[str, Any]] = None

class TaskUpdate(BaseModel):
    """Schema for updating an existing task. All fields are optional."""
    status: Optional[TaskStatusEnum] = None
    current_step_description: Optional[str] = None
    progress_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    result_payload: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None
    reference_id: Optional[UUID] = None
    

class Task(TaskBase):
    """Schema for representing a task as stored in the database and returned via API."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration to allow mapping from ORM objects or dictionaries."""
        from_attributes = True














