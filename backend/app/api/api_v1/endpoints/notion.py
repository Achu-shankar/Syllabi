"""
Notion content ingestion API endpoints.
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
from app.services.notion_service import NotionService
from app.crud.crud_task import create_task, update_task, get_task
from app.crud.crud_reference import create_reference

logger = logging.getLogger(__name__)

router = APIRouter()


class NotionSearchRequest(BaseModel):
    """Schema for searching Notion pages."""
    integration_id: str = Field(description="Notion integration ID")
    query: str = Field(default="", description="Search query (optional)")
    page_size: int = Field(default=50, ge=1, le=100, description="Number of pages to return")


class NotionPageInfoRequest(BaseModel):
    """Schema for getting page information."""
    integration_id: str = Field(description="Notion integration ID")
    page_id: str = Field(description="Notion page ID")


@router.post("/search", response_model=Dict[str, Any])
async def search_notion_pages(request: NotionSearchRequest):
    """Search for pages in Notion workspace."""
    try:
        # Initialize Notion service
        notion_service = NotionService(request.integration_id)
        
        # Search for pages
        pages = await notion_service.search_pages(
            query=request.query,
            page_size=request.page_size
        )
        
        # Add processing capability information
        for page in pages:
            page['can_process'] = await notion_service.can_process_page(page)
            page['source_type'] = await notion_service.determine_source_type(page)
        
        return {
            "success": True,
            "pages": pages,
            "query": request.query,
            "total_pages": len(pages)
        }
        
    except ValueError as e:
        # Handle credential/authentication errors specially
        if "access token" in str(e).lower() or "credentials" in str(e).lower():
            logger.error(f"Notion authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "authentication_required",
                    "message": "Notion access requires re-authentication. Please reconnect your Notion account in the integrations page.",
                    "details": str(e)
                }
            )
        else:
            logger.error(f"Notion configuration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuration error: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Error searching Notion pages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search Notion pages: {str(e)}"
        )


@router.post("/page-info", response_model=Dict[str, Any])
async def get_notion_page_info(request: NotionPageInfoRequest):
    """Get detailed information about a specific Notion page."""
    try:
        # Initialize Notion service
        notion_service = NotionService(request.integration_id)
        
        # Get page information
        page_info = await notion_service.get_page_info(request.page_id)
        
        # Add processing information
        page_info['can_process'] = await notion_service.can_process_page(page_info)
        page_info['source_type'] = await notion_service.determine_source_type(page_info)
        
        return {
            "success": True,
            "page": page_info
        }
        
    except Exception as e:
        logger.error(f"Error getting Notion page info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get page information: {str(e)}"
        )


@router.post("/user-info", response_model=Dict[str, Any])
async def get_notion_user_info(integration_id: str):
    """Get information about the current Notion user/bot."""
    try:
        # Initialize Notion service
        notion_service = NotionService(integration_id)
        
        # Get user information
        user_info = await notion_service.get_user_info()
        
        return {
            "success": True,
            "user": user_info
        }
        
    except ValueError as e:
        # Handle credential/authentication errors specially
        if "access token" in str(e).lower() or "credentials" in str(e).lower():
            logger.error(f"Notion authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "authentication_required",
                    "message": "Notion access requires re-authentication. Please reconnect your Notion account in the integrations page.",
                    "details": str(e)
                }
            )
        else:
            logger.error(f"Notion configuration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuration error: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Error getting Notion user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user information: {str(e)}"
        )


@router.post("/process-page")
async def process_notion_page(request: dict):
    """
    Process a single Notion page using simplified pipeline.
    Creates a task that downloads, converts, and uploads the page to storage.
    Compatible with existing indexing pipeline.
    """
    try:
        from pydantic import BaseModel, Field
        from uuid import UUID
        
        # Validate request
        integration_id = request.get("integration_id")
        page_id = request.get("page_id") 
        chatbot_id = request.get("chatbot_id")
        user_id = request.get("user_id")
        reference_id = request.get("reference_id")
        
        if not all([integration_id, page_id, chatbot_id, user_id, reference_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: integration_id, page_id, chatbot_id, user_id, reference_id"
            )
        
        # Create task for processing
        task_create = TaskCreate(
            user_id=user_id,
            chatbot_id=UUID(chatbot_id),
            reference_id=UUID(reference_id),
            task_type=TaskTypeEnum.DOCUMENT_PROCESSING,  # Use existing task type
            input_payload={
                "integration_id": integration_id,
                "page_id": page_id,
                "source": "notion"
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
        from app.worker.tasks_notion_simple import process_notion_page
        
        celery_task = process_notion_page.delay(
            str(task.task_identifier),
            integration_id,
            page_id,
            chatbot_id,
            reference_id,
            user_id
        )
        
        logger.info(f"Started Notion processing task {task.task_identifier} for page {page_id}")
        
        return {
            "task_identifier": str(task.task_identifier),
            "reference_id": reference_id,
            "message": f"Started processing Notion page"
        }
        
    except Exception as e:
        logger.error(f"Error initiating Notion processing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate processing: {str(e)}"
        )