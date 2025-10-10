import tempfile
import logging
from uuid import UUID
import os
import shutil

from app.worker.celery_app import celery_app
from app.core.supabase_client import get_supabase_client
from app.crud.crud_reference import get_reference, update_reference
from app.crud.crud_task import update_task, get_task
from app.schemas.task import TaskUpdate, TaskStatusEnum, Task
from app.schemas.reference import ContentSourceUpdate, IndexingStatusEnum

# Import services and CRUD for chunks
from app.services import pdf_parsing_service
from app.services import chunking_service
from app.services import embedding_service
from app.crud import crud_chunk

from app.core.config import settings # Import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@celery_app.task(name="document_indexing_task", bind=True)
def document_indexing_task(self, task_identifier: str, reference_id: str, user_id: str, chatbot_id: str):
    """
    Celery task to download a processed PDF file (or other format) from Supabase Storage,
    then parse it, chunk it, generate embeddings, and index its content in the database.
    """
    db = None
    task_uuid = UUID(task_identifier)
    ref_id = UUID(reference_id)
    chatbot_uuid = UUID(chatbot_id) # Use this for consistency with user_id (string)
    user_uuid = UUID(user_id)  # Convert user_id string to UUID for chunking service

    temp_dir_path = tempfile.mkdtemp()
    downloaded_file_path_local = None

    logger.info(f"[Task ID: {task_uuid}] Starting document_indexing_task for Reference ID: {ref_id}, User ID: {user_uuid}, Chatbot ID: {chatbot_uuid}")

    try:
        db = get_supabase_client() # This should return a sync Supabase Client
        if not db:
            raise ConnectionError("Failed to get Supabase client for Celery task.")

        # Initial task update
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.PROCESSING,
            current_step_description="Initiating document indexing process.",
            progress_percentage=5
        ))

        # 1. Get reference details to find the file in storage
        logger.info(f"[Task ID: {task_uuid}] Fetching reference details for Reference ID: {ref_id}")
        db_reference = get_reference(db=db, reference_id=ref_id)
        if not db_reference or not db_reference.storage_path:
            error_msg = f"Reference ID {ref_id} not found or has no storage_path."
            raise ValueError(error_msg) # Raise specific error
        
        file_storage_path = db_reference.storage_path
        original_file_name = os.path.basename(file_storage_path)
        logger.info(f"[Task ID: {task_uuid}] Reference found. File to download: '{file_storage_path}'")

        # 2. Download the file from Supabase Storage
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description=f"Downloading '{original_file_name}'...",
            progress_percentage=10
        ))
        downloaded_file_path_local = os.path.join(temp_dir_path, original_file_name)
        logger.info(f"[Task ID: {task_uuid}] Downloading '{original_file_name}' to '{downloaded_file_path_local}'...")
        
        try:
            storage_response_bytes = db.storage.from_("documents").download(path=file_storage_path)
            if storage_response_bytes:
                with open(downloaded_file_path_local, "wb") as f:
                    f.write(storage_response_bytes)
                logger.info(f"[Task ID: {task_uuid}] Successfully downloaded '{original_file_name}'.")
            else:
                raise FileNotFoundError(f"Could not download '{file_storage_path}'. Response was empty or invalid.")
        except Exception as download_exc:
            logger.error(f"[Task ID: {task_uuid}] Download error for '{file_storage_path}': {download_exc}", exc_info=True)
            raise # Re-raise to be caught by main try-except

        if not os.path.exists(downloaded_file_path_local) or os.path.getsize(downloaded_file_path_local) == 0:
            raise FileNotFoundError(f"Downloaded file '{downloaded_file_path_local}' not found or is empty.")

        # 3. Parse PDF content
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description=f"Parsing content from '{original_file_name}'...",
            progress_percentage=25
        ))
        logger.info(f"[Task ID: {task_uuid}] Parsing PDF: {downloaded_file_path_local}")
        parsed_pages = pdf_parsing_service.parse_pdf(file_path=downloaded_file_path_local)
        if not parsed_pages:
            # parse_pdf should raise an error if it fails, but handle empty list defensively
            raise ValueError(f"PDF parsing returned no pages for '{original_file_name}'.")
        logger.info(f"[Task ID: {task_uuid}] Successfully parsed {len(parsed_pages)} pages.")

        # 4. Chunk parsed content
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Chunking parsed content...",
            progress_percentage=40
        ))
        # Max tokens and overlap can be made configurable if needed, e.g., from task payload or global settings
        chunks_to_embed = chunking_service.chunk_parsed_pages(
            parsed_pages=parsed_pages,
            reference_id=ref_id,
            user_id=user_uuid, # Pass user UUID
            chatbot_id=chatbot_uuid, # Pass chatbot_id from task args
            min_tokens_per_chunk =  settings.MIN_TOKENS_PER_CHUNK,
            max_tokens_per_chunk=settings.MAX_TOKENS_PER_CHUNK, # Use settings
            token_overlap=settings.TOKEN_OVERLAP         # Use settings
        )
        if not chunks_to_embed:
            logger.warning(f"[Task ID: {task_uuid}] No chunks were generated for '{original_file_name}'. This might be normal for very short documents.")
            # If no chunks, the process can be considered complete for indexing purposes.
            
            # Update content source status to completed even if no chunks
            update_reference(db=db, reference_id=ref_id, reference_in=ContentSourceUpdate(
                indexing_status=IndexingStatusEnum.COMPLETED,
                processed_at=None  # Let the DB set the timestamp
            ))
            
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                status=TaskStatusEnum.COMPLETED,
                current_step_description="Document processed, no text chunks generated for indexing (e.g., empty or very short document).",
                progress_percentage=100,
                result_payload={"status": "success", "message": "No chunks to index."}
            ))
            return {"status": "success", "task_id": str(task_uuid), "message": "No chunks generated to index."}
        logger.info(f"[Task ID: {task_uuid}] Generated {len(chunks_to_embed)} chunks for embedding.")

        # 5. Generate embeddings for chunks
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description=f"Generating embeddings for {len(chunks_to_embed)} chunks...",
            progress_percentage=60
        ))
        # embedding_service.DEFAULT_EMBEDDING_MODEL will be used if not specified
        # Now embedding_service will use settings.OPENAI_EMBEDDING_MODEL by default
        chunk_embeddings_data = embedding_service.generate_embeddings_for_chunks(chunks_data=chunks_to_embed)
        if not chunk_embeddings_data or len(chunk_embeddings_data) != len(chunks_to_embed):
            raise Exception(f"Failed to generate embeddings for all chunks. Expected {len(chunks_to_embed)}, got {len(chunk_embeddings_data) if chunk_embeddings_data else 0}.")
        logger.info(f"[Task ID: {task_uuid}] Successfully generated embeddings for {len(chunk_embeddings_data)} chunks.")

        # 6. Delete old chunks for this reference_id (important for re-indexing)
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Clearing any existing indexed chunks for this document...",
            progress_percentage=75
        ))
        logger.info(f"[Task ID: {task_uuid}] Deleting existing chunks for Reference ID: {ref_id}")
        deleted_ok, delete_error = crud_chunk.delete_chunks_by_reference_id(db=db, reference_id=ref_id)
        if not deleted_ok:
            # Log the error but proceed. Maybe old chunks couldn't be deleted but new ones can still be added.
            # Or, you might choose to make this a hard failure.
            logger.error(f"[Task ID: {task_uuid}] Failed to delete old chunks for Reference ID {ref_id}: {delete_error}. Proceeding with insertion of new chunks.")
            # If this should be a hard fail: raise Exception(f"Failed to delete old chunks: {delete_error}")

        # 7. Bulk create new chunks with embeddings in the database
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description=f"Saving {len(chunk_embeddings_data)} new chunks to database...",
            progress_percentage=90
        ))
        logger.info(f"[Task ID: {task_uuid}] Bulk inserting {len(chunk_embeddings_data)} new chunks.")
        inserted_data, insert_error = crud_chunk.bulk_create_chunks_with_embeddings(db=db, chunk_embeddings_data=chunk_embeddings_data)
        if insert_error or len(inserted_data) != len(chunk_embeddings_data):
            error_detail = insert_error if insert_error else f"Inserted count mismatch: expected {len(chunk_embeddings_data)}, got {len(inserted_data)}."
            raise Exception(f"Failed to bulk insert all chunks: {error_detail}")
        logger.info(f"[Task ID: {task_uuid}] Successfully inserted {len(inserted_data)} new chunks.")

        # 8. Update content source status to completed
        logger.info(f"[Task ID: {task_uuid}] Updating content source status to completed.")
        update_reference(db=db, reference_id=ref_id, reference_in=ContentSourceUpdate(
            indexing_status=IndexingStatusEnum.COMPLETED,
            processed_at=None  # Let the DB set the timestamp
        ))

        # 9. Finalize task as COMPLETED
        final_message = f"Document '{original_file_name}' successfully parsed, chunked, embedded, and indexed. {len(inserted_data)} chunks stored."
        logger.info(f"[Task ID: {task_uuid}] {final_message}")
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.COMPLETED,
            current_step_description=final_message,
            progress_percentage=100,
            result_payload={"status": "success", "message": final_message, "chunks_indexed": len(inserted_data)}
        ))
        
        return {"status": "success", "task_id": str(task_uuid), "message": final_message}

    except Exception as e:
        error_message = f"An error occurred during document indexing for Reference ID {ref_id}: {str(e)}"
        logger.error(f"[Task ID: {task_uuid}] CRITICAL ERROR in document_indexing_task: {error_message}", exc_info=True)
        if db:
            try:
                # Update content source status to failed
                update_reference(db=db, reference_id=ref_id, reference_in=ContentSourceUpdate(
                    indexing_status=IndexingStatusEnum.FAILED,
                    error_message=error_message
                ))
                
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                    status=TaskStatusEnum.FAILED,
                    current_step_description="Failed during document indexing process.",
                    error_details=error_message,
                    progress_percentage=0 
                ))
            except Exception as db_error_on_fail:
                logger.error(f"[Task ID: {task_uuid}] FAILED TO UPDATE TASK TO FAILED state after critical error. DB Error: {db_error_on_fail}", exc_info=True)
        return {"status": "error", "task_id": str(task_uuid), "message": error_message}

    finally:
        if temp_dir_path and os.path.exists(temp_dir_path):
            try:
                shutil.rmtree(temp_dir_path)
                logger.info(f"[Task ID: {task_uuid}] Successfully cleaned temp directory: {temp_dir_path}")
            except Exception as cleanup_exc:
                logger.error(f"[Task ID: {task_uuid}] Error cleaning temp directory {temp_dir_path}: {cleanup_exc}", exc_info=True)
        
        # Supabase client (db) does not typically require an explicit close method for sync client.
        logger.info(f"[Task ID: {task_uuid}] document_indexing_task execution attempt finished.")

    
    
