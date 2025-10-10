import logging
import os
import tempfile
from uuid import UUID
from typing import Optional, List, Dict, Any

from app.worker.celery_app import celery_app
from app.core.supabase_client import get_supabase_client
from app.crud.crud_task import update_task
from app.crud.crud_reference import get_reference, update_reference
from app.crud.crud_chunk import bulk_create_multimedia_chunks_with_embeddings
from app.schemas.task import TaskUpdate, TaskStatusEnum
from app.schemas.reference import IndexingStatusEnum, ContentSourceUpdate
from app.services.audio_extraction_service import audio_extraction_service
from app.services.transcription_service import transcription_service
from app.services.multimedia_chunking_service import multimedia_chunking_service
from app.services.multimedia_embedding_service import multimedia_embedding_service

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Placeholder imports for services we'll implement next
# from app.services.chunking_service import ChunkingService
# from app.services.embedding_service import EmbeddingService

@celery_app.task(name="index_multimedia_task")
def index_multimedia_task(
    task_identifier: str,
    reference_id: str,
    chatbot_id: str,
    user_id: str
):
    """
    Celery task for multimedia indexing (Phase 2).
    
    This task handles:
    1. Download multimedia file from storage
    2. Extract audio track (for videos)
    3. Transcribe audio using OpenAI GPT-4o transcription models
    4. Create time-based chunks (45s with 5s overlap)
    5. Generate embeddings for transcript chunks
    6. Store chunks in document_chunks table
    7. Update content source indexing status
    """
    db = None
    task_uuid = UUID(task_identifier)
    chatbot_uuid = UUID(chatbot_id)
    ref_uuid = UUID(reference_id)
    user_uuid = UUID(user_id)
    temp_dir = None
    
    logger.info(f"[Task ID: {task_uuid}] Starting multimedia indexing for reference: {ref_uuid}, "
                f"chatbot: {chatbot_uuid}, user: {user_id}")

    try:
        db = get_supabase_client()
        
        # Update task status to processing
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.PROCESSING,
            current_step_description="Starting multimedia indexing pipeline.",
            progress_percentage=5
        ))

        # Step 1: Get content source record
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Retrieving content source information...",
            progress_percentage=10
        ))
        
        content_source = get_reference(db=db, reference_id=ref_uuid)
        if not content_source:
            raise Exception(f"Content source not found for reference ID: {ref_uuid}")
        
        if not content_source.storage_path:
            raise Exception(f"No storage path found for content source: {ref_uuid}")
        
        logger.info(f"[Task ID: {task_uuid}] Found content source: {content_source.title}, "
                   f"type: {content_source.source_type}, path: {content_source.storage_path}")

        # Step 2: Download multimedia file
        temp_dir = tempfile.mkdtemp()
        original_filename = content_source.file_name or "multimedia_file"
        downloaded_file_path = os.path.join(temp_dir, original_filename)
        
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description=f"Downloading multimedia file '{original_filename}'...",
            progress_percentage=15
        ))
        
        logger.info(f"[Task ID: {task_uuid}] Downloading file from: {content_source.storage_path}")
        
        try:
            storage_response = db.storage.from_("documents").download(path=content_source.storage_path)
            if storage_response:
                with open(downloaded_file_path, "wb") as f:
                    f.write(storage_response)
                logger.info(f"[Task ID: {task_uuid}] Downloaded file to: {downloaded_file_path}")
            else:
                raise FileNotFoundError(f"Could not download {content_source.storage_path}")
        except Exception as download_exc:
            logger.error(f"[Task ID: {task_uuid}] Download error: {download_exc}", exc_info=True)
            raise

        # Step 3: Extract audio (if video) or prepare audio file
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Extracting audio track...",
            progress_percentage=25
        ))
        
        audio_file_path = audio_extraction_service.extract_audio_for_transcription(
            task_uuid, downloaded_file_path, content_source.source_type, temp_dir
        )
        
        # Step 4: Transcribe audio using OpenAI GPT-4o transcription models
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Transcribing audio content using OpenAI GPT-4o...",
            progress_percentage=40
        ))
        
        transcript_result = transcribe_audio_content(
            task_uuid, audio_file_path, content_source.title
        )
        
        # Step 5: Create time-based chunks (45s with 5s overlap)
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Creating time-based content chunks...",
            progress_percentage=60
        ))
        
        chunks = multimedia_chunking_service.create_time_based_chunks(
            task_uuid=task_uuid,
            transcript_result=transcript_result,
            reference_id=ref_uuid,
            chatbot_id=chatbot_uuid,
            chunk_duration=45,  # 45-second chunks
            overlap_duration=5  # 5-second overlap
        )
        
        # Step 6: Generate embeddings and store chunks
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Generating embeddings and storing chunks...",
            progress_percentage=80
        ))
        
        chunks_with_embeddings = multimedia_embedding_service.generate_embeddings_for_multimedia_chunks(
            task_uuid=task_uuid,
            chunks=chunks
        )
        
        # Get embedding statistics
        embedding_stats = multimedia_embedding_service.get_embedding_stats(chunks_with_embeddings)
        logger.info(f"[Task ID: {task_uuid}] Embedding stats: {embedding_stats}")
        
        stored_chunks_count = store_multimedia_chunks(
            task_uuid, chunks_with_embeddings, ref_uuid, chatbot_uuid, user_uuid, db, content_source.source_type
        )
        
        # Step 7: Update content source indexing status
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Finalizing indexing process...",
            progress_percentage=95
        ))
        
        # Update the content source to mark as indexed
        update_reference(
            db=db,
            reference_id=ref_uuid,
            reference_in=ContentSourceUpdate(
                indexing_status=IndexingStatusEnum.COMPLETED,
                error_message=None
            )
        )
        
        # Complete the task
        final_result = {
            "message": "Multimedia content indexed successfully",
            "reference_id": str(ref_uuid),
            "chunks_created": stored_chunks_count,
            "transcript_duration": transcript_result.get("duration_seconds", 0),
            "transcript_length": len(transcript_result.get("transcript", "")),
            "model_used": transcript_result.get("model_used", "unknown"),
            "content_type": content_source.source_type,
            "embedding_stats": embedding_stats
        }
        
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.COMPLETED,
            current_step_description="Multimedia indexing completed successfully.",
            progress_percentage=100,
            result_payload=final_result
        ))
        
        logger.info(f"[Task ID: {task_uuid}] Multimedia indexing COMPLETED. "
                   f"Reference: {ref_uuid}, Chunks: {stored_chunks_count}, "
                   f"Transcript: {len(transcript_result.get('transcript', ''))} chars")
        
        return final_result

    except Exception as e:
        logger.error(f"[Task ID: {task_uuid}] CRITICAL ERROR in index_multimedia_task: {e}", exc_info=True)
        
        if db:
            try:
                # Update content source to failed status
                update_reference(
                    db=db,
                    reference_id=ref_uuid,
                    reference_in=ContentSourceUpdate(
                        indexing_status=IndexingStatusEnum.FAILED,
                        error_message=str(e)
                    )
                )
                
                # Update task to failed status
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                    status=TaskStatusEnum.FAILED,
                    current_step_description="Critical error during multimedia indexing.",
                    error_details=str(e),
                    progress_percentage=0
                ))
            except Exception as db_error:
                logger.error(f"[Task ID: {task_uuid}] Failed to update task/reference to failed state: {db_error}")
        
        return {"status": "error", "task_id": str(task_uuid), "message": f"Multimedia indexing error: {str(e)}"}
    
    finally:
        # Clean up temporary files
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"[Task ID: {task_uuid}] Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_exc:
                logger.error(f"[Task ID: {task_uuid}] Error cleaning temp directory: {cleanup_exc}")
        
        logger.info(f"[Task ID: {task_uuid}] index_multimedia_task finished execution.")


