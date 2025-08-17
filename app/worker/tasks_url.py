import logging
import os
import tempfile
import asyncio
from uuid import UUID, uuid4
from typing import Optional, Protocol, runtime_checkable, Any
import shutil
import functools

from app.core.supabase_client import get_supabase_client
from app.schemas.reference import (
    OriginalFileFormatEnum, 
    IngestionSourceEnum,
    ContentSourceCreate,
    SourceTypeEnum,
    IndexingStatusEnum
)
from app.schemas.task import TaskUpdate, TaskStatusEnum
from app.crud.crud_task import update_task
from app.crud.crud_reference import create_reference as crud_create_reference
from app.worker.celery_app import celery_app

import httpx
from weasyprint import HTML, CSS
import pdfkit
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError


logger = logging.getLogger(__name__)


# --- PDF Converter Strategy Definition ---
@runtime_checkable
class PdfConverterStrategy(Protocol):
    async def convert(self, url_to_process: str, output_pdf_path: str, task_uuid: UUID) -> Optional[int]:
        """
        Converts the content from a URL to a PDF file.
        Returns the size of the original HTML content in bytes if available, otherwise None.
        Raises an exception if conversion fails.
        """
        ...

class WeasyPrintStrategy(PdfConverterStrategy):
    async def convert(self, url_to_process: str, output_pdf_path: str, task_uuid: UUID) -> Optional[int]:
        log_prefix = f"[Task ID: {task_uuid}] [WeasyPrintStrategy] "
        logger.info(f"{log_prefix}Fetching HTML from URL: {url_to_process}")
        html_content: str = ""
        original_size: Optional[int] = None

        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url_to_process)
                response.raise_for_status()
                html_content = await response.text
                original_size = len(html_content.encode("utf-8"))
            logger.info(f"{log_prefix}HTML fetched successfully. Size: {original_size} bytes.")
        except httpx.RequestError as e:
            logger.error(f"{log_prefix}Failed to fetch HTML from {url_to_process}: {e}", exc_info=True)
            raise  # Re-raise to be handled by the main task

        logger.info(f"{log_prefix}Starting HTML to PDF conversion for: {output_pdf_path}")
        css_string='''
        @page { size: A4; margin: 1.5cm; }
        body { font-family: Arial, sans-serif; font-size: 12px; }
        img, svg { max-width: 100%; height: auto; }
        '''
        try:
            HTML(string=html_content).write_pdf(target=output_pdf_path, stylesheets=[CSS(string=css_string)])
            logger.info(f"{log_prefix}Conversion successful for: {output_pdf_path}")
            return original_size
        except Exception as e:
            logger.error(f"{log_prefix}Conversion failed for {output_pdf_path}: {e}", exc_info=True)
            raise

