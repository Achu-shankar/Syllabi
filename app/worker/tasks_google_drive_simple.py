"""
Simplified Google Drive processing task that integrates with existing pipeline.
Downloads from Google Drive, converts to PDF, uploads to Supabase storage, creates content source.
"""
import logging
import tempfile
import os
import asyncio
import re
from typing import Optional
from uuid import UUID, uuid4

# PDF generation imports
from fpdf import FPDF
import markdown2
from weasyprint import HTML, CSS

from app.worker.celery_app import celery_app
from app.core.supabase_client import get_supabase_client
from app.services.google_drive_service import GoogleDriveService
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


async def _process_google_drive_document_async(
    task_id: str,
    integration_id: str,
    file_id: str,
    chatbot_id: str,
    reference_id: str,
    user_id: str
):
    """
    Async helper function to process a single Google Drive file:
    1. Download from Google Drive
    2. Convert to PDF if needed (Google Docs/Sheets/Slides)
    3. Upload to Supabase storage
    4. Create content source record
    """
    task_uuid = UUID(task_id)
    chatbot_uuid = UUID(chatbot_id)
    reference_uuid = UUID(reference_id)
    
    logger.info(f"[Task {task_uuid}] Starting Google Drive document processing for file {file_id}")
    
    try:
        # Update task status
        update_task_status_helper(
            task_uuid,
            status=TaskStatusEnum.PROCESSING,
            current_step_description="Initializing Google Drive processing",
            progress_percentage=10
        )
        
        # Initialize Google Drive service
        drive_service = GoogleDriveService(integration_id)
        
        # Get file metadata
        update_task_status_helper(
            task_uuid,
            current_step_description="Retrieving file metadata from Google Drive",
            progress_percentage=20
        )
        
        file_metadata = await drive_service.get_file_metadata(file_id)
        
        # Check if file can be processed
        if not await drive_service.can_process_file(file_metadata):
            raise ValueError(f"File type {file_metadata.get('mimeType')} is not supported for processing")
        
        # Download file from Google Drive
        update_task_status_helper(
            task_uuid,
            current_step_description="Downloading file from Google Drive",
            progress_percentage=30
        )
        
        content, filename = await drive_service.download_file(file_id, file_metadata)
        
        # Create temporary file
        temp_file_path = await drive_service.create_temp_file(content, filename)
        
        try:
            # Check if file needs conversion to PDF
            file_ext = os.path.splitext(filename)[1].lower()
            final_file_path = temp_file_path
            final_filename = filename
            final_content_type = file_metadata.get('mimeType', 'application/octet-stream')
            
            if file_ext in ['.txt', '.md']:
                update_task_status_helper(
                    task_uuid,
                    current_step_description=f"Converting {file_ext.upper()} to PDF",
                    progress_percentage=50
                )
                
                final_file_path, final_filename, final_content_type = await _convert_text_to_pdf(
                    temp_file_path, filename, file_ext, task_uuid
                )
            
            # Upload to Supabase storage
            update_task_status_helper(
                task_uuid,
                current_step_description="Uploading file to storage",
                progress_percentage=60
            )
            
            storage_path = await _upload_to_supabase_storage(
                final_file_path,
                final_filename,
                chatbot_uuid,
                final_content_type
            )
            
            # Determine source type and create metadata
            source_type = await drive_service.determine_source_type(file_metadata)
            metadata = await drive_service.create_content_metadata(file_metadata)
            
            # Create content source record
            update_task_status_helper(
                task_uuid,
                current_step_description="Creating content source record",
                progress_percentage=80
            )
            
            content_source = ContentSourceCreate(
                chatbot_id=chatbot_uuid,
                source_type=source_type,
                ingestion_source=IngestionSourceEnum.GOOGLE_DRIVE,
                file_name=final_filename,  # Use final filename (might be PDF after conversion)
                storage_path=storage_path,
                title=file_metadata.get('name', filename),  # Keep original name as title
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
                current_step_description="Google Drive file processed successfully",
                progress_percentage=100,
                result_payload={
                    "reference_id": str(reference_uuid),
                    "storage_path": storage_path,
                    "source_type": source_type.value,
                    "filename": final_filename,
                    "original_filename": filename  # Keep original for reference
                }
            )
            
            logger.info(f"[Task {task_uuid}] Successfully processed Google Drive file {file_id}")
            
            return {
                "success": True,
                "reference_id": str(reference_uuid),
                "storage_path": storage_path,
                "source_type": source_type.value
            }
            
        finally:
            # Clean up temporary file
            try:
                await drive_service.cleanup_temp_file(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")
                
    except Exception as e:
        logger.error(f"[Task {task_uuid}] Error processing Google Drive file {file_id}: {e}")
        
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
    content_type: str = 'application/octet-stream'
) -> str:
    """Upload file to Supabase storage and return storage path."""
    try:
        supabase = get_supabase_client()
        
        # Create storage path
        storage_path = f"{chatbot_id}/google_drive/{filename}"
        
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


