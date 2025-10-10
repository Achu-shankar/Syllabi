# backend/reference_manager_backend/app/services/citation_extraction_service.py
from uuid import UUID
from typing import Optional, Dict, Any
import logging
import json # For parsing potential JSON in errors or for structured logging

from openai import AsyncOpenAI, OpenAIError # Import OpenAIError for better exception handling
from app.schemas.llm_extraction import ExtractedMetadata
from app.core.config import settings
from app.schemas.reference import ItemTypeEnum

logger = logging.getLogger(__name__)

# Max characters to send to LLM in one go (approx ~25k-30k tokens for GPT-4o, well within 128k token limit)
# This can be adjusted based on testing and cost considerations.
LLM_MAX_TEXT_SNIPPET_CHARS = 100000 

class CitationExtractionService:
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            logger.error("OPENAI_API_KEY not found in settings. LLM calls will fail.")
            # You could raise an error here, or let it fail on first call, or have a dummy client
            self.client = None 
        else:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        self.llm_model_name = settings.OPENAI_MODEL_NAME or "gpt-4o" # Default to gpt-4o if not set

    async def extract_metadata_from_document_text(
        self,
        text_snippet: str,
        source_reference_id: UUID,
        task_id: Optional[UUID] = None,
    ) -> ExtractedMetadata:
        """
        Orchestrates the extraction of metadata from a given text snippet.
        """
        logger.info(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] Starting metadata extraction.")
        
        if not self.client:
            logger.error(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] OpenAI client not initialized. Cannot call LLM.")
            # Return empty with needs_more_context=False to prevent loops if client isn't there
            return ExtractedMetadata(needs_more_context=False) 

        llm_extracted_data = await self._call_llm_extractor(text_snippet, source_reference_id, task_id)

        if not llm_extracted_data:
            logger.warning(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] LLM extraction returned no data. Proceeding with empty metadata.")
            # Ensure needs_more_context is False if LLM fails, to avoid infinite loops on retries by the caller.
            return ExtractedMetadata(needs_more_context=False) 

        # Placeholder for future augmentation (Crossref, etc.)
        # final_metadata = llm_extracted_data.copy(deep=True)
        # if final_metadata.doi:
        #     crossref_api_data = await self._call_crossref_api(final_metadata.doi)
        #     if crossref_api_data:
        #         final_metadata = self._merge_metadata(
        #             base_metadata=final_metadata, 
        #             new_data_dict=crossref_api_data, 
        #             source_name="Crossref"
        #         )
        # ... similar for ISBN etc. ...

        logger.info(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] Completed metadata extraction attempt.")
        return llm_extracted_data

    async def _call_llm_extractor(
        self,
        text_snippet: str,
        source_reference_id: UUID,
        task_id: Optional[UUID] = None
    ) -> Optional[ExtractedMetadata]:
        """
        Internal method to interact with the LLM for metadata extraction using OpenAI API.
        Uses the client.beta.chat.completions.parse method for direct Pydantic model parsing.
        """
        if not self.client:
            logger.error(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] LLM Extractor: OpenAI client not available.")
            return None
        
        if not text_snippet.strip():
            logger.warning(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] LLM Extractor: Input text_snippet is empty. Skipping LLM call.")
            # Return a default ExtractedMetadata object indicating no more context is needed because there's no text.
            return ExtractedMetadata(needs_more_context=False)

        logger.info(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] Calling LLM ({self.llm_model_name}) with text snippet length: {len(text_snippet)} chars.")

        # Create a formatted string of ItemTypeEnum values for the prompt
        item_type_enum_values = ", ".join([f"'{e.value}'" for e in ItemTypeEnum]) # ItemTypeEnum needs to be available in this scope

        system_prompt = (
            "You are an expert academic librarian and metadata specialist. "
            "You will be given unstructured text, typically from the first few pages of a research paper, "
            "book chapter, report, or other academic/technical document. Your task is to meticulously extract key "
            "bibliographic information and structure it according to the provided Pydantic schema (`ExtractedMetadata`). "
            "Pay extremely close attention to the descriptions of each field in the schema. "
            "Prioritize accuracy and completeness for the requested fields based *only* on the provided text. "
            "Do not invent or infer information not explicitly found in the text snippet. "
            
            f"For the 'item_type' field, you MUST provide one of the following exact string values: [{item_type_enum_values}]. This field classifies the document type. "
            
            "Crucially, assess if the provided text snippet is sufficient to extract the *core* metadata. "
            "Core metadata includes: title, authors, publication_date, a valid 'item_type' (from the provided list), and, if applicable for the type, DOI or ISBN. "
            "If you believe more text from later in the document is *essential* to accurately determine these core fields, "
            "set the `needs_more_context` flag to True. Otherwise, if the snippet is sufficient for core details or if all discernible information has been extracted, set `needs_more_context` to False. "
            "Do not set `needs_more_context` to True solely for missing minor/optional fields if the core information is reasonably covered."
        )
        
        user_prompt_content = f"Please extract metadata from the following text document snippet:\n\n---\n{text_snippet[:LLM_MAX_TEXT_SNIPPET_CHARS]}"

        try:
            response = await self.client.beta.chat.completions.parse(
                model=self.llm_model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt_content},
                ],
                response_format=ExtractedMetadata, # Key part for direct Pydantic parsing
                temperature=0.1, # Low temperature for more deterministic extraction
                # max_tokens can be set if needed, but parse might handle this well
            )
            
            if response and response.choices and response.choices[0].message and response.choices[0].message.parsed:
                extracted_data = response.choices[0].message.parsed
                logger.info(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] LLM successfully extracted data. Title: '{extracted_data.title}'. Needs more context: {extracted_data.needs_more_context}")
                return extracted_data
            else:
                logger.error(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] LLM response was empty or malformed after parsing. Response object: {response}")
                return None
        
        except OpenAIError as e:
            # Handle various OpenAI specific errors (APIError, RateLimitError, AuthenticationError, etc.)
            error_message = f"OpenAI API error during LLM call: {type(e).__name__} - {str(e)}"
            # Attempt to get more details from the error response if available
            if hasattr(e, 'response') and e.response and hasattr(e.response, 'text'):
                try:
                    error_details = json.loads(e.response.text)
                    error_message += f" | Details: {error_details}"
                except json.JSONDecodeError:
                    error_message += f" | Raw Response Text (truncated): {e.response.text[:500]}"
            elif hasattr(e, 'message'): # Fallback for other OpenAIError attributes
                 error_message += f" | Message: {e.message}"

            logger.error(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] {error_message}", exc_info=False) # Set exc_info=False to avoid duplicate stack trace if details are in message
            return None # Indicates failure to the caller
        except Exception as e:
            logger.error(f"[Task ID: {task_id}, Ref ID: {source_reference_id}] An unexpected error occurred during LLM call: {e}", exc_info=True)
            return None

    # ... (placeholders for _call_crossref_api, _merge_metadata etc. can remain for now)
    # async def _call_crossref_api(self, doi: str) -> Optional[Dict[str, Any]]: ...
    # def _merge_metadata(...): ...

# Example of how it might be instantiated by FastAPI (though not strictly needed here for the edit)
# citation_service = CitationExtractionService() 