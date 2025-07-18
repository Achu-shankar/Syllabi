# CHUNKING STRATEGY AND LIMITATIONS
#
# This chunking service splits parsed PDF text into chunks for embedding and retrieval.
#
# - Chunks are created from a flat list of ParsedTextElement objects, preserving page boundaries (chunks do NOT span pages).
# - Each chunk is built by accumulating elements until a max token limit is reached (max_tokens_per_chunk).
# - If token_overlap > 0, chunks overlap by up to that many tokens, but only when a valid chunk is created.
# - If a chunk is smaller than min_tokens_per_chunk (and it's not the last chunk on the page), it is skipped entirely and all its elements are omitted from the output. This sanitizes the chunk set but may result in some content loss, especially at the end of pages or in documents with many short elements.
# - If an element is too large to fit in a chunk, it is stored as a single chunk (with a warning).
# - If no elements can be chunked at a given position, the code advances by 1 to avoid infinite loops.
#
# TRADEOFFS:
# - This method produces clean, mostly uniform chunks, but may drop some content (especially short lines at the end of pages).
# - Chunks never span pages, so content at page breaks may be lost or split awkwardly.
# - High overlap values can still produce many redundant chunks if not tuned carefully.
# - For documents where context across pages is important, consider a future refactor to allow cross-page chunking.
#
# This approach is robust for most academic/scientific PDFs, but may need adjustment for other document types or for applications where no content loss is acceptable.

# WE MAY NEED TO SLIGHTLY MODIFY OUR SPLITTING METHODS BASED ON THE TYPE OF THE ORIGINAL DOCUMENT USED TO CREATE THE PDF.
# FOR EXAMPLE, FOR WEBPAGES, IT MIGHT INDEED BE BETTER TO ALLOW CHUNKS TO SPAN ACROSS "PAGES" (SCROLLS), 
# WHILE FOR PRESENTATIONS (E.G., PPT CONVERTED TO PDF), IT IS LIKELY BETTER TO ENSURE CHUNKS DO NOT SPAN ACROSS SLIDES/PAGES.
# THE CURRENT IMPLEMENTATION STRICTLY ENSURES CHUNKS DO NOT SPAN PDF PAGES.


import tiktoken
from typing import List, Optional, Tuple
import logging
from uuid import UUID

from app.schemas.chunk import ParsedPage, ParsedTextElement, ChunkCreate, BoundingBox # BoundingBox might not be directly used here but good for context

logger = logging.getLogger(__name__)

# Default model for token counting, can be made configurable
DEFAULT_TOKENIZER_MODEL = "cl100k_base"  # Used by text-embedding-ada-002

def count_tokens(text: str, model_name: str = DEFAULT_TOKENIZER_MODEL) -> int:
    """Counts tokens in a string using tiktoken for a specific model."""
    try:
        encoding = tiktoken.get_encoding(model_name)
    except Exception:
        logger.warning(f"Encoding '{model_name}' not found. Falling back to cl100k_base. Install tiktoken model if needed.")
        encoding = tiktoken.get_encoding("cl100k_base") # Fallback
    return len(encoding.encode(text))

