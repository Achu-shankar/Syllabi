from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from pydantic import BaseModel, AnyUrl
from typing import Optional, Dict, Any

from app.schemas.task import TaskCreate, Task, TaskTypeEnum
from app.crud.crud_task import create_task
from app.worker.tasks_document import process_document_task, simple_test_task
from app.core.supabase_client import get_supabase_client

router = APIRouter()

class DocumentProcessInitiateRequest(BaseModel):
    """Request model for initiating document processing."""
    user_id: str
    chatbot_id: UUID
    file_path_in_storage: str
    reference_id: UUID

@router.post("/initiate-processing", response_model=Task, status_code=202)
async def initiate_document_processing(
    payload: DocumentProcessInitiateRequest,
    db: Client = Depends(get_supabase_client)
) -> Task:
    """
    Initiate the asynchronous processing of a document.

    This endpoint:
    1. Creates a task record in the database.
    2. Dispatches a Celery job to process the document.
    3. Returns the created task details, including the `task_identifier` 
       which clients can use to track progress (e.g., via an SSE endpoint).

    - **user_id**: Identifier of the user initiating the request.
    - **chatbot_id**: Identifier of the chatbot this document belongs to.
    - **file_path_in_storage**: The path/key of the document in Supabase Storage.
    - **reference_id**: The ID for the content source record that will be created.
    """
    
    task_input_payload: Dict[str, Any] = {
        "file_path": payload.file_path_in_storage,
        "original_user_id": payload.user_id
    }

    task_to_create = TaskCreate(
        user_id=payload.user_id,
        chatbot_id=payload.chatbot_id,
        reference_id=payload.reference_id,
        task_type=TaskTypeEnum.DOCUMENT_PROCESSING,
        input_payload=task_input_payload
    )

    db_task = create_task(db=db, task_in=task_to_create)
    if db_task is None:
        raise HTTPException(
            status_code=500,
            detail="Failed to create task record in the database. Please try again."
        )
    
    process_document_task.delay(
        task_identifier=str(db_task.task_identifier), 
        reference_id=str(payload.reference_id),
        file_path=payload.file_path_in_storage, 
        user_id=payload.user_id,
        chatbot_id=str(payload.chatbot_id)
    )

    # simple_test_task.delay(value="hello")
    
    return db_task


    
