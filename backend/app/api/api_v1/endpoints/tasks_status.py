from fastapi import APIRouter, Depends, Request
from starlette.responses import StreamingResponse
from supabase import Client
from uuid import UUID
from asyncio import sleep
import logging
import json

from app.schemas.task import Task, TaskStatusEnum
from app.crud.crud_task import get_task
from app.core.supabase_client import get_supabase_client
from app.core.config import settings

# Configure logger for this module
logger = logging.getLogger(__name__)
# Basic config if not set globally - FastAPI/Uvicorn might handle this too
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

router = APIRouter()

async def generate_task_status_updates(task_identifier: UUID, request: Request, db: Client):
    """
    Asynchronous generator that polls for task status updates and yields them as SSE events.
    Stops when the task reaches a terminal state (COMPLETED, FAILED) or the client disconnects.
    """
    logger.info(f"[SSE Stream Task: {task_identifier}] Starting status stream for client: {request.client.host}")
    last_known_status = None
    last_sent_payload_str = None # To avoid sending the exact same string if only updated_at changed but nothing else in payload

    try:
        while True:
            if await request.is_disconnected():
                logger.info(f"[SSE Stream Task: {task_identifier}] Client disconnected. Closing stream.")
                break
            
            current_task_data = get_task(db=db, task_identifier=task_identifier)

            if current_task_data:
                # Serialize the Pydantic model directly to a JSON string
                # This handles UUID, datetime, Enums correctly for JSON.
                json_data_str = current_task_data.model_dump_json()

                # Send update if the payload string has changed
                if json_data_str != last_sent_payload_str:
                    yield f"data: {json_data_str}\n\n"
                    logger.debug(f"[SSE Stream Task: {task_identifier}] Sent update: {json_data_str}")
                    last_sent_payload_str = json_data_str
                    last_known_status = current_task_data.status # Update last_known_status only when sending
                
                if current_task_data.status in [TaskStatusEnum.COMPLETED, TaskStatusEnum.FAILED, TaskStatusEnum.CANCELLED]:
                    logger.info(f"[SSE Stream Task: {task_identifier}] Task reached terminal state: {current_task_data.status.value}. Closing stream.")
                    # ALWAYS send final terminal state to ensure frontend receives completion notification
                    yield f"data: {json_data_str}\n\n"
                    logger.debug(f"[SSE Stream Task: {task_identifier}] Sent final terminal state update: {json_data_str}")
                    break
            else:
                logger.warning(f"[SSE Stream Task: {task_identifier}] Task not found in database. Closing stream.")
                yield f"event: error\ndata: {{ \"message\": \"Task {task_identifier} not found\" }}\n\n" # Send custom error event
                break
            
            await sleep(settings.SSE_POLL_INTERVAL_SECONDS)
    except Exception as e:
        logger.error(f"[SSE Stream Task: {task_identifier}] Error during event generation: {e}", exc_info=True)
        try:
            # Attempt to send a final error event to the client if possible
            error_payload = {"message": "An internal error occurred while streaming updates.", "task_id": str(task_identifier)}
            yield f"event: error\ndata: {json.dumps(error_payload)}\n\n" # Need dumps here for this ad-hoc dict
        except Exception as send_err:
            logger.error(f"[SSE Stream Task: {task_identifier}] Failed to send error event to client: {send_err}")
    finally:
        logger.info(f"[SSE Stream Task: {task_identifier}] Event generation loop ended.")

@router.get("/{task_identifier}/status-stream", summary="Stream Task Status Updates (SSE)")
async def stream_task_status(
    task_identifier: UUID, 
    request: Request,
    db: Client = Depends(get_supabase_client)
):
    """
    Establishes a Server-Sent Events (SSE) connection to stream real-time 
    status updates for a given background task.

    Events:
    - `message` (default): Contains the JSON payload of the `Task` schema.
    - `error`: Sent if the task is not found or an internal error occurs during streaming.

    The stream will automatically close when:
    - The task reaches a terminal state (e.g., COMPLETED, FAILED, CANCELLED).
    - The task specified by `task_identifier` is not found.
    - The client disconnects.
    - An unrecoverable server error occurs during streaming.

    - **task_identifier**: The unique identifier of the task to monitor.
    """
    return StreamingResponse(
        generate_task_status_updates(task_identifier=task_identifier, request=request, db=db),
        media_type="text/event-stream"
    )