def chunk_parsed_pages(
    parsed_pages: List[ParsedPage],
    reference_id: UUID,
    user_id: UUID,
    chatbot_id: UUID,
    min_tokens_per_chunk: int = 30,
    max_tokens_per_chunk: int = 400, # Reduced for more granular chunks, can be tuned
    token_overlap: int = 50 # Number of tokens to overlap between chunks
) -> List[ChunkCreate]:
    """
    Chunks text from parsed pages into manageable pieces based on token limits,
    ensuring chunks do not span pages and include their constituent elements.

    Args:
        parsed_pages: List of ParsedPage objects from the parsing service.
        reference_id: UUID of the parent reference.
        user_id: UUID of the user.
        chatbot_id: UUID of the chatbot.
        max_tokens_per_chunk: The maximum number of tokens allowed per chunk.
        token_overlap: The number of tokens to overlap between consecutive chunks.
                       Note: Overlap logic here is token-based on the string, not element based.

    Returns:
        A list of ChunkCreate objects ready for embedding and database insertion.
    """
    all_chunks: List[ChunkCreate] = []
    # token_overlap = 0
    
    # Flatten all elements from all pages into a single list, keeping page context
    # Each element in ParsedTextElement already has its page_number, page_width, page_height
    all_elements: List[ParsedTextElement] = []
    for page in parsed_pages:
        all_elements.extend(page.elements)

    if not all_elements:
        logger.warning(f"No text elements found to chunk for Reference ID: {reference_id}")
        return []

    current_chunk_elements: List[ParsedTextElement] = []
    current_chunk_text_parts: List[str] = [] # To build current_chunk_text efficiently
    current_token_count = 0
    start_index = 0

    while start_index < len(all_elements):
        logger.debug(f"[Chunking] Loop start: start_index={start_index}, total_elements={len(all_elements)}")
        prev_start_index = start_index

        # Reset for the new chunk
        current_chunk_elements = []
        current_chunk_text_parts = []
        current_token_count = 0
        chunk_page_number = -1 
        chunk_page_width = -1.0
        chunk_page_height = -1.0
        temp_chunk_text_for_overlap_calculation = ""
        elements_for_current_chunk_iteration: List[ParsedTextElement] = []

        for i in range(start_index, len(all_elements)):
            element = all_elements[i]

            if not current_chunk_elements: # First element of a potential new chunk
                chunk_page_number = element.page_number
                chunk_page_width = element.page_width
                chunk_page_height = element.page_height
            elif element.page_number != chunk_page_number: # Page break detected
                break # Finalize current chunk, new chunk will start on new page

            potential_new_text_parts = current_chunk_text_parts + [element.text]
            potential_full_text = " ".join(potential_new_text_parts) # Join with space, adjust if elements are lines
            potential_token_count = count_tokens(potential_full_text)

            if potential_token_count <= max_tokens_per_chunk:
                current_chunk_text_parts.append(element.text)
                current_chunk_elements.append(element)
                current_token_count = potential_token_count
                elements_for_current_chunk_iteration.append(element)
            else:
                # Current element would make chunk too large, so current_chunk_elements is complete
                # (unless it's empty, meaning the single element itself is too large)
                if not current_chunk_elements: # Single element is too large
                    logger.warning(
                        f"Element '{element.text[:50]}...' on page {element.page_number} exceeds max_tokens_per_chunk of {max_tokens_per_chunk}. "
                        f"Storing it as a single chunk. Consider increasing max_tokens or pre-processing large elements."
                    )
                    current_chunk_text_parts.append(element.text)
                    current_chunk_elements.append(element)
                    current_token_count = count_tokens(element.text) # Recount for just this one
                    elements_for_current_chunk_iteration.append(element)
                    # This large element forms its own chunk, then we advance past it
                break # Finalize chunk with elements up to this point (exclusive of current element if it caused overflow)
        
        if current_chunk_elements: # If any elements were added to this chunk
            final_chunk_text = " ".join(current_chunk_text_parts)
            final_token_count = count_tokens(final_chunk_text)
            if final_token_count > max_tokens_per_chunk and len(current_chunk_elements) > 1:
                logger.warning(f"Chunk for page {chunk_page_number} slightly exceeded token limit ({final_token_count}/{max_tokens_per_chunk}) after joining. Consider review.")

            logger.debug(f"[Chunking] Created chunk: page={chunk_page_number}, elements_in_chunk={len(current_chunk_elements)}, start_index={start_index}")

            # --- MINIMUM TOKEN CHECK ---
            if final_token_count < min_tokens_per_chunk and start_index + len(current_chunk_elements) < len(all_elements):
                logger.debug(f"[Chunking] Skipping chunk with {final_token_count} tokens (below minimum) at start_index={start_index}")
                # Skip this chunk and all its elements
                start_index = prev_start_index + len(current_chunk_elements)
                continue  # Skip appending this chunk

            # Only append if it passes the minimum token check
            chunk = ChunkCreate(
                reference_id=reference_id,
                user_id=user_id,
                chatbot_id=chatbot_id,
                page_number=chunk_page_number,
                chunk_text=final_chunk_text,
                token_count=final_token_count,
                constituent_elements=current_chunk_elements,
                parser_metadata=None
            )
            all_chunks.append(chunk)

            # --- OVERLAP LOGIC ---
            if token_overlap > 0 and len(current_chunk_elements) > 1:
                overlap_token_count = 0
                overlap_elements = 0
                for elem in reversed(current_chunk_elements):
                    overlap_token_count += count_tokens(elem.text)
                    if overlap_token_count > token_overlap:
                        break
                    overlap_elements += 1
                overlap_elements = max(1, overlap_elements)
                start_index = prev_start_index + len(current_chunk_elements) - overlap_elements
            else:
                start_index = prev_start_index + len(current_chunk_elements)

            logger.debug(f"[Chunking] Advancing start_index: prev={prev_start_index}, new={start_index}")
            if start_index <= prev_start_index:
                logger.warning(f"[Chunking] start_index did not advance (prev={prev_start_index}, new={start_index}). Forcing increment to prevent infinite loop.")
                start_index = prev_start_index + 1
        elif start_index < len(all_elements):  # No elements added, but not at the end
            problematic_element = all_elements[start_index]
            logger.warning(
                f"[Chunking] No elements added to chunk at start_index={start_index}. "
                f"Skipping element: '{problematic_element.text[:50]}...' (page {problematic_element.page_number}) "
                f"and advancing by 1 to prevent infinite loop."
            )
            start_index += 1  # Always advance by 1 if nothing could be chunked
        else:  # No elements added and at the end
            break

    logger.info(f"Generated {len(all_chunks)} chunks for Reference ID: {reference_id} with max_tokens={max_tokens_per_chunk}, overlap={token_overlap}.")
    return all_chunks