# ============================================================================
# SERVICE FUNCTIONS
# ============================================================================

def transcribe_audio_content(
    task_uuid: UUID, 
    audio_file_path: str, 
    content_title: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transcribe audio content using OpenAI transcription models.
    
    Args:
        task_uuid: Task identifier for logging
        audio_file_path: Path to the audio file
        content_title: Title of the content for context-aware prompting
        
    Returns:
        Dictionary containing transcript and metadata
    """
    logger.info(f"[Task ID: {task_uuid}] Starting transcription")
    
    try:
        # Use the transcription service with context-aware prompting and timestamps
        result = transcription_service.transcribe_audio(
            task_uuid=task_uuid,
            audio_file_path=audio_file_path,
            content_title=content_title,
            use_timestamps=True,  # Always use timestamps for multimedia
            language=None  # Auto-detect language
        )
        
        logger.info(f"[Task ID: {task_uuid}] Transcription completed successfully")
        logger.info(f"[Task ID: {task_uuid}] Model used: {result.get('model_used')}")
        logger.info(f"[Task ID: {task_uuid}] Duration: {result.get('duration_seconds', 0):.2f}s")
        logger.info(f"[Task ID: {task_uuid}] Transcript length: {len(result.get('transcript', ''))} characters")
        logger.info(f"[Task ID: {task_uuid}] Segments: {len(result.get('segments', []))}")
        logger.info(f"[Task ID: {task_uuid}] Words: {len(result.get('words', []))}")
        
        return result
        
    except Exception as e:
        logger.error(f"[Task ID: {task_uuid}] Transcription failed: {e}", exc_info=True)
        raise RuntimeError(f"Audio transcription failed: {str(e)}")


# ============================================================================
# DATABASE STORAGE FUNCTIONS
# ============================================================================

def store_multimedia_chunks(
    task_uuid: UUID,
    chunks_with_embeddings: List[Dict[str, Any]],
    reference_id: UUID,
    chatbot_id: UUID,
    user_id: UUID,
    db,
    content_type: str
) -> int:
    """
    Store multimedia chunks with embeddings in document_chunks table.
    
    Args:
        task_uuid: Task identifier for logging
        chunks_with_embeddings: List of chunk dictionaries with embeddings
        reference_id: Reference ID for the content
        chatbot_id: Chatbot ID
        user_id: User ID who owns the content
        db: Supabase database client
        content_type: Content type of the multimedia content
        
    Returns:
        Number of successfully stored chunks
    """
    logger.info(f"[Task ID: {task_uuid}] Storing {len(chunks_with_embeddings)} multimedia chunks in database")
    
    if not chunks_with_embeddings:
        logger.warning(f"[Task ID: {task_uuid}] No chunks to store")
        return 0
    
    try:
        # Prepare data for bulk insert
        chunk_embedding_pairs = []
        for chunk in chunks_with_embeddings:
            embedding = chunk.get("embedding")
            if embedding is None:
                logger.warning(f"[Task ID: {task_uuid}] Skipping chunk without embedding: {chunk.get('chunk_id', 'unknown')}")
                continue
            
            chunk_embedding_pairs.append((chunk, embedding))
        
        if not chunk_embedding_pairs:
            logger.error(f"[Task ID: {task_uuid}] No chunks with valid embeddings to store")
            return 0
        
        logger.info(f"[Task ID: {task_uuid}] Prepared {len(chunk_embedding_pairs)} chunks for database storage")
        
        # Use the multimedia CRUD function to store chunks
        inserted_records, error_message = bulk_create_multimedia_chunks_with_embeddings(
            db=db,
            multimedia_chunk_embeddings_data=chunk_embedding_pairs,
            user_id=user_id,
            content_type=content_type
        )
        
        if error_message:
            logger.error(f"[Task ID: {task_uuid}] Database storage error: {error_message}")
            # Don't raise exception, return partial success count
            stored_count = len(inserted_records)
            logger.warning(f"[Task ID: {task_uuid}] Partial storage success: {stored_count}/{len(chunk_embedding_pairs)} chunks stored")
            return stored_count
        
        stored_count = len(inserted_records)
        logger.info(f"[Task ID: {task_uuid}] Successfully stored {stored_count} multimedia chunks in database")
        
        # Log storage statistics
        total_chars = sum(len(chunk.get('text', '')) for chunk, _ in chunk_embedding_pairs)
        avg_confidence = sum(chunk.get('confidence_score', 0) for chunk, _ in chunk_embedding_pairs) / len(chunk_embedding_pairs)
        
        logger.info(f"[Task ID: {task_uuid}] Storage stats: {total_chars} total characters, avg confidence: {avg_confidence:.3f}")
        
        return stored_count
        
    except Exception as e:
        logger.error(f"[Task ID: {task_uuid}] Critical error during multimedia chunk storage: {e}", exc_info=True)
        raise RuntimeError(f"Failed to store multimedia chunks: {str(e)}") 