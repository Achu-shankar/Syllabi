import logging
from uuid import uuid4, UUID

from fastapi import APIRouter, HTTPException, Depends

from app.core.supabase_client import get_supabase_client # Or your sync client if preferred for task creation
from app.schemas.task import Task, TaskCreate, TaskStatusEnum, TaskTypeEnum
from app.crud.crud_task import create_task as crud_create_task
# Import your Celery app and the new URL processing task
# from app.worker.celery_app import celery_app # No longer needed if using .delay() on task directly
from app.worker.tasks_url import process_url_task_sync_wrapper # Import the specific task

# Placeholder for request body schema if needed (e.g., if you want to pass more than just a URL)
from pydantic import BaseModel, HttpUrl
from supabase import Client
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()

class URLProcessRequest(BaseModel):
    user_id: str
    url: HttpUrl
    chatbot_id: UUID # Changed from project_id to chatbot_id
    reference_id: UUID # Made required instead of optional

    # user_id: str # Assuming user_id will be extracted from auth/dependencies later

@router.post("/", response_model=Task, status_code=202)
async def process_url(
    *,
    url_request: URLProcessRequest,
    # background_tasks: BackgroundTasks, # Removed
    db: Client = Depends(get_supabase_client), 
    # current_user: User = Depends(get_current_active_user) 
):
    """
    Endpoint to process a URL:
    1. Creates a task in the database.
    2. Dispatches a Celery job to fetch and process the URL using .delay().
    """
    # For now, let's assume a placeholder user_id.
    # In a real app, this would come from an authentication dependency.

    logger.info(f"Received URL processing request for: {url_request.url}, project: {url_request.chatbot_id}")


    task_input_payload: Dict[str, Any] = {
        "url": str(url_request.url),
        "original_user_id": url_request.user_id
    }
    
    # 1. Create a task entry in the database
    task_in = TaskCreate(
        user_id=url_request.user_id, # Will be current_user.id
        chatbot_id=url_request.chatbot_id,
        reference_id=url_request.reference_id,
        task_type=TaskTypeEnum.URL_PROCESSING,
        input_payload = task_input_payload,
    )
    
    try:
        # If your crud_create_task is async, ensure db is an AsyncClient
        # If it's sync, ensure db_sync is a sync client. Adjust get_supabase_client if needed.
        created_task_db_entry = crud_create_task(db=db, task_in=task_in)
        if not created_task_db_entry:
            logger.error(f"Failed to create task entry in DB for URL: {url_request.url}")
            raise HTTPException(status_code=500, detail="Failed to create task in database.")
    except Exception as e:
        logger.error(f"Error creating task in DB for URL {url_request.url}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error while creating task: {str(e)}")

    # 2. Dispatch Celery job using .delay()
    try:
        process_url_task_sync_wrapper.delay(
            task_identifier=str(created_task_db_entry.task_identifier), 
            reference_id=str(url_request.reference_id),
            url_to_process=str(url_request.url),
            user_id=url_request.user_id,
            chatbot_id=str(url_request.chatbot_id)
        )
    except Exception as e:
        # If .delay() fails (e.g., broker not available), log it and raise an HTTP exception.
        # The task record in the DB will remain in PENDING state.
        logger.error(f"Failed to dispatch Celery task {created_task_db_entry.task_identifier} for URL {url_request.url}: {e}", exc_info=True)
        # Optionally, you could try to update the task status to FAILED here,
        # but it might be complex if the DB transaction from create_task is already committed.
        # For now, failing the request is a clear signal.
        raise HTTPException(status_code=500, detail=f"Failed to dispatch processing task: {str(e)}")
    
    logger.info(f"Dispatched Celery task {created_task_db_entry.task_identifier} for URL: {url_request.url} using .delay()")

    # Return the initial task object (as stored in DB)
    # Convert DB model to Pydantic model if necessary, or ensure crud_create_task returns a Pydantic model.
    # For simplicity, assuming created_task_db_entry is compatible or easily converted.
    # If crud_create_task returns a dictionary or a non-Pydantic object, you might need:
    # return Task(**created_task_db_entry.dict()) or similar
    return created_task_db_entry