class PdfKitStrategy(PdfConverterStrategy):
    def __init__(self, wkhtmltopdf_path: Optional[str] = None):
        self.wkhtmltopdf_path = wkhtmltopdf_path
        self.wkhtmltopdf_path = r'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe'

    async def convert(self, url_to_process: str, output_pdf_path: str, task_uuid: UUID) -> Optional[int]:
        log_prefix = f"[Task ID: {task_uuid}] [PdfKitStrategy] "
        logger.info(f"{log_prefix}Starting URL to PDF conversion with pdfkit for: {url_to_process}")

        options = {
            'page-size': 'A4', 'margin-top': '0.75in', 'margin-right': '0.75in',
            'margin-bottom': '0.75in', 'margin-left': '0.75in', 'encoding': "UTF-8",
            'custom-header' : [('Accept-Encoding', 'gzip')], 'no-outline': None,
            'enable-local-file-access': None, 'disable-smart-shrinking': None,
            'load-error-handling': 'ignore', 'load-media-error-handling': 'ignore',
        }
        
        current_config = None
        if self.wkhtmltopdf_path:
            try:
                current_config = pdfkit.configuration(wkhtmltopdf=self.wkhtmltopdf_path)
                logger.info(f"{log_prefix}Using wkhtmltopdf configuration: {self.wkhtmltopdf_path}")
            except Exception as e: 
                logger.error(f"{log_prefix}Failed to set pdfkit configuration with path {self.wkhtmltopdf_path}: {e}", exc_info=True)
                current_config = None

        loop = asyncio.get_event_loop()
        
        # Create a callable that includes the keyword arguments for pdfkit.from_url
        # functools.partial is great for this
        pdfkit_call_with_args = functools.partial(
            pdfkit.from_url, 
            url_to_process, 
            output_pdf_path, 
            options=options, 
            configuration=current_config
        )

        try:
            # Now call run_in_executor with only the callable
            await loop.run_in_executor(
                None, # Default ThreadPoolExecutor
                pdfkit_call_with_args
            )
            logger.info(f"{log_prefix}pdfkit conversion successful for: {output_pdf_path}")
            return None 
        except OSError as e:
            logger.error(f"{log_prefix}pdfkit OS error (is wkhtmltopdf installed and correctly configured?): {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"{log_prefix}pdfkit conversion failed for {output_pdf_path}: {e}", exc_info=True)
            raise


# --- New PDF Converter Strategy (Playwright Implementation) ---
class PlaywrightStrategy(PdfConverterStrategy):
    async def convert(self, url_to_process: str, output_pdf_path: str, task_uuid: UUID) -> Optional[int]:
        log_prefix = f"[Task ID: {task_uuid}] [PlaywrightStrategy] "
        logger.info(f"{log_prefix}Starting URL to PDF conversion with Playwright for: {url_to_process}")

        playwright_instance = await async_playwright().start()
        browser = None 
        try:
            browser = await playwright_instance.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=( 
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/99.0.4844.82 Safari/537.36"
                )
            )
            page = await context.new_page()
            
            logger.info(f"{log_prefix}Navigating to {url_to_process}")
            await page.goto(url_to_process, timeout=90000, wait_until="load") 
            logger.info(f"{log_prefix}Page.goto completed with 'load' state. Waiting for potential JS execution...")
            await page.wait_for_timeout(5000)

            logger.info(f"{log_prefix}Generating PDF for {url_to_process} at {output_pdf_path}")
            await page.pdf(
                path=output_pdf_path,
                format='A4',
                print_background=True, 
                margin={
                    'top': '20mm',
                    'bottom': '20mm',
                    'left': '15mm',
                    'right': '15mm'
                }
            )
            logger.info(f"{log_prefix}Playwright conversion successful for: {output_pdf_path}")
            return None 
        except PlaywrightTimeoutError as e:
            logger.error(f"{log_prefix}Playwright navigation or operation timeout for {url_to_process}: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"{log_prefix}Playwright conversion failed for {url_to_process}: {e}", exc_info=True)
            raise
        finally:
            if browser:
                await browser.close()
                logger.info(f"{log_prefix}Playwright browser closed.")
            await playwright_instance.stop()
            logger.info(f"{log_prefix}Playwright instance stopped.")


# Renamed original async task
async def _async_process_url_task_actual(task_identifier: str, reference_id: str, url_to_process: str, user_id: str, chatbot_id: str):
    """
    Celery task to process a URL and create a content source record. (Simplified implementation)
    Handles direct PDF URLs and HTML URLs (converting HTML to PDF).
    """
    task_uuid = UUID(task_identifier)
    chatbot_uuid = UUID(chatbot_id)
    logger.info(f"[Task ID: {task_uuid}] Starting URL processing for: {url_to_process}, chatbot: {chatbot_uuid}")
    db = None
    temp_dir = tempfile.mkdtemp()
    
    # Path for the PDF that will be sent to storage
    local_pdf_path_for_pipeline: Optional[str] = None
    # Storage path in Supabase for the PDF
    final_pdf_storage_path_for_pipeline: Optional[str] = None
    # Original file size (either of direct PDF or source HTML)
    original_file_size_bytes: Optional[int] = None
    # Enum for the original format detected/processed
    current_original_file_format: OriginalFileFormatEnum = OriginalFileFormatEnum.HTML # Default to HTML

    # --- Select PDF conversion strategy ---
    # Change this line to select the desired strategy
    # converter: PdfConverterStrategy = WeasyPrintStrategy()
    # converter: PdfConverterStrategy = PdfKitStrategy() 
    converter: PdfConverterStrategy = PlaywrightStrategy()
    logger.info(f"[Task ID: {task_uuid}] Using PDF conversion strategy: {converter.__class__.__name__}")

    try:
        db = get_supabase_client()
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.PROCESSING,
            current_step_description="URL processing initiated.",
            progress_percentage=5
        ))
        
        logger.info(f"[Task ID: {task_uuid}] Checking URL content type: {url_to_process}")
        
        try: 
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Use a HEAD request first if we only need headers, but GET is fine if we might use content
                response = await client.get(url_to_process) 
            response.raise_for_status()

            content_type = response.headers.get('Content-Type', '').lower()
            logger.info(f"[Task ID: {task_uuid}] URL fetched. Content-Type: {content_type}")
            sanitized_url_part = "".join(c if c.isalnum() else "_" for c in url_to_process[:70])

            if content_type.startswith('application/pdf'):
                logger.info(f"[Task ID: {task_uuid}] Detected direct PDF URL.")
                current_original_file_format = OriginalFileFormatEnum.PDF
                # For direct PDF, the 'response' from GET contains the PDF bytes
                pdf_content_bytes = response.content
                original_file_size_bytes = len(pdf_content_bytes)
                
                pdf_filename = f"{sanitized_url_part}_{uuid4()}.pdf"
                local_pdf_path_for_pipeline = os.path.join(temp_dir, pdf_filename)

                with open(local_pdf_path_for_pipeline, "wb") as f:
                    f.write(pdf_content_bytes)
                logger.info(f"[Task ID: {task_uuid}] Direct PDF saved locally to {local_pdf_path_for_pipeline}")
                
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                    current_step_description="Direct PDF downloaded from URL.",
                    progress_percentage=15
                ))

                # Upload this direct PDF to Supabase
                try:
                    logger.info(f"[Task ID: {task_uuid}] Uploading direct PDF '{pdf_filename}' to Supabase...")
                    storage_path = f"{str(chatbot_uuid)}/url_sourced/{pdf_filename}" # Added 'url_sourced' subfolder
                    with open(local_pdf_path_for_pipeline, "rb") as f_pdf:
                        db.storage.from_("documents").upload(
                            path=storage_path,
                            file=f_pdf,
                            file_options={"content-type": "application/pdf", "upsert": "false"}
                        )
                    final_pdf_storage_path_for_pipeline = storage_path
                    logger.info(f"[Task ID: {task_uuid}] Direct PDF uploaded to Supabase: {final_pdf_storage_path_for_pipeline}")
                    update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                        current_step_description="Direct PDF uploaded to storage.",
                        progress_percentage=25
                    ))
                except Exception as upload_exc:
                    logger.error(f"[Task ID: {task_uuid}] Supabase direct PDF upload error: {upload_exc}", exc_info=True)
                    update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                        status=TaskStatusEnum.FAILED,
                        current_step_description=f"Supabase PDF upload error: {str(upload_exc)[:100]}",
                        error_details=str(upload_exc),
                        progress_percentage=15 # Rollback progress slightly
                    ))
                    raise # Re-raise to be caught by the main exception block

            else: # Assume HTML or needs conversion to PDF
                logger.info(f"[Task ID: {task_uuid}] URL content is not application/pdf, proceeding with conversion using {converter.__class__.__name__}.")
                current_original_file_format = OriginalFileFormatEnum.HTML
                # Note: response.text or response.content is NOT passed to the converter.
                # The converter will handle fetching from the URL itself.
                
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                    current_step_description=f"Preparing to convert URL via {converter.__class__.__name__}.",
                progress_percentage=10
            ))

                converted_pdf_filename = f"{sanitized_url_part}_converted_{uuid4()}.pdf"
                local_pdf_path_for_pipeline = os.path.join(temp_dir, converted_pdf_filename)
                
                try:
                    # Call the selected converter strategy
                    size_from_converter = await converter.convert(
                        url_to_process, 
                        local_pdf_path_for_pipeline, 
                        task_uuid
                    )
                    original_file_size_bytes = size_from_converter # May be None (e.g. from PdfKitStrategy)
                                    
                    logger.info(f"[Task ID: {task_uuid}] URL to PDF conversion process completed.")
                    if original_file_size_bytes is None:
                        logger.warning(f"[Task ID: {task_uuid}] Original HTML size not determined by {converter.__class__.__name__}.")

                    update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                        current_step_description="URL to PDF conversion complete.",
                        progress_percentage=20 # Adjusted progress after conversion
                    ))
                except Exception as conversion_exc:
                    logger.error(f"[Task ID: {task_uuid}] URL to PDF conversion failed using {converter.__class__.__name__}: {conversion_exc}", exc_info=True)
                    update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                        status=TaskStatusEnum.FAILED,
                                    current_step_description=f"URL to PDF conversion error: {str(conversion_exc)[:100]}",
                                    error_details=str(conversion_exc),
                                    progress_percentage=10 
                    ))
                    raise

                # Upload this converted PDF to Supabase
                try:
                    logger.info(f"[Task ID: {task_uuid}] Uploading converted PDF '{converted_pdf_filename}' to Supabase...")
                    storage_path_for_converted_pdf = f"{str(chatbot_uuid)}/url_sourced/{converted_pdf_filename}" # Added 'url_sourced'
                    with open(local_pdf_path_for_pipeline, "rb") as f_pdf:
                        db.storage.from_("documents").upload(
                            path=storage_path_for_converted_pdf,
                                                file=f_pdf,
                            file_options={"content-type": "application/pdf", "upsert": "false"}
                        )
                    final_pdf_storage_path_for_pipeline = storage_path_for_converted_pdf
                    logger.info(f"[Task ID: {task_uuid}] Converted PDF uploaded to Supabase: {final_pdf_storage_path_for_pipeline}")
                    update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                        current_step_description="Converted PDF uploaded to storage.",
                        progress_percentage=25
                    ))
                except Exception as upload_exc:
                                logger.error(f"[Task ID: {task_uuid}] Supabase converted PDF upload error: {upload_exc}", exc_info=True)
                                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                        status=TaskStatusEnum.FAILED,
                                    current_step_description=f"Supabase PDF upload error: {str(upload_exc)[:100]}",
                        error_details=str(upload_exc),
                                    progress_percentage=20 # Rollback progress
                                ))
                                raise # Re-raise

        except httpx.RequestError as e: # Catch errors from httpx.get or response.raise_for_status()
            logger.error(f"[Task ID: {task_uuid}] Initial URL request error: {e}", exc_info=True)
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                status=TaskStatusEnum.FAILED,
                current_step_description=f"URL request error: {str(e)[:100]}",
                error_details=str(e),
                progress_percentage=5 # Initial progress
            ))
            raise # Re-raise to be caught by the main exception block


        # Validation before creating content source
        if not final_pdf_storage_path_for_pipeline or not local_pdf_path_for_pipeline or not os.path.exists(local_pdf_path_for_pipeline):
            err_msg = "PDF for processing is invalid after URL processing stages."
            logger.error(f"[Task ID: {task_uuid}] {err_msg} Local path: {local_pdf_path_for_pipeline}, Storage path: {final_pdf_storage_path_for_pipeline}")
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.FAILED,
                current_step_description=err_msg,
                error_details=f"Local PDF for processing: {local_pdf_path_for_pipeline}, Exists: {os.path.exists(local_pdf_path_for_pipeline if local_pdf_path_for_pipeline else '')}",
                progress_percentage=25
            ))
            raise ValueError(err_msg) # This will be caught by the main try-except
        
        logger.info(f"[Task ID: {task_uuid}] PDF ready. Creating content source record...")
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Creating content source record...",
            progress_percentage=80
        ))

        # Map original_file_format_enum to SourceTypeEnum
        source_type = SourceTypeEnum.PDF  # Default to PDF since we convert everything to PDF
        if current_original_file_format:
            if current_original_file_format == OriginalFileFormatEnum.PDF:
                source_type = SourceTypeEnum.PDF
            elif current_original_file_format == OriginalFileFormatEnum.HTML:
                source_type = SourceTypeEnum.URL
            # For other formats, keep as PDF since they get converted

        # Create ContentSource record
        content_source_to_create = ContentSourceCreate(
            chatbot_id=chatbot_uuid,
            source_type=source_type,
            ingestion_source=IngestionSourceEnum.URL_SUBMISSION,
            file_name=os.path.basename(final_pdf_storage_path_for_pipeline),
            storage_path=final_pdf_storage_path_for_pipeline,
            title=url_to_process,  # Use URL as title
            indexing_status=IndexingStatusEnum.PENDING,  # Set to pending since we're not indexing yet
            metadata={
                "original_file_size_bytes": original_file_size_bytes, 
                "original_url": url_to_process,
                "original_format": current_original_file_format.value if current_original_file_format else None
            }
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

        final_result_payload = {"message": "URL processed successfully.", "reference_id": str(created_reference_id) if created_reference_id else None, "storage_path": final_pdf_storage_path_for_pipeline, "original_url": url_to_process}
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.COMPLETED, current_step_description="URL processing complete.",
            progress_percentage=100, result_payload=final_result_payload)
        )
        logger.info(f"[Task ID: {task_uuid}] URL processing COMPLETED. PDF stored at: {final_pdf_storage_path_for_pipeline}")
        return final_result_payload

    except Exception as e: # Main try-except block
        logger.error(f"[Task ID: {task_uuid}] CRITICAL ERROR in _async_process_url_task_actual: {e}", exc_info=True)
        if db:
            try:
                update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.FAILED,
                    current_step_description=f"Critical error: {str(e)[:100]}",
            error_details=str(e),
            progress_percentage=0
        ))
            except Exception as db_update_err:
                logger.error(f"[Task ID: {task_uuid}] Failed to update task status to FAILED after critical error: {db_update_err}", exc_info=True)
        return {"status": "error", "task_id": str(task_uuid), "message": str(e)}

    finally:
        if (temp_dir and os.path.exists(temp_dir)):
            try:
                shutil.rmtree(temp_dir)
                logger.info(f"[Task ID: {task_uuid}] Cleaned up temporary directory: {temp_dir}")
            except Exception as cleanup_exc:
                logger.error(f"[Task ID: {task_uuid}] Error cleaning up temporary directory {temp_dir}: {cleanup_exc}", exc_info=True)
        logger.info(f"[Task ID: {task_uuid}] _async_process_url_task_actual finished execution attempt.")


