from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from uuid import UUID
from pydantic import BaseModel, AnyUrl
from typing import Optional, Dict, Any

from app.schemas.task import TaskCreate, Task, TaskTypeEnum
from app.crud.crud_task import create_task
from app.worker.tasks_indexing import document_indexing_task
from app.core.supabase_client import get_supabase_client
from app.schemas.indexing import IndexingRequest

router = APIRouter()

@router.post("/initiate-indexing", response_model=Task, status_code=202)
async def initiate_indexing(
    payload: IndexingRequest,
    db: Client = Depends(get_supabase_client)
) -> Task:
    """
    Initiates the document indexing process for a given reference.
    A task record is created, and an indexing task is dispatched to the Celery worker.
    """
    current_input_payload: Dict[str, Any] = {
        # Example: "indexing_strategy": "full_text_v1"
        # "original_user_id_as_uuid": str(payload.user_id) # If needed for some reason
    }

    task_to_create = TaskCreate(
        user_id=str(payload.user_id),
        chatbot_id=payload.chatbot_id,
        reference_id=payload.reference_id,
        task_type=TaskTypeEnum.DOCUMENT_INDEXING,
        input_payload=current_input_payload if current_input_payload else None
    )

    db_task = create_task(db=db, task_in=task_to_create)

    if db_task is None:
        raise HTTPException(
            status_code=500,
            detail="Failed to create task record in the database. Please try again."
        )
    
    document_indexing_task.delay(
        task_identifier=str(db_task.task_identifier),
        reference_id=str(payload.reference_id),
        user_id=str(payload.user_id),
        chatbot_id=str(payload.chatbot_id)
    )

    return db_task

