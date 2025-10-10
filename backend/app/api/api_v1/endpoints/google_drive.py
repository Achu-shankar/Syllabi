"""
Google Drive content ingestion API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID
import uuid
import logging

from app.core.supabase_client import get_supabase_client
from app.schemas.reference import ContentSourceCreate, IngestionSourceEnum, SourceTypeEnum
from app.schemas.task import TaskCreate, TaskTypeEnum
from app.services.google_drive_service import GoogleDriveService
from app.crud.crud_task import create_task, update_task, get_task
from app.crud.crud_reference import create_reference

logger = logging.getLogger(__name__)

router = APIRouter()




class GoogleDriveListRequest(BaseModel):
    """Schema for listing Google Drive files."""
    integration_id: str = Field(description="Google Drive integration ID")
    folder_id: str = Field(default="root", description="Folder ID to list files from")
    page_size: int = Field(default=50, ge=1, le=1000, description="Number of files to return")


class GoogleDriveSearchRequest(BaseModel):
    """Schema for searching Google Drive files."""
    integration_id: str = Field(description="Google Drive integration ID")
    query: str = Field(description="Search query")
    page_size: int = Field(default=50, ge=1, le=1000, description="Number of files to return")


@router.post("/list", response_model=Dict[str, Any])
async def list_google_drive_files(request: GoogleDriveListRequest):
    """List files in a Google Drive folder."""
    try:
        # Initialize Google Drive service
        drive_service = GoogleDriveService(request.integration_id)
        
        # List files in the specified folder
        files = await drive_service.list_files(
            folder_id=request.folder_id,
            page_size=request.page_size
        )
        
        # Add processing capability information
        for file in files:
            file['can_process'] = await drive_service.can_process_file(file)
            file['source_type'] = await drive_service.determine_source_type(file)
        
        return {
            "success": True,
            "files": files,
            "folder_id": request.folder_id,
            "total_files": len(files)
        }
        
    except ValueError as e:
        # Handle credential/authentication errors specially
        if "refresh token" in str(e).lower() or "offline access" in str(e).lower():
            logger.error(f"Google Drive authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "authentication_required",
                    "message": "Google Drive access requires re-authentication. Please reconnect your Google account in the integrations page.",
                    "details": str(e)
                }
            )
        else:
            logger.error(f"Google Drive configuration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuration error: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Error listing Google Drive files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Google Drive files: {str(e)}"
        )


@router.post("/search", response_model=Dict[str, Any])
async def search_google_drive_files(request: GoogleDriveSearchRequest):
    """Search for files in Google Drive."""
    try:
        # Initialize Google Drive service
        drive_service = GoogleDriveService(request.integration_id)
        
        # Search for files
        files = await drive_service.search_files(
            query=request.query,
            page_size=request.page_size
        )
        
        # Add processing capability information
        for file in files:
            file['can_process'] = await drive_service.can_process_file(file)
            file['source_type'] = await drive_service.determine_source_type(file)
        
        return {
            "success": True,
            "files": files,
            "query": request.query,
            "total_files": len(files)
        }
        
    except ValueError as e:
        # Handle credential/authentication errors specially
        if "refresh token" in str(e).lower() or "offline access" in str(e).lower():
            logger.error(f"Google Drive authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "authentication_required",
                    "message": "Google Drive access requires re-authentication. Please reconnect your Google account in the integrations page.",
                    "details": str(e)
                }
            )
        else:
            logger.error(f"Google Drive configuration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuration error: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Error searching Google Drive files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search Google Drive files: {str(e)}"
        )


@router.post("/metadata/{file_id}", response_model=Dict[str, Any])
async def get_google_drive_file_metadata(file_id: str, integration_id: str):
    """Get metadata for a specific Google Drive file."""
    try:
        # Initialize Google Drive service
        drive_service = GoogleDriveService(integration_id)
        
        # Get file metadata
        metadata = await drive_service.get_file_metadata(file_id)
        
        # Add processing information
        metadata['can_process'] = await drive_service.can_process_file(metadata)
        metadata['source_type'] = await drive_service.determine_source_type(metadata)
        
        return {
            "success": True,
            "metadata": metadata
        }
        
    except Exception as e:
        logger.error(f"Error getting Google Drive file metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file metadata: {str(e)}"
        )





@router.post("/process-document")
async def process_google_drive_document_simple(request: dict):
    """
    Process a single Google Drive document using simplified pipeline.
    Creates a task that downloads, converts, and uploads the file to storage.
    Compatible with existing indexing pipeline.
    """
    try:
        from pydantic import BaseModel, Field
        from uuid import UUID
        
        # Validate request
        integration_id = request.get("integration_id")
        file_id = request.get("file_id") 
        chatbot_id = request.get("chatbot_id")
        user_id = request.get("user_id")
        reference_id = request.get("reference_id")
        
        if not all([integration_id, file_id, chatbot_id, user_id, reference_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: integration_id, file_id, chatbot_id, user_id, reference_id"
            )
        
        # Create task for processing
        task_create = TaskCreate(
            user_id=user_id,
            chatbot_id=UUID(chatbot_id),
            reference_id=UUID(reference_id),
            task_type=TaskTypeEnum.DOCUMENT_PROCESSING,  # Use existing task type
            input_payload={
                "integration_id": integration_id,
                "file_id": file_id,
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
            integration_id,
            file_id,
            chatbot_id,
            reference_id,
            user_id
        )
        
        logger.info(f"Started Google Drive processing task {task.task_identifier} for file {file_id}")
        
        return {
            "task_identifier": str(task.task_identifier),
            "reference_id": reference_id,
            "message": f"Started processing Google Drive file"
        }
        
    except Exception as e:
        logger.error(f"Error initiating Google Drive processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate processing: {str(e)}"
        )


@router.get("/folders/{folder_id}/path")
async def get_folder_path(folder_id: str, integration_id: str):
    """Get the full path of a Google Drive folder."""
    try:
        # Initialize Google Drive service
        drive_service = GoogleDriveService(integration_id)
        
        # Get folder path
        folder_path = await drive_service.get_folder_path(folder_id)
        
        return {
            "success": True,
            "folder_id": folder_id,
            "path": folder_path
        }
        
    except Exception as e:
        logger.error(f"Error getting folder path: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get folder path: {str(e)}"
        )