@celery_app.task(name="async_process_url_task")
def process_url_task_sync_wrapper(task_identifier: str, reference_id: str, url_to_process: str, user_id: str, chatbot_id: str):
    """
    Synchronous wrapper for the async URL processing task.
    This allows Celery on Windows with -P solo to run the async code.
    """
    logger.info(f"process_url_task_sync_wrapper: Received task {task_identifier} for URL {url_to_process} with user_id {user_id} and chatbot_id {chatbot_id}")
    try:
        # Simpler way for Python 3.7+
        result = asyncio.run(_async_process_url_task_actual(task_identifier, reference_id, url_to_process, user_id, chatbot_id))
        logger.info(f"process_url_task_sync_wrapper: Task {task_identifier} completed with result: {result}")
        return result
    except Exception as e:
        logger.error(f"process_url_task_sync_wrapper: Critical error running task {task_identifier}: {e}", exc_info=True)
        # Ensure the task in the DB is marked as FAILED if an error bubbles up here
        # Note: _async_process_url_task_actual already has robust error handling and DB updates.
        # This top-level catch is for unforeseen issues in asyncio.run or the task itself not catching something.
        # We might want to update the DB here as a last resort if not already handled.
        # For now, re-raising to let Celery handle it based on its configuration.
        raise # Re-raise the exception to be caught by Celery



