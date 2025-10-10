"""
Simplified Notion processing task that integrates with existing pipeline.
Downloads page content from Notion, converts to PDF, uploads to Supabase storage, creates content source.
"""
import logging
import tempfile
import os
import asyncio
from typing import Optional
from uuid import UUID, uuid4

from app.worker.celery_app import celery_app
from app.core.supabase_client import get_supabase_client
from app.services.notion_service import NotionService
from app.crud.crud_task import update_task
from app.crud.crud_reference import create_reference
from app.schemas.task import TaskUpdate, TaskStatusEnum
from app.schemas.reference import ContentSourceCreate, SourceTypeEnum, IngestionSourceEnum, IndexingStatusEnum

logger = logging.getLogger(__name__)


def update_task_status_helper(task_id: UUID, **kwargs):
    """Helper function to update task status"""
    try:
        db = get_supabase_client()
        task_update = TaskUpdate(**kwargs)
        update_task(db, task_identifier=task_id, task_in=task_update)
    except Exception as e:
        logger.error(f"Error updating task status: {e}")


async def _process_notion_page_async(
    task_id: str,
    integration_id: str,
    page_id: str,
    chatbot_id: str,
    reference_id: str,
    user_id: str
):
    """
    Async helper function to process a single Notion page:
    1. Download page content from Notion
    2. Convert to PDF
    3. Upload to Supabase storage
    4. Create content source record
    """
    task_uuid = UUID(task_id)
    chatbot_uuid = UUID(chatbot_id)
    reference_uuid = UUID(reference_id)
    
    logger.info(f"[Task {task_uuid}] Starting Notion page processing for page {page_id}")
    
    try:
        # Update task status
        update_task_status_helper(
            task_uuid,
            status=TaskStatusEnum.PROCESSING,
            current_step_description="Initializing Notion processing",
            progress_percentage=10
        )
        
        # Initialize Notion service
        notion_service = NotionService(integration_id)
        
        # Get page information
        update_task_status_helper(
            task_uuid,
            current_step_description="Retrieving page information from Notion",
            progress_percentage=20
        )
        
        page_info = await notion_service.get_page_info(page_id)
        
        # Check if page can be processed
        if not await notion_service.can_process_page(page_info):
            raise ValueError(f"Page {page_id} cannot be processed (archived or inaccessible)")
        
        # Download page content as PDF
        update_task_status_helper(
            task_uuid,
            current_step_description="Extracting and converting page content",
            progress_percentage=40
        )
        
        pdf_content, filename = await notion_service.download_page_as_pdf(page_id, page_info)
        
        # Create temporary file
        temp_file_path = await notion_service.create_temp_file(pdf_content, filename)
        
        try:
            # Upload to Supabase storage
            update_task_status_helper(
                task_uuid,
                current_step_description="Uploading file to storage",
                progress_percentage=70
            )
            
            storage_path = await _upload_to_supabase_storage(
                temp_file_path,
                filename,
                chatbot_uuid,
                "application/pdf"
            )
            
            # Determine source type and create metadata
            source_type = await notion_service.determine_source_type(page_info)
            metadata = await notion_service.create_content_metadata(page_info)
            
            # Create content source record
            update_task_status_helper(
                task_uuid,
                current_step_description="Creating content source record",
                progress_percentage=85
            )
            
            content_source = ContentSourceCreate(
                chatbot_id=chatbot_uuid,
                source_type=source_type,
                ingestion_source=IngestionSourceEnum.NOTION,
                file_name=filename,
                storage_path=storage_path,
                title=page_info.get("title", "Untitled"),
                metadata=metadata,
                indexing_status=IndexingStatusEnum.PENDING
            )
            
            # Create in database with provided reference_id
            db = get_supabase_client()
            created_source = create_reference(db, reference_in=content_source, reference_id=reference_uuid)
            
            if not created_source:
                raise Exception("Failed to create content source record")
            
            # Update task completion
            update_task_status_helper(
                task_uuid,
                status=TaskStatusEnum.COMPLETED,
                current_step_description="Notion page processed successfully",
                progress_percentage=100,
                result_payload={
                    "reference_id": str(reference_uuid),
                    "storage_path": storage_path,
                    "source_type": source_type.value,
                    "filename": filename,
                    "page_title": page_info.get("title", "Untitled")
                }
            )
            
            logger.info(f"[Task {task_uuid}] Successfully processed Notion page {page_id}")
            
            return {
                "success": True,
                "reference_id": str(reference_uuid),
                "storage_path": storage_path,
                "source_type": source_type.value
            }
            
        finally:
            # Clean up temporary file
            try:
                await notion_service.cleanup_temp_file(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")
                
    except Exception as e:
        logger.error(f"[Task {task_uuid}] Error processing Notion page {page_id}: {e}")
        
        update_task_status_helper(
            task_uuid,
            status=TaskStatusEnum.FAILED,
            error_details=str(e),
            current_step_description=f"Processing failed: {str(e)}"
        )
        
        return {
            "success": False,
            "error": str(e)
        }


async def _upload_to_supabase_storage(
    temp_file_path: str,
    filename: str,
    chatbot_id: UUID,
    content_type: str = 'application/pdf'
) -> str:
    """Upload file to Supabase storage and return storage path."""
    try:
        supabase = get_supabase_client()
        
        # Create storage path
        storage_path = f"{chatbot_id}/notion/{filename}"
        
        # Read file content
        with open(temp_file_path, 'rb') as f:
            file_content = f.read()
        
        # Upload to Supabase storage
        supabase.storage.from_("documents").upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": content_type, "upsert": "false"}
        )
        
        return storage_path
        
    except Exception as e:
        logger.error(f"Error uploading to Supabase storage: {e}")
        raise


@celery_app.task(name="process_notion_page", bind=True)
def process_notion_page(
    self,
    task_id: str,
    integration_id: str,
    page_id: str,
    chatbot_id: str,
    reference_id: str,
    user_id: str
):
    """
    Celery task wrapper for processing Notion pages.
    Calls the async helper function using asyncio.run().
    """
    return asyncio.run(_process_notion_page_async(
        task_id, integration_id, page_id, chatbot_id, reference_id, user_id
    ))