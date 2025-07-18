import logging
import asyncio
from uuid import UUID
from typing import Optional, Tuple, List

import fitz

from supabase import  Client
from app.crud.crud_task import update_task
from app.crud.crud_reference import create_reference as crud_create_reference
from app.schemas.task import TaskUpdate, TaskStatusEnum
from app.schemas.reference import ContentSourceCreate, SourceTypeEnum, IndexingStatusEnum, OriginalFileFormatEnum, IngestionSourceEnum
from app.schemas.llm_extraction import ExtractedMetadata
from app.services.citation_extraction_service import CitationExtractionService

# NOTE: This file contains LLM citation extraction functionality that is currently unused
# in the simplified document processing pipeline, but preserved for future use.

logger = logging.getLogger(__name__)

def extract_text_from_pdf_pages(
    input_pdf_path: str, 
    start_page_index: int, 
    num_pages_to_extract: int, 
    task_id_for_logging: str = ""
) -> Tuple[str, int]:
    """
    Extracts text from a specified range of pages in the input PDF.
    Args:
        input_pdf_path: Path to the PDF file.
        start_page_index: 0-based index of the first page to start extraction from.
        num_pages_to_extract: The number of pages to attempt to extract from the start_page_index.
        task_id_for_logging: Optional task ID for logging context.
    Returns:
        A tuple containing: (extracted_text: str, pages_actually_processed_count: int)
    """
    extracted_text = ""
    pages_actually_processed_count = 0
    try:
        doc = fitz.open(input_pdf_path)
        total_doc_pages = doc.page_count

        if total_doc_pages == 0:
            logger.warning(f"[Task ID: {task_id_for_logging}] PDF '{input_pdf_path}' has 0 pages.")
            doc.close()
            return "", 0

        if start_page_index >= total_doc_pages:
            logger.info(f"[Task ID: {task_id_for_logging}] Start page index ({start_page_index}) is beyond or at total pages ({total_doc_pages}). No new pages to process.")
            doc.close()
            return "", 0

        pages_remaining_in_doc = total_doc_pages - start_page_index 
        pages_to_process_this_call = min(num_pages_to_extract, pages_remaining_in_doc)

        if pages_to_process_this_call <= 0:
            logger.info(f"[Task ID: {task_id_for_logging}] Calculated 0 pages to process this call (start: {start_page_index}, req: {num_pages_to_extract}, avail: {pages_remaining_in_doc}).")
            doc.close()
            return "", 0
            
        for i in range(pages_to_process_this_call):
            page_to_load_index = start_page_index + i
            page = doc.load_page(page_to_load_index)
            extracted_text += page.get_text("text") + "\n\n"
            pages_actually_processed_count += 1
        
        doc.close()

        if pages_actually_processed_count > 0 and extracted_text.strip():
            logger.info(f"[Task ID: {task_id_for_logging}] Successfully extracted text from {pages_actually_processed_count} pages (starting PDF index {start_page_index}) of '{input_pdf_path}'. New text length: {len(extracted_text.strip())}")
        elif pages_actually_processed_count > 0 and not extracted_text.strip():
            logger.info(f"[Task ID: {task_id_for_logging}] Processed {pages_actually_processed_count} pages (starting PDF index {start_page_index}) but extracted no new text (e.g. image-based pages).")
        
        return extracted_text.strip(), pages_actually_processed_count
    
    except Exception as e:
        logger.error(f"[Task ID: {task_id_for_logging}] Error extracting text from '{input_pdf_path}' (start_idx: {start_page_index}, num_to_extract: {num_pages_to_extract}): {e}", exc_info=True)
        return "", 0