async def _convert_text_to_pdf(temp_file_path: str, original_filename: str, file_ext: str, task_uuid: UUID) -> tuple[str, str, str]:
    """Convert text/markdown files to PDF, similar to document processing pipeline."""
    try:
        # Create PDF filename
        base_name_no_ext = os.path.splitext(original_filename)[0]
        pdf_filename = f"{base_name_no_ext}_{uuid4()}.pdf"
        temp_dir = os.path.dirname(temp_file_path)
        pdf_path = os.path.join(temp_dir, pdf_filename)
        
        if file_ext == '.txt':
            # Convert TXT to PDF using FPDF (same logic as document processing)
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                text_content = f.read()
            
            # Clean Unicode content for FPDF compatibility
            try:
                import unicodedata
                normalized_content = unicodedata.normalize('NFKD', text_content)
                
                # Remove problematic Unicode characters
                emoji_pattern = re.compile(
                    "["
                    u"\U0001F600-\U0001F64F"  # emoticons
                    u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                    u"\U0001F680-\U0001F6FF"  # transport & map symbols
                    u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
                    u"\U00002702-\U000027B0"  # dingbats
                    u"\U000024C2-\U0001F251"  # enclosed characters
                    u"\u2640-\u2642"  # gender symbols
                    u"\u2600-\u2B55"  # misc symbols
                    u"\u200d"  # zero width joiner
                    u"\u23cf"  # eject symbol
                    u"\u23e9"  # fast forward
                    u"\u231a"  # watch
                    u"\ufe0f"  # variation selector
                    u"\u3030"  # wavy dash
                    "]+", flags=re.UNICODE)
                
                cleaned_content = emoji_pattern.sub(' [emoji] ', normalized_content)
                final_content = ''.join(char for char in cleaned_content if ord(char) < 256)
                final_content = re.sub(r'\s+', ' ', final_content).strip()
                
                if len(final_content) != len(text_content):
                    final_content = "[Note: Some special characters and emojis were replaced for PDF compatibility]\n\n" + final_content
                    
            except Exception as clean_error:
                logger.warning(f"[Task {task_uuid}] Error cleaning Unicode content: {clean_error}. Using basic ASCII conversion.")
                final_content = "[Note: Special characters were removed for PDF compatibility]\n\n"
                final_content += text_content.encode('ascii', 'ignore').decode('ascii')
            
            # Generate PDF
            pdf = FPDF()
            pdf.add_page()
            
            try:
                pdf.set_font("Arial", "", 12)
            except RuntimeError:
                try:
                    pdf.set_font("Times", "", 12)
                except RuntimeError:
                    raise RuntimeError("Failed to set any font for PDF generation")
            
            pdf.multi_cell(0, 10, final_content)
            pdf.output(pdf_path, "F")
            
            logger.info(f"[Task {task_uuid}] Converted TXT to PDF: {pdf_filename}")
            
        elif file_ext == '.md':
            # Convert MD to PDF using markdown2 + weasyprint (same logic as document processing)
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            html_content = markdown2.markdown(md_content, extras=["tables", "fenced-code-blocks", "footnotes", "cuddled-lists", "code-friendly"])
            css = CSS(string="""
                @page { size: A4; margin: 1.5cm; } 
                body { font-family: sans-serif; line-height: 1.4; } 
                h1, h2, h3, h4, h5, h6 { margin-top: 1.2em; margin-bottom: 0.5em; line-height: 1.2; } 
                p { margin-bottom: 0.8em; } 
                a { color: #007bff; } 
                table { border-collapse: collapse; width: 100%; margin-bottom: 1em; } 
                th, td { border: 1px solid #ddd; padding: 8px; } 
                th { background-color: #f2f2f2; } 
                pre { background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 4px; }
            """)
            HTML(string=html_content).write_pdf(pdf_path, stylesheets=[css])
            
            logger.info(f"[Task {task_uuid}] Converted MD to PDF: {pdf_filename}")
        
        return pdf_path, pdf_filename, "application/pdf"
        
    except Exception as e:
        logger.error(f"[Task {task_uuid}] Error converting {file_ext} to PDF: {e}")
        raise


@celery_app.task(name="process_google_drive_document", bind=True)
def process_google_drive_document(
    self,
    task_id: str,
    integration_id: str,
    file_id: str,
    chatbot_id: str,
    reference_id: str,
    user_id: str
):
    """
    Celery task wrapper for processing Google Drive documents.
    Calls the async helper function using asyncio.run().
    """
    return asyncio.run(_process_google_drive_document_async(
        task_id, integration_id, file_id, chatbot_id, reference_id, user_id
    ))