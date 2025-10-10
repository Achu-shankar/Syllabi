import logging
from uuid import UUID
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from app.core.supabase_client import get_supabase_client
from app.schemas.task import Task, TaskCreate, TaskStatusEnum, TaskTypeEnum
from app.schemas.multimedia import MultimediaProcessRequest, MultimediaIndexingRequest
from app.schemas.reference import IndexingStatusEnum
from app.crud.crud_task import create_task as crud_create_task
from app.worker.tasks_multimedia import process_multimedia_task
from app.worker.tasks_multimedia_indexing import index_multimedia_task

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=Task, status_code=202)
async def process_multimedia(
    *,
    multimedia_request: MultimediaProcessRequest,
    db: Client = Depends(get_supabase_client)
):
    """
    Endpoint to process multimedia content (video/audio):
    1. Creates a task in the database.
    2. Dispatches a Celery job to process the multimedia file.
    
    This is the first stage of the multimedia pipeline - it handles basic
    file validation and metadata extraction, then creates a content source record.
    """
    
    logger.info(f"Received multimedia processing request for: {multimedia_request.file_path}, "
                f"type: {multimedia_request.media_type}, chatbot: {multimedia_request.chatbot_id}")

    # Prepare task input payload
    task_input_payload: Dict[str, Any] = {
        "file_path": multimedia_request.file_path,
        "media_type": multimedia_request.media_type.value,
        "original_filename": multimedia_request.original_filename,
        "original_user_id": multimedia_request.user_id
    }
    
    # Create a task entry in the database
    task_in = TaskCreate(
        user_id=multimedia_request.user_id,
        chatbot_id=multimedia_request.chatbot_id,
        reference_id=multimedia_request.reference_id,
        task_type=TaskTypeEnum.MULTIMEDIA_PROCESSING,
        input_payload=task_input_payload,
    )
    
    try:
        created_task_db_entry = crud_create_task(db=db, task_in=task_in)
        if not created_task_db_entry:
            logger.error(f"Failed to create task entry in DB for multimedia file: {multimedia_request.file_path}")
            raise HTTPException(status_code=500, detail="Failed to create task in database.")
    except Exception as e:
        logger.error(f"Error creating task in DB for multimedia file {multimedia_request.file_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error while creating task: {str(e)}")

    # Dispatch Celery job for multimedia processing
    try:
        process_multimedia_task.delay(
            task_identifier=str(created_task_db_entry.task_identifier),
            reference_id=str(multimedia_request.reference_id),
            file_path=multimedia_request.file_path,
            user_id=multimedia_request.user_id,
            chatbot_id=str(multimedia_request.chatbot_id),
            media_type=multimedia_request.media_type.value,
            original_filename=multimedia_request.original_filename
        )
    except Exception as e:
        logger.error(f"Failed to dispatch Celery task {created_task_db_entry.task_identifier} "
                    f"for multimedia file {multimedia_request.file_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to dispatch processing task: {str(e)}")
    
    logger.info(f"Dispatched Celery task {created_task_db_entry.task_identifier} "
                f"for multimedia file: {multimedia_request.file_path}")

    return created_task_db_entry

@router.post("/index", response_model=Task, status_code=202)
async def index_multimedia(
    *,
    multimedia_request: MultimediaIndexingRequest,
    db: Client = Depends(get_supabase_client)
):
    """
    Endpoint to index processed multimedia content:
    1. Creates an indexing task in the database.
    2. Dispatches a Celery job to transcribe, chunk, and embed the multimedia content.
    
    This is the second stage of the multimedia pipeline - it handles transcription,
    chunking, and embedding generation for searchable content.
    
    Args:
        reference_id: UUID of the content source to index
    """
    
    logger.info(f"Received multimedia indexing request for reference: {multimedia_request.reference_id}")

    # Get the content source to validate it exists and get required info
    try:
        from app.crud.crud_reference import get_reference
        content_source = get_reference(db=db, reference_id=multimedia_request.reference_id)
        
        if not content_source:
            logger.error(f"Content source not found for reference ID: {multimedia_request.reference_id}")
            raise HTTPException(status_code=404, detail="Content source not found.")
        
        if content_source.source_type not in ["VIDEO", "AUDIO"]:
            logger.error(f"Invalid source type for multimedia indexing: {content_source.source_type}")
            raise HTTPException(status_code=400, detail="Content source is not multimedia type.")
        
        if content_source.indexing_status == IndexingStatusEnum.COMPLETED:
            logger.warning(f"Content source {multimedia_request.reference_id} is already indexed")
            raise HTTPException(status_code=400, detail="Content source is already indexed.")
        
        if content_source.indexing_status == IndexingStatusEnum.IN_PROGRESS:
            logger.warning(f"Content source {multimedia_request.reference_id} is currently being indexed")
            raise HTTPException(status_code=400, detail="Content source is currently being indexed.")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving content source {multimedia_request.reference_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Prepare task input payload
    task_input_payload: Dict[str, Any] = {
        "reference_id": str(multimedia_request.reference_id),
        "content_type": content_source.source_type,
        "file_path": content_source.storage_path,
        "title": content_source.title
    }
    
    # Create a task entry in the database
    task_in = TaskCreate(
        user_id=str(multimedia_request.user_id),  # System-initiated indexing task
        chatbot_id=multimedia_request.chatbot_id,
        reference_id=multimedia_request.reference_id,
        task_type=TaskTypeEnum.MULTIMEDIA_INDEXING,
        input_payload=task_input_payload,
    )
    
    try:
        created_task_db_entry = crud_create_task(db=db, task_in=task_in)
        if not created_task_db_entry:
            logger.error(f"Failed to create indexing task entry in DB for reference: {multimedia_request.reference_id}")
            raise HTTPException(status_code=500, detail="Failed to create task in database.")
    except Exception as e:
        logger.error(f"Error creating indexing task in DB for reference {multimedia_request.reference_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error while creating task: {str(e)}")

    # Update content source status to in_progress
    try:
        from app.crud.crud_reference import update_reference
        from app.schemas.reference import ContentSourceUpdate
        update_reference(
            db=db,
            reference_id=multimedia_request.reference_id,
            reference_in=ContentSourceUpdate(
                indexing_status=IndexingStatusEnum.IN_PROGRESS,
                error_message=None
            )
        )
    except Exception as e:
        logger.error(f"Error updating content source status for {multimedia_request.reference_id}: {e}", exc_info=True)
        # Continue with task creation even if status update fails

    # Dispatch Celery job for multimedia indexing
    try:
        index_multimedia_task.delay(
            task_identifier=str(created_task_db_entry.task_identifier),
            reference_id=str(multimedia_request.reference_id),
            chatbot_id=str(multimedia_request.chatbot_id),
            user_id=str(multimedia_request.user_id)
        )
    except Exception as e:
        logger.error(f"Failed to dispatch Celery indexing task {created_task_db_entry.task_identifier} "
                    f"for reference {multimedia_request.reference_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to dispatch indexing task: {str(e)}")
    
    logger.info(f"Dispatched Celery indexing task {created_task_db_entry.task_identifier} "
                f"for multimedia reference: {multimedia_request.reference_id}")

    return created_task_db_entry 