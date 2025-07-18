"""
Simplified Google Drive API endpoint that integrates with existing pipeline.
Processes single files and creates tasks compatible with existing indexing system.
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from uuid import UUID
import logging

from app.core.supabase_client import get_supabase_client
from app.crud.crud_task import create_task
from app.schemas.task import TaskCreate, TaskTypeEnum

logger = logging.getLogger(__name__)

router = APIRouter()


class GoogleDriveProcessingRequest(BaseModel):
    """Schema for Google Drive single file processing request."""
    integration_id: str = Field(description="Google Drive integration ID")
    file_id: str = Field(description="Google Drive file ID to process")
    chatbot_id: UUID = Field(description="Chatbot ID")
    user_id: str = Field(description="User ID")
    reference_id: UUID = Field(description="Reference ID for the content source")


@router.post("/process-document")
async def process_google_drive_document(request: GoogleDriveProcessingRequest):
    """
    Process a single Google Drive document.
    Creates a task that downloads, converts, and uploads the file to storage.
    Compatible with existing indexing pipeline.
    """
    try:
        # Create task for processing
        task_create = TaskCreate(
            user_id=request.user_id,
            chatbot_id=request.chatbot_id,
            reference_id=request.reference_id,
            task_type=TaskTypeEnum.DOCUMENT_PROCESSING,  # Use existing task type
            input_payload={
                "integration_id": request.integration_id,
                "file_id": request.file_id,
                "source": "google_drive"
            }
        )
        
        # Create task record
        db = get_supabase_client()
        task = create_task(db, task_in=task_create)
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create processing task"
            )
        
        # Start Celery task
        from app.worker.tasks_google_drive_simple import process_google_drive_document
        
        celery_task = process_google_drive_document.delay(
            str(task.task_identifier),
            request.integration_id,
            request.file_id,
            str(request.chatbot_id),
            str(request.reference_id),
            request.user_id
        )
        
        logger.info(f"Started Google Drive processing task {task.task_identifier} for file {request.file_id}")
        
        return {
            "task_identifier": str(task.task_identifier),
            "reference_id": str(request.reference_id),
            "message": f"Started processing Google Drive file"
        }
        
    except Exception as e:
        logger.error(f"Error initiating Google Drive processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate processing: {str(e)}"
        )