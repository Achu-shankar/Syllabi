import logging
from typing import List, Dict, Any, Tuple
from uuid import UUID
import time
import openai
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

class MultimediaEmbeddingService:
    """
    Service for generating embeddings for multimedia content chunks.
    Handles time-based chunks with timestamp and speaker information.
    """
    
    # Embedding configuration
    DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"  # Cost-effective for multimedia
    BATCH_SIZE = 100  # Process chunks in batches
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 2
    
    def __init__(self):
        """Initialize the multimedia embedding service."""
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not found. Embedding service will not work.")
            self.client = None
        else:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("MultimediaEmbeddingService initialized successfully")
    
    def generate_embeddings_for_multimedia_chunks(
        self,
        task_uuid: UUID,
        chunks: List[Dict[str, Any]],
        embedding_model: str = None
    ) -> List[Dict[str, Any]]:
        """
        Generate embeddings for multimedia chunks with their metadata.
        
        Args:
            task_uuid: Task identifier for logging
            chunks: List of chunk dictionaries from multimedia chunking service
            embedding_model: OpenAI embedding model to use
            
        Returns:
            List of chunk dictionaries with embeddings added
        """
        if not self.client:
            logger.error(f"[Task ID: {task_uuid}] OpenAI client not initialized")
            return []
        
        if not chunks:
            logger.warning(f"[Task ID: {task_uuid}] No chunks provided for embedding")
            return []
        
        model = embedding_model or self.DEFAULT_EMBEDDING_MODEL
        logger.info(f"[Task ID: {task_uuid}] Generating embeddings for {len(chunks)} chunks using {model}")
        
        chunks_with_embeddings = []
        
        # Process chunks in batches
        for i in range(0, len(chunks), self.BATCH_SIZE):
            batch_chunks = chunks[i:i + self.BATCH_SIZE]
            batch_start = i + 1
            batch_end = min(i + self.BATCH_SIZE, len(chunks))
            
            logger.info(f"[Task ID: {task_uuid}] Processing batch {batch_start}-{batch_end} of {len(chunks)}")
            
            # Extract texts for embedding
            batch_texts = []
            for chunk in batch_chunks:
                # Create enhanced text for embedding that includes context
                enhanced_text = self._create_enhanced_text_for_embedding(chunk)
                batch_texts.append(enhanced_text)
            
            # Generate embeddings for this batch
            batch_embeddings = self._generate_batch_embeddings(
                task_uuid, batch_texts, model
            )
            
            if batch_embeddings and len(batch_embeddings) == len(batch_chunks):
                # Add embeddings to chunks
                for chunk, embedding in zip(batch_chunks, batch_embeddings):
                    chunk_with_embedding = chunk.copy()
                    chunk_with_embedding["embedding"] = embedding
                    chunk_with_embedding["embedding_model"] = model
                    chunk_with_embedding["embedding_dimensions"] = len(embedding)
                    chunks_with_embeddings.append(chunk_with_embedding)
                
                logger.info(f"[Task ID: {task_uuid}] Successfully embedded batch {batch_start}-{batch_end}")
            else:
                logger.error(f"[Task ID: {task_uuid}] Failed to embed batch {batch_start}-{batch_end}")
                # Add chunks without embeddings (for debugging)
                for chunk in batch_chunks:
                    chunk_with_embedding = chunk.copy()
                    chunk_with_embedding["embedding"] = None
                    chunk_with_embedding["embedding_error"] = "Failed to generate embedding"
                    chunks_with_embeddings.append(chunk_with_embedding)
        
        successful_embeddings = sum(1 for chunk in chunks_with_embeddings if chunk.get("embedding") is not None)
        logger.info(f"[Task ID: {task_uuid}] Embedding complete: {successful_embeddings}/{len(chunks)} successful")
        
        return chunks_with_embeddings
    
    def _create_enhanced_text_for_embedding(self, chunk: Dict[str, Any]) -> str:
        """
        Create enhanced text for embedding that includes temporal and contextual information.
        This helps the embedding capture the multimedia nature of the content.
        """
        text = chunk.get("text", "").strip()
        
        if not text:
            return ""
        
        # Add temporal context
        start_time = chunk.get("start_time", 0)
        end_time = chunk.get("end_time", 0)
        duration = chunk.get("duration", 0)
        
        # Format time for context (e.g., "At 1:23 in the video:")
        start_minutes = int(start_time // 60)
        start_seconds = int(start_time % 60)
        time_context = f"At {start_minutes}:{start_seconds:02d}"
        
        # Add speaker context if available
        speaker = chunk.get("speaker")
        speaker_context = f" (Speaker: {speaker})" if speaker else ""
        
        # Add content type context
        chunk_type = chunk.get("chunk_type", "multimedia_transcript")
        type_context = "Video transcript" if "video" in chunk_type.lower() else "Audio transcript"
        
        # Combine contexts with the actual text
        enhanced_text = f"{type_context} - {time_context}{speaker_context}: {text}"
        
        return enhanced_text
    
    def _generate_batch_embeddings(
        self,
        task_uuid: UUID,
        texts: List[str],
        model: str
    ) -> List[List[float]]:
        """Generate embeddings for a batch of texts with retry logic."""
        
        for attempt in range(self.MAX_RETRIES):
            try:
                logger.debug(f"[Task ID: {task_uuid}] Embedding attempt {attempt + 1} for {len(texts)} texts")
                
                start_time = time.time()
                response = self.client.embeddings.create(
                    input=texts,
                    model=model
                )
                api_duration = time.time() - start_time
                
                embeddings = [item.embedding for item in response.data]
                
                logger.debug(f"[Task ID: {task_uuid}] Embedding API call completed in {api_duration:.2f}s")
                
                if len(embeddings) == len(texts):
                    return embeddings
                else:
                    logger.warning(f"[Task ID: {task_uuid}] Embedding count mismatch: "
                                 f"expected {len(texts)}, got {len(embeddings)}")
                    
            except openai.APIConnectionError as e:
                logger.warning(f"[Task ID: {task_uuid}] OpenAI connection error (attempt {attempt + 1}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY_SECONDS * (attempt + 1))
                    
            except openai.RateLimitError as e:
                logger.warning(f"[Task ID: {task_uuid}] Rate limit error (attempt {attempt + 1}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY_SECONDS * (attempt + 1) * 2)
                    
            except openai.APIStatusError as e:
                logger.error(f"[Task ID: {task_uuid}] OpenAI API error (attempt {attempt + 1}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY_SECONDS * (attempt + 1))
                    
            except Exception as e:
                logger.error(f"[Task ID: {task_uuid}] Unexpected embedding error (attempt {attempt + 1}): {e}")
                if attempt < self.MAX_RETRIES - 1:
                    time.sleep(self.RETRY_DELAY_SECONDS)
        
        logger.error(f"[Task ID: {task_uuid}] Failed to generate embeddings after {self.MAX_RETRIES} attempts")
        return []
    
    def get_embedding_stats(self, chunks_with_embeddings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get statistics about the generated embeddings."""
        total_chunks = len(chunks_with_embeddings)
        successful_embeddings = sum(1 for chunk in chunks_with_embeddings if chunk.get("embedding") is not None)
        failed_embeddings = total_chunks - successful_embeddings
        
        # Get embedding dimensions (should be consistent)
        embedding_dims = None
        for chunk in chunks_with_embeddings:
            if chunk.get("embedding"):
                embedding_dims = len(chunk["embedding"])
                break
        
        # Calculate total text length
        total_chars = sum(len(chunk.get("text", "")) for chunk in chunks_with_embeddings)
        total_words = sum(chunk.get("word_count", 0) for chunk in chunks_with_embeddings)
        
        # Calculate time coverage
        total_duration = 0
        if chunks_with_embeddings:
            start_times = [chunk.get("start_time", 0) for chunk in chunks_with_embeddings]
            end_times = [chunk.get("end_time", 0) for chunk in chunks_with_embeddings]
            total_duration = max(end_times) - min(start_times) if start_times and end_times else 0
        
        return {
            "total_chunks": total_chunks,
            "successful_embeddings": successful_embeddings,
            "failed_embeddings": failed_embeddings,
            "success_rate": successful_embeddings / total_chunks if total_chunks > 0 else 0,
            "embedding_dimensions": embedding_dims,
            "total_characters": total_chars,
            "total_words": total_words,
            "total_duration_seconds": total_duration,
            "average_chunk_duration": total_duration / total_chunks if total_chunks > 0 else 0
        }


# Global service instance
multimedia_embedding_service = MultimediaEmbeddingService() 