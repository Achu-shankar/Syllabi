from app.core.supabase_client import get_supabase_client
from app.crud.crud_task import update_task
from app.schemas.task import TaskUpdate, TaskStatusEnum
from app.worker.celery_app import celery_app

from uuid import UUID, uuid4
from time import sleep
import logging
import os
import tempfile
from typing import Optional, List, Tuple

# Python-native MD to PDF
import markdown2
from weasyprint import HTML, CSS # CSS is optional for styling

# TXT to PDF
from fpdf import FPDF

# PDF manipulation
# import fitz  # PyMuPDF - REMOVED as function moved

# OpenAI API related imports
# from openai import OpenAI # This line should be removed if present
# from app.schemas.llm_extraction import ExtractedMetadata # Retain for type hinting service response
# from app.core.config import settings # Retain as it might be used by service indirectly or other parts of file

# Imports for saving to references table
from app.schemas.reference import (
    ContentSourceCreate,
    SourceTypeEnum,
    IndexingStatusEnum,
    IngestionSourceEnum,     # NEW
    OriginalFileFormatEnum,  # NEW
)
from app.crud.crud_reference import create_reference as crud_create_reference
import asyncio

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Helper function to get file extension
def get_file_extension(file_path: str) -> str:
    return os.path.splitext(file_path)[1].lower()

# Function extract_text_from_pdf_pages was here. It has been moved to core_processing.py

