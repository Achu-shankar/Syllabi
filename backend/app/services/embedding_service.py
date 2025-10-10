import openai
from typing import List, Tuple
import logging
import time

from app.schemas.chunk import ChunkCreate
from app.core.config import settings # To get OPENAI_API_KEY

logger = logging.getLogger(__name__)

# Configure OpenAI client (should be done once, typically at app startup if not using a DI system for it)
# However, for a service module like this, accessing settings directly is common.
if settings.OPENAI_API_KEY:
    openai.api_key = settings.OPENAI_API_KEY
else:
    logger.warning("OPENAI_API_KEY not found in settings. Embedding service will not work.")

# Default embedding model - will now be taken from settings for the function default
# OPENAI_EMBEDDING_BATCH_SIZE will also be taken from settings
OPENAI_MAX_RETRIES = 3
OPENAI_RETRY_DELAY_SECONDS = 5 # Initial delay, can be exponential

def generate_embeddings_for_chunks(
    chunks_data: List[ChunkCreate],
    embedding_model: str = None # Allow override, default to settings
) -> List[Tuple[ChunkCreate, List[float]]]:
    """
    Generates embeddings for a list of ChunkCreate objects using the OpenAI API.

    Args:
        chunks_data: A list of ChunkCreate objects, each containing chunk_text.
        embedding_model: The name of the OpenAI embedding model to use. 
                         If None, uses settings.OPENAI_EMBEDDING_MODEL.

    Returns:
        A list of tuples, where each tuple is (ChunkCreate_object, embedding_vector).
        Returns an empty list if no API key is configured or if input is empty.
    """
    actual_embedding_model = embedding_model if embedding_model else settings.OPENAI_EMBEDDING_MODEL

    if not openai.api_key:
        logger.error("OpenAI API key is not configured. Cannot generate embeddings.")
        return []
    
    if not chunks_data:
        return []

    results: List[Tuple[ChunkCreate, List[float]]] = []
    texts_to_embed = [chunk.chunk_text for chunk in chunks_data]

    for i in range(0, len(texts_to_embed), settings.OPENAI_EMBEDDING_BATCH_SIZE):
        batch_texts = texts_to_embed[i:i + settings.OPENAI_EMBEDDING_BATCH_SIZE]
        original_chunks_in_batch = chunks_data[i:i + settings.OPENAI_EMBEDDING_BATCH_SIZE]
        
        logger.info(f"Requesting embeddings for batch of {len(batch_texts)} texts (model: {actual_embedding_model})...")
        
        for attempt in range(OPENAI_MAX_RETRIES):
            try:
                # Ensure client is initialized (if not done globally)
                # For openai >v1.0.0, client initialization is different
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.embeddings.create(
                    input=batch_texts,
                    model=actual_embedding_model
                )
                
                embeddings = [item.embedding for item in response.data]
                
                if len(embeddings) == len(original_chunks_in_batch):
                    for original_chunk, embedding_vector in zip(original_chunks_in_batch, embeddings):
                        results.append((original_chunk, embedding_vector))
                    logger.info(f"Successfully received {len(embeddings)} embeddings for the batch.")
                    break  # Success, exit retry loop for this batch
                else:
                    logger.error(
                        f"Mismatch in number of embeddings received ({len(embeddings)}) "
                        f"and texts sent ({len(original_chunks_in_batch)}) for batch starting at index {i}."
                    )
                    # Decide if this error warrants a retry or should fail the batch
                    if attempt == OPENAI_MAX_RETRIES - 1:
                        logger.error(f"Failed to get consistent embeddings for batch after {OPENAI_MAX_RETRIES} retries.")
                        # Optionally, you could append None or raise an exception for chunks in this failed batch
                    # else: continue to next retry
            
            except openai.APIConnectionError as e:
                logger.warning(f"OpenAI API connection error: {e}. Attempt {attempt + 1} of {OPENAI_MAX_RETRIES}.")
                if attempt < OPENAI_MAX_RETRIES - 1:
                    time.sleep(OPENAI_RETRY_DELAY_SECONDS * (attempt + 1)) # Exponential backoff
                else:
                    logger.error(f"Failed to connect to OpenAI API after {OPENAI_MAX_RETRIES} attempts.")
                    # Propagate error or handle: here we just log and this batch will be skipped from results
            except openai.RateLimitError as e:
                logger.warning(f"OpenAI API rate limit exceeded: {e}. Attempt {attempt + 1} of {OPENAI_MAX_RETRIES}.")
                if attempt < OPENAI_MAX_RETRIES - 1:
                    time.sleep(OPENAI_RETRY_DELAY_SECONDS * (attempt + 1) * 2) # Longer delay for rate limits
                else:
                    logger.error(f"OpenAI API rate limit still exceeded after {OPENAI_MAX_RETRIES} attempts.")
            except openai.APIStatusError as e: # Covers 5xx errors, etc.
                logger.error(f"OpenAI API status error: {e.status_code} - {e.response}. Attempt {attempt + 1} of {OPENAI_MAX_RETRIES}.")
                if attempt < OPENAI_MAX_RETRIES - 1:
                    time.sleep(OPENAI_RETRY_DELAY_SECONDS * (attempt + 1))
                else:
                    logger.error(f"OpenAI API status error persisted after {OPENAI_MAX_RETRIES} attempts.")    
            except Exception as e:
                logger.error(f"An unexpected error occurred while fetching embeddings: {e}. Attempt {attempt + 1} of {OPENAI_MAX_RETRIES}.", exc_info=True)
                if attempt < OPENAI_MAX_RETRIES - 1:
                    time.sleep(OPENAI_RETRY_DELAY_SECONDS)
                else:
                    logger.error(f"Unexpected error persisted after {OPENAI_MAX_RETRIES} attempts.")
            else: # No exception in try block for this attempt
                if len(embeddings) == len(original_chunks_in_batch):
                    break # Successful and embeddings match count
                # If mismatch but no exception, it was logged, try next attempt or fail if last attempt

    if len(results) != len(chunks_data):
        logger.warning(f"Could not generate embeddings for all chunks. Expected {len(chunks_data)}, got {len(results)}.")
        
    return results

