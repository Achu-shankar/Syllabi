import logging
import os
import tempfile
from uuid import UUID
from typing import Optional, Dict, Any

from app.worker.celery_app import celery_app
from app.core.supabase_client import get_supabase_client
from app.crud.crud_task import update_task
from app.crud.crud_reference import create_reference as crud_create_reference
from app.schemas.task import TaskUpdate, TaskStatusEnum
from app.schemas.reference import ContentSourceCreate, SourceTypeEnum, IndexingStatusEnum, IngestionSourceEnum
from app.schemas.multimedia import MultimediaMetadata

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_file_metadata(file_path: str, media_type: str) -> MultimediaMetadata:
    """
    Extract basic metadata from multimedia file.
    For now, this is a simple implementation. In Phase 2, we'll add proper
    video/audio analysis using ffmpeg or similar tools.
    """
    try:
        file_size = os.path.getsize(file_path)
        file_ext = os.path.splitext(file_path)[1].lower()
        
        metadata = MultimediaMetadata(
            file_size_bytes=file_size,
            format=file_ext.lstrip('.') if file_ext else None
        )
        
        # TODO: In Phase 2, add proper metadata extraction using ffmpeg:
        # - duration_seconds
        # - video_resolution  
        # - audio_codec, video_codec
        # - frame_rate, audio_sample_rate
        # - bitrate
        
        logger.info(f"Extracted basic metadata: size={file_size} bytes, format={metadata.format}")
        return metadata
        
    except Exception as e:
        logger.error(f"Error extracting metadata from {file_path}: {e}")
        return MultimediaMetadata(file_size_bytes=0)

@celery_app.task(name="process_multimedia_task")
def process_multimedia_task(
    task_identifier: str, 
    reference_id: str, 
    file_path: str, 
    user_id: str, 
    chatbot_id: str,
    media_type: str,
    original_filename: Optional[str] = None
):
    """
    Celery task for basic multimedia processing (Phase 1).
    
    This task handles:
    1. Download multimedia file from Supabase bucket
    2. Extract basic metadata (file size, format)
    3. Create content_sources record
    4. Clean up temporary files
    
    Heavy processing (transcription, chunking, embedding) will be handled
    in Phase 2 by the multimedia indexing task.
    """
    db = None
    task_uuid = UUID(task_identifier)
    chatbot_uuid = UUID(chatbot_id)
    ref_uuid = UUID(reference_id)
    temp_dir = None
    downloaded_file_path = None
    
    logger.info(f"[Task ID: {task_uuid}] Starting multimedia processing for file: {file_path}, "
                f"type: {media_type}, user: {user_id}, chatbot: {chatbot_uuid}")

    try:
        db = get_supabase_client()
        
        # Update task status to processing
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.PROCESSING,
            current_step_description="Starting multimedia file processing.",
            progress_percentage=5
        ))

        # Create temporary directory for file processing
        temp_dir = tempfile.mkdtemp()
        filename = original_filename or os.path.basename(file_path)
        downloaded_file_path = os.path.join(temp_dir, filename)
        
        # Download file from Supabase bucket
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description=f"Downloading multimedia file '{filename}'...",
            progress_percentage=10
        ))
        
        logger.info(f"[Task ID: {task_uuid}] Downloading file from bucket: {file_path}")
        
        try:
            storage_response = db.storage.from_("documents").download(path=file_path)
            if storage_response:
                with open(downloaded_file_path, "wb") as f:
                    f.write(storage_response)
                logger.info(f"[Task ID: {task_uuid}] Successfully downloaded file to: {downloaded_file_path}")
            else:
                raise FileNotFoundError(f"Could not download {file_path}. Empty response from storage.")
        except Exception as download_exc:
            logger.error(f"[Task ID: {task_uuid}] Download error for '{file_path}': {download_exc}", exc_info=True)
            raise

        # Verify file was downloaded
        if not os.path.exists(downloaded_file_path) or os.path.getsize(downloaded_file_path) == 0:
            raise FileNotFoundError(f"Downloaded file '{downloaded_file_path}' not found or is empty.")

        # Extract basic metadata
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Extracting file metadata...",
            progress_percentage=30
        ))
        
        metadata = get_file_metadata(downloaded_file_path, media_type)
        
        # Determine source type based on media type
        source_type = SourceTypeEnum.VIDEO if media_type == "video" else SourceTypeEnum.AUDIO
        
        # Create content source record
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Creating content source record...",
            progress_percentage=70
        ))
        
        # Prepare metadata for storage
        metadata_dict = metadata.dict()
        metadata_dict["ingestion_source"] = IngestionSourceEnum.FILE_UPLOAD.value
        metadata_dict["media_type"] = media_type
        
        content_source_to_create = ContentSourceCreate(
            chatbot_id=chatbot_uuid,
            source_type=source_type,
            file_name=filename,
            storage_path=file_path,
            title=os.path.splitext(filename)[0] if filename else f"{media_type.title()} Content",
            indexing_status=IndexingStatusEnum.PENDING,  # Will be indexed in Phase 2
            metadata=metadata_dict
        )
        
        logger.info(f"[Task ID: {task_uuid}] Creating content source record. "
                   f"Title: '{content_source_to_create.title}', Type: {source_type.value}")
        
        created_reference = crud_create_reference(
            db=db, 
            reference_in=content_source_to_create, 
            reference_id=ref_uuid
        )
        
        if created_reference and hasattr(created_reference, 'id') and created_reference.id:
            created_reference_id = created_reference.id
            logger.info(f"[Task ID: {task_uuid}] Created content source ID: {created_reference_id}")
            
            # Update task with reference ID
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                reference_id=created_reference_id
            ))
        else:
            err_msg = "Failed to create content source in DB or ID missing from response."
            logger.error(f"[Task ID: {task_uuid}] {err_msg}")
            raise Exception(err_msg)

        # Complete the task
        final_result_payload = {
            "message": f"Multimedia file processed successfully. Ready for indexing.",
            "reference_id": str(created_reference_id),
            "storage_path": file_path,
            "media_type": media_type,
            "metadata": metadata_dict
        }
        
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.COMPLETED,
            current_step_description="Multimedia processing complete. Ready for indexing.",
            progress_percentage=100,
            result_payload=final_result_payload
        ))
        
        logger.info(f"[Task ID: {task_uuid}] Multimedia processing COMPLETED. "
                   f"File: {file_path}, Reference ID: {created_reference_id}")
        
        return final_result_payload

    except Exception as e:
        logger.error(f"[Task ID: {task_uuid}] CRITICAL ERROR in process_multimedia_task: {e}", exc_info=True)
        if db:
            try:
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                    status=TaskStatusEnum.FAILED,
                    current_step_description="Critical error during multimedia processing.",
                    error_details=str(e),
                    progress_percentage=0
                ))
            except Exception as db_error_on_fail:
                logger.error(f"[Task ID: {task_uuid}] FAILED TO UPDATE TASK TO FAILED state. "
                           f"DB Error: {db_error_on_fail}", exc_info=True)
        
        return {"status": "error", "task_id": str(task_uuid), "message": f"Multimedia processing error: {str(e)}"}
    
    finally:
        # Clean up temporary files
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"[Task ID: {task_uuid}] Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_exc:
                logger.error(f"[Task ID: {task_uuid}] Error cleaning temp directory {temp_dir}: {cleanup_exc}", exc_info=True)
        
        logger.info(f"[Task ID: {task_uuid}] process_multimedia_task finished execution.") 