@celery_app.task(name="process_document_task_async")
async def async_process_document_task(task_identifier: str, reference_id: str, file_path: str, user_id: str, chatbot_id: str):
    """ 
    Celery task to download a file from Supabase Storage, convert it to PDF if necessary,
    re-upload converted PDF, extract text incrementally, and then send to LLM for metadata extraction.
    `file_path` is the path of the file within the Supabase bucket.
    """
    db = None 
    task_uuid = UUID(task_identifier)
    chatbot_uuid = UUID(chatbot_id)
    logger.info(f"[Task ID: {task_uuid}] Starting document processing for Supabase file: {file_path}, user: {user_id}, chatbot: {chatbot_uuid}")

    original_file_name = os.path.basename(file_path)
    original_file_size_bytes: Optional[int] = None
    downloaded_file_path_local = None
    local_pdf_for_pipeline: Optional[str] = None 
    temp_dir = tempfile.mkdtemp()
    final_pdf_storage_path_for_pipeline = file_path # Default to original path if it's already a PDF and not re-uploaded
    source_original_file_format: Optional[OriginalFileFormatEnum] = None

    try:
        db = get_supabase_client()
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.PROCESSING, 
            current_step_description="Document processing initiated.", 
            progress_percentage=5))

        file_ext = get_file_extension(file_path)
        logger.info(f"[Task ID: {task_uuid}] Detected file extension: {file_ext}. Original name: {original_file_name}")
        downloaded_file_path_local = os.path.join(temp_dir, original_file_name)
        
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description=f"Downloading '{original_file_name}'...", progress_percentage=8))
        try:
            storage_response = db.storage.from_("documents").download(path=file_path)
            if storage_response:
                with open(downloaded_file_path_local, "wb") as f: f.write(storage_response)
                original_file_size_bytes = os.path.getsize(downloaded_file_path_local)
                logger.info(f"[Task ID: {task_uuid}] Downloaded '{original_file_name}'. Size: {original_file_size_bytes} bytes.")
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description=f"Document '{original_file_name}' downloaded.", progress_percentage=10))
            else:
                raise FileNotFoundError(f"Could not download {file_path}. Empty response.")
        except Exception as download_exc:
            logger.error(f"[Task ID: {task_uuid}] Download error for '{file_path}': {download_exc}", exc_info=True)
            raise

        if not os.path.exists(downloaded_file_path_local):
             raise FileNotFoundError(f"Downloaded file {downloaded_file_path_local} not found.")

        # Determine source_original_file_format based on initial file_ext
        if file_ext == ".pdf": source_original_file_format = OriginalFileFormatEnum.PDF
        elif file_ext == ".txt": source_original_file_format = OriginalFileFormatEnum.TXT
        elif file_ext == ".md": source_original_file_format = OriginalFileFormatEnum.MD
        elif file_ext == ".docx": source_original_file_format = OriginalFileFormatEnum.DOCX
        elif file_ext == ".pptx": source_original_file_format = OriginalFileFormatEnum.PPTX
        # else: keep as None, will be handled by unsupported type error

        # === File Conversion to PDF (if necessary) ===
        if file_ext == ".pdf":
            local_pdf_for_pipeline = downloaded_file_path_local
            # final_pdf_storage_path_for_pipeline already defaults to file_path
            logger.info(f"[Task ID: {task_uuid}] File is already PDF: {local_pdf_for_pipeline}")
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description="PDF identified for processing.", progress_percentage=25))
        elif file_ext == ".txt":
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description=f"Converting '{original_file_name}' (TXT) to PDF...", progress_percentage=15))
            base_name_no_ext = os.path.splitext(original_file_name)[0]
            converted_pdf_filename = f"{base_name_no_ext}_{uuid4()}.pdf"
            converted_pdf_local_path = os.path.join(temp_dir, converted_pdf_filename)
            try:
                with open(downloaded_file_path_local, "r", encoding="utf-8") as txt_file:
                    text_content = txt_file.read()
                
                # FPDF has limited Unicode support, so we need to clean the text
                # This approach handles emojis and special Unicode characters gracefully
                import unicodedata
                import re
                
                # First, try to normalize and clean the text
                try:
                    # Normalize Unicode characters
                    normalized_content = unicodedata.normalize('NFKD', text_content)
                    
                    # Remove or replace emojis and special Unicode symbols
                    # This regex removes most emoji and symbol characters
                    emoji_pattern = re.compile("["
                        u"\U0001F600-\U0001F64F"  # emoticons
                        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                        u"\U0001F680-\U0001F6FF"  # transport & map symbols
                        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
                        u"\U00002702-\U000027B0"  # various symbols
                        u"\U000024C2-\U0001F251"  # enclosed characters
                        u"\U0001f926-\U0001f937"  # additional emojis
                        u"\U00010000-\U0010ffff"  # supplementary characters
                        u"\u2640-\u2642"  # gender symbols
                        u"\u2600-\u2B55"  # misc symbols
                        u"\u200d"  # zero width joiner
                        u"\u23cf"  # eject symbol
                        u"\u23e9"  # fast forward
                        u"\u231a"  # watch
                        u"\ufe0f"  # variation selector
                        u"\u3030"  # wavy dash
                        "]+", flags=re.UNICODE)
                    
                    # Replace emojis with text descriptions
                    cleaned_content = emoji_pattern.sub(' [emoji] ', normalized_content)
                    
                    # Keep only ASCII and basic Latin-1 characters that FPDF can handle
                    final_content = ''.join(char for char in cleaned_content if ord(char) < 256)
                    
                    # Clean up multiple spaces and add a note if content was modified
                    final_content = re.sub(r'\s+', ' ', final_content).strip()
                    if len(final_content) != len(text_content):
                        final_content = "[Note: Some special characters and emojis were replaced for PDF compatibility]\n\n" + final_content
                    
                except Exception as clean_error:
                    logger.warning(f"[Task ID: {task_uuid}] Error cleaning Unicode content: {clean_error}. Using basic ASCII conversion.")
                    # Fallback: convert to ASCII, ignoring problematic characters
                    final_content = "[Note: Special characters were removed for PDF compatibility]\n\n"
                    final_content += text_content.encode('ascii', 'ignore').decode('ascii')
                
                pdf = FPDF()
                pdf.add_page()
                
                # Use a simple font approach - stick with built-in fonts
                try:
                    pdf.set_font("Arial", "", 12)
                    logger.info(f"[Task ID: {task_uuid}] Using Arial font for PDF generation")
                except RuntimeError:
                    try:
                        pdf.set_font("Times", "", 12)
                        logger.info(f"[Task ID: {task_uuid}] Using Times font for PDF generation")
                    except RuntimeError: 
                        logger.error(f"[Task ID: {task_uuid}] Could not set any font")
                        raise RuntimeError("Failed to set any font for PDF generation")
                
                # Add the cleaned content to PDF
                pdf.multi_cell(0, 10, final_content)
                pdf.output(converted_pdf_local_path, "F")
                
                local_pdf_for_pipeline = converted_pdf_local_path
                logger.info(f"[Task ID: {task_uuid}] Converted TXT to '{local_pdf_for_pipeline}'")
                
                storage_path_for_converted_pdf = f"{chatbot_id}/{converted_pdf_filename}"
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description=f"Uploading converted PDF '{converted_pdf_filename}'...", progress_percentage=20))
                with open(local_pdf_for_pipeline, "rb") as f_pdf:
                    db.storage.from_("documents").upload(path=storage_path_for_converted_pdf, file=f_pdf, file_options={"content-type": "application/pdf"})
                final_pdf_storage_path_for_pipeline = storage_path_for_converted_pdf
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description="TXT PDF ready for processing.", progress_percentage=25))
            except Exception as conv_exc: 
                logger.error(f"[Task ID: {task_uuid}] TXT to PDF conversion error: {conv_exc}", exc_info=True)
                raise
        elif file_ext == ".md":
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description=f"Converting '{original_file_name}' (MD) to PDF...", progress_percentage=15))
            base_name_no_ext = os.path.splitext(original_file_name)[0]; 
            converted_pdf_filename = f"{base_name_no_ext}_{uuid4()}.pdf"
            converted_pdf_local_path = os.path.join(temp_dir, converted_pdf_filename)
            try:
                with open(downloaded_file_path_local, "r", encoding="utf-8") as md_file: md_content = md_file.read()
                html_content = markdown2.markdown(md_content, extras=["tables", "fenced-code-blocks", "footnotes", "cuddled-lists", "code-friendly"])
                css = CSS(string="""@page { size: A4; margin: 1.5cm; } body { font-family: sans-serif; line-height: 1.4; } h1, h2, h3, h4, h5, h6 { margin-top: 1.2em; margin-bottom: 0.5em; line-height: 1.2; } p { margin-bottom: 0.8em; } a { color: #007bff; } table { border-collapse: collapse; width: 100%; margin-bottom: 1em; } th, td { border: 1px solid #ddd; padding: 8px; } th { background-color: #f2f2f2; } pre { background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 4px; }""")
                HTML(string=html_content).write_pdf(converted_pdf_local_path, stylesheets=[css])
                local_pdf_for_pipeline = converted_pdf_local_path
                logger.info(f"[Task ID: {task_uuid}] Converted MD to '{local_pdf_for_pipeline}'")
                
                storage_path_for_converted_pdf = f"{chatbot_id}/{converted_pdf_filename}"
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description=f"Uploading converted PDF '{converted_pdf_filename}'...", progress_percentage=20))
                with open(local_pdf_for_pipeline, "rb") as f_pdf:
                    db.storage.from_("documents").upload(path=storage_path_for_converted_pdf, file=f_pdf, file_options={"content-type": "application/pdf", "upsert": "false"})
                final_pdf_storage_path_for_pipeline = storage_path_for_converted_pdf
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description="MD PDF ready for processing.", progress_percentage=25))
            except Exception as conv_exc: logger.error(f"[Task ID: {task_uuid}] MD to PDF conversion error: {conv_exc}", exc_info=True); raise
        elif file_ext in [".docx", ".pptx"]:
            logger.warning(f"[Task ID: {task_uuid}] Processing for {file_ext} is not implemented yet.")
            # source_original_file_format is already set above
            raise NotImplementedError(f"Processing for {file_ext} files is not implemented yet.")
        else:
            logger.warning(f"[Task ID: {task_uuid}] Unsupported file type: {file_ext}")
            raise ValueError(f"Unsupported file type: {file_ext}.")

        if not local_pdf_for_pipeline or not os.path.exists(local_pdf_for_pipeline):
            logger.error(f"[Task ID: {task_uuid}] PDF path '{local_pdf_for_pipeline}' for processing is invalid.")
            raise ValueError("Failed to obtain a valid PDF for shared pipeline.")
        
        # All pre-processing and conversion is done. PDF is ready at local_pdf_for_pipeline.
        # The final storage path (original or new) is final_pdf_storage_path_for_pipeline.
        logger.info(f"[Task ID: {task_uuid}] File processing complete. Final storage path: {final_pdf_storage_path_for_pipeline}")
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description="Creating content source record...", progress_percentage=80))

        # Map original_file_format_enum to SourceTypeEnum
        source_type = SourceTypeEnum.PDF  # Default to PDF since we convert everything to PDF
        if source_original_file_format:
            if source_original_file_format == OriginalFileFormatEnum.PDF:
                source_type = SourceTypeEnum.PDF
            elif source_original_file_format == OriginalFileFormatEnum.TXT:
                source_type = SourceTypeEnum.TXT
            elif source_original_file_format == OriginalFileFormatEnum.MD:
                source_type = SourceTypeEnum.MD
            # For other formats like DOCX, PPTX, keep as PDF since they get converted

        # Create ContentSource record
        content_source_to_create = ContentSourceCreate(
            chatbot_id=chatbot_uuid,
            source_type=source_type,
            file_name=original_file_name,
            storage_path=final_pdf_storage_path_for_pipeline,
            title=os.path.splitext(original_file_name)[0],  # Use filename without extension as title
            indexing_status=IndexingStatusEnum.PENDING,  # Set to pending since we're not indexing yet
            metadata={"original_file_size_bytes": original_file_size_bytes, "ingestion_source": IngestionSourceEnum.FILE_UPLOAD.value}
        )
        
        logger.info(f"[Task ID: {task_uuid}] Creating content source record. Title: '{content_source_to_create.title}', SourceType: {content_source_to_create.source_type.value}")
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description="Saving content source...", progress_percentage=85))

        created_reference = crud_create_reference(db=db, reference_in=content_source_to_create, reference_id=UUID(reference_id))

        if created_reference and hasattr(created_reference, 'id') and created_reference.id:
            created_reference_id = created_reference.id
            logger.info(f"[Task ID: {task_uuid}] Created content source ID: {created_reference_id}")
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(reference_id=created_reference_id))
        else:
            err_msg = "Failed to create content source in DB or ID missing from response."
            logger.error(f"[Task ID: {task_uuid}] {err_msg}")
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(status=TaskStatusEnum.FAILED, current_step_description="DB save failed (content source).", error_details=err_msg, progress_percentage=90))
            raise Exception(err_msg)

        final_result_payload = {"message": "Document processed successfully.", "reference_id": str(created_reference_id) if created_reference_id else None, "storage_path": final_pdf_storage_path_for_pipeline}
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.COMPLETED, current_step_description="Document processing complete.",
            progress_percentage=100, result_payload=final_result_payload)
        )
        logger.info(f"[Task ID: {task_uuid}] Document processing COMPLETED. File stored at: {final_pdf_storage_path_for_pipeline}")
        return final_result_payload

    except Exception as e:
        logger.error(f"[Task ID: {task_uuid}] CRITICAL ERROR in async_process_document_task (pre-pipeline or pipeline error): {e}", exc_info=True)
        if db:
            try:
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                    status=TaskStatusEnum.FAILED, current_step_description="Critical error during processing.",
                    error_details=str(e), progress_percentage=0))
            except Exception as db_error_on_fail:
                logger.error(f"[Task ID: {task_uuid}] FAILED TO UPDATE TASK TO FAILED state. DB Error: {db_error_on_fail}", exc_info=True)
        return {"status": "error", "task_id": str(task_uuid), "message": f"Outer task error: {str(e)}"} 
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                import shutil # Import here for cleanup
                shutil.rmtree(temp_dir)
                logger.info(f"[Task ID: {task_uuid}] Cleaned temp dir: {temp_dir}")
            except Exception as cleanup_exc:
                logger.error(f"[Task ID: {task_uuid}] Error cleaning temp dir {temp_dir}: {cleanup_exc}", exc_info=True)
        
        if db: pass # Supabase client does not require explicit close usually
        logger.info(f"[Task ID: {task_uuid}] async_process_document_task finished execution attempt.")
    

@celery_app.task(name="process_document_task")
def process_document_task(task_identifier: str, reference_id: str, file_path: str, user_id: str, chatbot_id: str):
    """
    Synchronous wrapper for the async document processing task.
    This allows Celery to call this synchronous task, which then properly runs the async logic.
    """
    return asyncio.run(async_process_document_task(
        task_identifier=task_identifier,
        reference_id=reference_id,
        file_path=file_path,
        user_id=user_id,
        chatbot_id=chatbot_id
    ))


@celery_app.task(name="simple_test_task")
def simple_test_task(value=None):
    logger.info(f"Simple test task executed with value: {value}")
    return f"Simple task received: {value}"