# Example Usage (for testing this module directly)
# if __name__ == '__main__':
#     logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
#     # Create dummy ParsedPage and ParsedTextElement data for testing
#     sample_user_id = "test_user_123"
#     sample_project_id = UUID("00000000-0000-0000-0000-000000000000")
#     sample_reference_id = UUID("11111111-1111-1111-1111-111111111111")

#     elements_page1 = [
#         ParsedTextElement(text="Hello", x0=10, y0=10, x1=20, y1=20, page_number=1, page_width=100, page_height=200),
#         ParsedTextElement(text="world.", x0=22, y0=10, x1=35, y1=20, page_number=1, page_width=100, page_height=200),
#         ParsedTextElement(text="This", x0=10, y0=22, x1=20, y1=32, page_number=1, page_width=100, page_height=200),
#         ParsedTextElement(text="is", x0=22, y0=22, x1=28, y1=32, page_number=1, page_width=100, page_height=200),
#         ParsedTextElement(text="page", x0=30, y0=22, x1=40, y1=32, page_number=1, page_width=100, page_height=200),
#         ParsedTextElement(text="one.", x0=42, y0=22, x1=52, y1=32, page_number=1, page_width=100, page_height=200),
#     ]
#     page1 = ParsedPage(page_number=1, width=100, height=200, elements=elements_page1)

#     elements_page2 = [
#         ParsedTextElement(text="The", x0=10, y0=10, x1=20, y1=20, page_number=2, page_width=100, page_height=200),
#         ParsedTextElement(text="quick", x0=22, y0=10, x1=35, y1=20, page_number=2, page_width=100, page_height=200),
#         ParsedTextElement(text="brown", x0=10, y0=22, x1=25, y1=32, page_number=2, page_width=100, page_height=200),
#         ParsedTextElement(text="fox.", x0=27, y0=22, x1=38, y1=32, page_number=2, page_width=100, page_height=200),
#     ]
#     page2 = ParsedPage(page_number=2, width=100, height=200, elements=elements_page2)
    
#     # Test with a very long single element
#     long_text = "Thisisaverylongsinglewordwithoutanyspacesinitto" * 20 # Approx 1000 chars, > 200 tokens usually
#     elements_page3 = [
#         ParsedTextElement(text=long_text, x0=10,y0=10,x1=90,y1=20, page_number=3, page_width=100, page_height=200)
#     ]
#     page3 = ParsedPage(page_number=3, width=100, height=200, elements=elements_page3)

#     parsed_document_pages = [page1, page2, page3]

#     logger.info("Testing chunking service...")
#     created_chunks = chunk_parsed_pages(
#         parsed_pages=parsed_document_pages, 
#         reference_id=sample_reference_id,
#         user_id=sample_user_id,
#         project_id=sample_project_id,
#         max_tokens_per_chunk=10, # Small for testing
#         token_overlap=3 # Small overlap for testing
#     )

#     for i, chunk_obj in enumerate(created_chunks):
#         logger.info(f"--- Chunk {i+1} (Page: {chunk_obj.page_number}) ---")
#         logger.info(f"Text: '{chunk_obj.chunk_text}'")
#         logger.info(f"Tokens: {chunk_obj.token_count}")
#         logger.info(f"Constituent Elements ({len(chunk_obj.constituent_elements)}):")
#         for elem in chunk_obj.constituent_elements:
#             logger.info(f"  - '{elem.text}' (p{elem.page_number} w{elem.page_width} h{elem.page_height} x0{elem.x0} y0{elem.y0} x1{elem.x1} y1{elem.y1})")
#     logger.info(f"Total chunks created: {len(created_chunks)}") 