async def execute_shared_pdf_processing_pipeline(
    db: Client,
    task_uuid: UUID,
    reference_id: UUID,
    user_id: str,
    chatbot_id: UUID,
    local_pdf_path_for_analysis: str,
    final_pdf_storage_path: str,
    original_input_name: str,
    ingestion_source: IngestionSourceEnum,
    original_file_format_enum: Optional[OriginalFileFormatEnum],
    original_file_size_bytes: Optional[int],
    citation_service: CitationExtractionService,
    max_llm_calls: int,
    initial_pages_to_extract: int,
    additional_pages_per_retry: int
) -> dict:
    llm_call_count = 0
    llm_extracted_data: Optional[ExtractedMetadata] = None
    total_text_for_llm = ""
    current_processing_start_page_index = 0
    created_reference_id: Optional[UUID] = None

    try:
        logger.info(f"[Task ID: {task_uuid}] Starting shared PDF processing for: {local_pdf_path_for_analysis}, original: {original_input_name}")

        pdf_doc_total_pages = 0
        try:
            doc_for_count = fitz.open(local_pdf_path_for_analysis)
            pdf_doc_total_pages = doc_for_count.page_count
            doc_for_count.close()
            if pdf_doc_total_pages == 0:
                 logger.warning(f"[Task ID: {task_uuid}] PDF {local_pdf_path_for_analysis} has 0 pages. Cannot extract text for LLM.")
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Could not open PDF {local_pdf_path_for_analysis} to get page count: {e}. Aborting LLM analysis.", exc_info=True)
            pdf_doc_total_pages = 0

        while llm_call_count < max_llm_calls:
            llm_call_count += 1
            progress_base = 30
            current_progress = progress_base + int((llm_call_count / max_llm_calls) * 40)

            if pdf_doc_total_pages == 0 and current_processing_start_page_index == 0:
                logger.warning(f"[Task ID: {task_uuid}] PDF has 0 pages. Skipping LLM call attempts.")
                llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                break

            if current_processing_start_page_index >= pdf_doc_total_pages and pdf_doc_total_pages > 0 :
                logger.info(f"[Task ID: {task_uuid}] Attempt {llm_call_count}: No more pages to extract. Start index {current_processing_start_page_index} >= total pages {pdf_doc_total_pages}.")
                if llm_extracted_data: llm_extracted_data.needs_more_context = False
                else: llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                break

            pages_to_request_this_attempt = initial_pages_to_extract if llm_call_count == 1 else additional_pages_per_retry
            
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                current_step_description=f"Analyzing document (Attempt {llm_call_count}, Pages from index {current_processing_start_page_index} for {pages_to_request_this_attempt} pages)...", 
                progress_percentage=current_progress))

            newly_extracted_text_chunk = ""
            pages_processed_this_call = 0
            try:
                newly_extracted_text_chunk, pages_processed_this_call = extract_text_from_pdf_pages(
                    local_pdf_path_for_analysis,
                    start_page_index=current_processing_start_page_index,
                    num_pages_to_extract=pages_to_request_this_attempt,
                    task_id_for_logging=str(task_uuid)
                )

                if pages_processed_this_call > 0 and newly_extracted_text_chunk.strip():
                    logger.info(f"[Task ID: {task_uuid}] Attempt {llm_call_count}: Extracted text from {pages_processed_this_call} new pages (starting index {current_processing_start_page_index}).")
                    if total_text_for_llm: total_text_for_llm += "\n\n[--- Appended Text Snippet ---]\n\n" 
                    total_text_for_llm += newly_extracted_text_chunk
                    current_processing_start_page_index += pages_processed_this_call
                elif llm_call_count > 1:
                    logger.warning(f"[Task ID: {task_uuid}] Attempt {llm_call_count}: No new text extracted or pages processed (processed: {pages_processed_this_call}). Assuming end of useful text.")
                    if llm_extracted_data: llm_extracted_data.needs_more_context = False
                    else: llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                    break 
                elif llm_call_count == 1 and pages_processed_this_call == 0:
                     logger.warning(f"[Task ID: {task_uuid}] Attempt {llm_call_count}: No pages processed by extraction function. Aborting LLM calls.")
                     llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                     break
            except Exception as text_extraction_exc: 
                logger.error(f"[Task ID: {task_uuid}] Text extraction failed (Attempt {llm_call_count}): {text_extraction_exc}", exc_info=True)
                if not llm_extracted_data: llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                else: llm_extracted_data.needs_more_context = False
                break 
            
            current_attempt_metadata: Optional[ExtractedMetadata] = None
            try:
                if not total_text_for_llm.strip() and llm_call_count == 1:
                    logger.warning(f"[Task ID: {task_uuid}] Attempt {llm_call_count}: Total text for LLM is empty. Service will be called, should handle this.")
                elif not total_text_for_llm.strip() and llm_call_count > 1:
                     logger.warning(f"[Task ID: {task_uuid}] Attempt {llm_call_count}: Total text for LLM is still empty. Breaking loop.")
                     if not llm_extracted_data: llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                     else: llm_extracted_data.needs_more_context = False
                     break

                logger.info(f"[Task ID: {task_uuid}] Calling CitationExtractionService (Attempt {llm_call_count}). Total text length: {len(total_text_for_llm)}.")
                current_attempt_metadata = await citation_service.extract_metadata_from_document_text(
                    text_snippet=total_text_for_llm, 
                    source_reference_id=task_uuid, 
                    task_id=task_uuid
                )

                if current_attempt_metadata:
                    llm_extracted_data = current_attempt_metadata
                    logger.info(f"[Task ID: {task_uuid}] LLM Attempt {llm_call_count} successful. Title: '{llm_extracted_data.title}'. Needs more context: {llm_extracted_data.needs_more_context}")
                    if not llm_extracted_data.needs_more_context:
                        logger.info(f"[Task ID: {task_uuid}] LLM indicated no more context needed. Ending LLM calls.")
                        break 
                else: 
                    logger.error(f"[Task ID: {task_uuid}] CitationExtractionService returned None (Attempt {llm_call_count}). Critical failure.")
                    if not llm_extracted_data: llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                    else: llm_extracted_data.needs_more_context = False
                    break
            except Exception as service_call_exc:
                logger.error(f"[Task ID: {task_uuid}] Error during CitationExtractionService call (Attempt {llm_call_count}): {service_call_exc}", exc_info=True)
                if not llm_extracted_data: llm_extracted_data = ExtractedMetadata(needs_more_context=False)
                else: llm_extracted_data.needs_more_context = False
                break

            if llm_call_count >= max_llm_calls:
                logger.info(f"[Task ID: {task_uuid}] Reached max LLM calls ({max_llm_calls}).")
                if llm_extracted_data: llm_extracted_data.needs_more_context = False
                break 
            
            if llm_extracted_data and llm_extracted_data.needs_more_context:
                 logger.info(f"[Task ID: {task_uuid}] LLM needs more context. Next attempt will start from page index {current_processing_start_page_index}.")

        if llm_extracted_data is None:
            logger.warning(f"[Task ID: {task_uuid}] LLM processing loop completed. llm_extracted_data is None. Defaulting.")
            llm_extracted_data = ExtractedMetadata(needs_more_context=False)

        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            current_step_description="Metadata analysis phase complete.", progress_percentage=80))

        logger.info(f"[Task ID: {task_uuid}] Preparing to save extracted data to references table.")
        raw_metadata_for_db = llm_extracted_data.model_dump(mode='json')
        
        reference_title = llm_extracted_data.title if llm_extracted_data.title else "Untitled Reference"
        
        # Map original_file_format_enum to SourceTypeEnum
        source_type = SourceTypeEnum.PDF  # Default to PDF since we convert everything to PDF
        if original_file_format_enum:
            if original_file_format_enum == OriginalFileFormatEnum.PDF:
                source_type = SourceTypeEnum.PDF
            elif original_file_format_enum == OriginalFileFormatEnum.TXT:
                source_type = SourceTypeEnum.TXT
            elif original_file_format_enum == OriginalFileFormatEnum.MD:
                source_type = SourceTypeEnum.MD
            # For other formats like DOCX, PPTX, keep as PDF since they get converted
        
        content_source_to_create = ContentSourceCreate(
            chatbot_id=chatbot_id,
            source_type=source_type,
            file_name=original_input_name,
            storage_path=final_pdf_storage_path,
            title=reference_title,
            indexing_status=IndexingStatusEnum.COMPLETED,
            metadata=raw_metadata_for_db
        )
        
        logger.info(f"[Task ID: {task_uuid}] Attempting to create content source. Title: '{content_source_to_create.title}', SourceType: {content_source_to_create.source_type.value}")
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(current_step_description="Saving information...", progress_percentage=85))

        created_reference = crud_create_reference(db=db, reference_in=content_source_to_create, reference_id=reference_id)

        if created_reference and hasattr(created_reference, 'id') and created_reference.id:
            created_reference_id = created_reference.id
            logger.info(f"[Task ID: {task_uuid}] Created reference ID: {created_reference_id}")
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(reference_id=created_reference_id))
        else:
            err_msg = "Failed to create reference in DB or ID missing from response."
            logger.error(f"[Task ID: {task_uuid}] {err_msg}")
            update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(status=TaskStatusEnum.FAILED, current_step_description="DB save failed (reference).", error_details=err_msg, progress_percentage=90))
            raise Exception(err_msg)

        final_result_payload = {"message": "Document processed successfully.", "reference_id": str(created_reference_id) if created_reference_id else None}
        update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
            status=TaskStatusEnum.COMPLETED, current_step_description="Processing complete.",
            progress_percentage=100, result_payload=final_result_payload)
        )
        logger.info(f"[Task ID: {task_uuid}] Shared PDF processing COMPLETED.")
        return final_result_payload

    except Exception as e:
        logger.error(f"[Task ID: {task_uuid}] Error in shared PDF processing pipeline: {e}", exc_info=True)
        if not (isinstance(e, Exception) and "Failed to create reference" in str(e)):
             update_task(db=db, task_identifier=task_uuid, task_in=TaskUpdate(
                status=TaskStatusEnum.FAILED, current_step_description=f"Error in shared pipeline: {str(e)[:100]}",
                error_details=str(e), progress_percentage=90))
        raise 