# Example Usage (for testing this module directly)
# if __name__ == '__main__':
#     logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
#     
#     # Ensure OPENAI_API_KEY is set in your environment or .env file for this test
#     if not settings.OPENAI_API_KEY:
#         logger.error("OPENAI_API_KEY is not set. Please set it in your .env file and ensure Settings loads it.")
#     else:
#         logger.info("OpenAI API key found. Proceeding with test.")
#         sample_bbox_data = {
#             "x0": 0.0, "y0": 0.0, "x1": 0.0, "y1": 0.0, 
#             "page_width": 100.0, "page_height": 100.0
#         }
#         sample_element = ParsedTextElement(
#             text="test", x0=0,y0=0,x1=0,y1=0, 
#             page_number=1, page_width=100, page_height=100
#         )

#         test_chunks = [
#             ChunkCreate(
#                 reference_id=UUID("d290f1ee-6c54-4b01-90e6-d701748f0851"), 
#                 user_id="test_user", project_id=UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
#                 page_number=1, chunk_text="Hello world", token_count=2, 
#                 constituent_elements=[sample_element]
#             ),
#             ChunkCreate(
#                 reference_id=UUID("d290f1ee-6c54-4b01-90e6-d701748f0852"), 
#                 user_id="test_user", project_id=UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"),
#                 page_number=1, chunk_text="This is another chunk.", token_count=5, 
#                 constituent_elements=[sample_element]
#             ),
#             # Add more ChunkCreate objects as needed for testing batching
#         ]
#         logger.info(f"Testing embedding generation for {len(test_chunks)} chunks...")
#         chunk_embeddings = generate_embeddings_for_chunks(test_chunks)

#         if chunk_embeddings:
#             logger.info(f"Successfully generated {len(chunk_embeddings)} embeddings.")
#             for i, (chunk, embedding) in enumerate(chunk_embeddings):
#                 logger.info(f"Chunk {i+1} Text: '{chunk.chunk_text[:50]}...'")
#                 logger.info(f"  Embedding vector (first 5 dims): {embedding[:5]}...")
#                 logger.info(f"  Embedding vector length: {len(embedding)}")
#         else:
#             logger.warning("No embeddings were generated.") 