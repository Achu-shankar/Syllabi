import logging
import math
from typing import List, Dict, Any, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

class MultimediaChunkingService:
    """
    Service for creating time-based chunks from multimedia transcripts.
    Handles timestamp preservation, speaker information, and intelligent chunking.
    """
    
    # Default chunking configuration
    DEFAULT_CHUNK_DURATION_SECONDS = 45  # 45-second chunks
    DEFAULT_OVERLAP_SECONDS = 5  # 5-second overlap
    MIN_CHUNK_DURATION_SECONDS = 10  # Minimum chunk size
    MAX_CHUNK_DURATION_SECONDS = 120  # Maximum chunk size
    
    def __init__(self):
        """Initialize the multimedia chunking service."""
        logger.info("MultimediaChunkingService initialized")
    
    def create_time_based_chunks(
        self,
        task_uuid: UUID,
        transcript_result: Dict[str, Any],
        reference_id: UUID,
        chatbot_id: UUID,
        chunk_duration: int = DEFAULT_CHUNK_DURATION_SECONDS,
        overlap_duration: int = DEFAULT_OVERLAP_SECONDS
    ) -> List[Dict[str, Any]]:
        """
        Create time-based chunks from transcript with intelligent boundaries.
        
        Args:
            task_uuid: Task identifier for logging
            transcript_result: Result from transcription service with segments and words
            reference_id: Reference ID for the content
            chatbot_id: Chatbot ID
            chunk_duration: Target chunk duration in seconds
            overlap_duration: Overlap between chunks in seconds
            
        Returns:
            List of chunk dictionaries with timing and metadata
        """
        logger.info(f"[Task ID: {task_uuid}] Creating time-based chunks")
        logger.info(f"[Task ID: {task_uuid}] Target duration: {chunk_duration}s, overlap: {overlap_duration}s")
        
        segments = transcript_result.get("segments", [])
        words = transcript_result.get("words", [])
        total_duration = transcript_result.get("duration_seconds", 0)
        full_transcript = transcript_result.get("transcript", "")
        
        if not segments:
            logger.warning(f"[Task ID: {task_uuid}] No segments found, creating single chunk")
            return self._create_fallback_chunk(
                task_uuid, full_transcript, total_duration, reference_id, chatbot_id
            )
        
        logger.info(f"[Task ID: {task_uuid}] Processing {len(segments)} segments, {len(words)} words")
        
        chunks = []
        current_start = 0.0
        chunk_id = 0
        
        while current_start < total_duration:
            chunk_end = min(current_start + chunk_duration, total_duration)
            
            # Find optimal chunk boundaries using segments
            chunk_data = self._create_chunk_from_timerange(
                task_uuid=task_uuid,
                start_time=current_start,
                end_time=chunk_end,
                segments=segments,
                words=words,
                chunk_id=chunk_id,
                reference_id=reference_id,
                chatbot_id=chatbot_id
            )
            
            if chunk_data and chunk_data.get("text", "").strip():
                chunks.append(chunk_data)
                chunk_id += 1
                
                # Log chunk details
                logger.debug(f"[Task ID: {task_uuid}] Created chunk {chunk_id}: "
                           f"{chunk_data['start_time']:.1f}s - {chunk_data['end_time']:.1f}s, "
                           f"{len(chunk_data['text'])} chars")
            
            # Move to next chunk with overlap
            current_start += (chunk_duration - overlap_duration)
        
        logger.info(f"[Task ID: {task_uuid}] Created {len(chunks)} time-based chunks")
        return chunks
    
    def _create_chunk_from_timerange(
        self,
        task_uuid: UUID,
        start_time: float,
        end_time: float,
        segments: List[Dict[str, Any]],
        words: List[Dict[str, Any]],
        chunk_id: int,
        reference_id: UUID,
        chatbot_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Create a chunk from a specific time range using segments and words."""
        
        # Find segments that overlap with this time window
        chunk_segments = []
        chunk_words = []
        chunk_text_parts = []
        
        for segment in segments:
            seg_start = segment.get("start", 0)
            seg_end = segment.get("end", 0)
            
            # Check if segment overlaps with chunk time range
            if seg_start < end_time and seg_end > start_time:
                chunk_segments.append(segment)
                chunk_text_parts.append(segment.get("text", "").strip())
        
        # Find words in this time range for more precise timing
        for word in words:
            word_start = word.get("start", 0)
            word_end = word.get("end", 0)
            
            if word_start >= start_time and word_end <= end_time:
                chunk_words.append(word)
        
        # Combine text from segments
        chunk_text = " ".join(chunk_text_parts).strip()
        
        if not chunk_text:
            return None
        
        # Calculate actual start/end times based on content
        actual_start = min([seg.get("start", start_time) for seg in chunk_segments]) if chunk_segments else start_time
        actual_end = max([seg.get("end", end_time) for seg in chunk_segments]) if chunk_segments else end_time
        
        # Ensure times are within bounds
        actual_start = max(actual_start, start_time)
        actual_end = min(actual_end, end_time)
        
        # Calculate confidence score
        confidence_score = self._calculate_chunk_confidence(chunk_segments, chunk_words)
        
        return {
            "chunk_id": chunk_id,
            "reference_id": str(reference_id),
            "chatbot_id": str(chatbot_id),
            "start_time": actual_start,
            "end_time": actual_end,
            "duration": actual_end - actual_start,
            "text": chunk_text,
            "word_count": len(chunk_text.split()),
            "character_count": len(chunk_text),
            "confidence_score": confidence_score,
            "segment_count": len(chunk_segments),
            "word_count_precise": len(chunk_words),
            "chunk_type": "transcript",
            "speaker": None,  # TODO: Add speaker diarization
            "language": "auto-detected",  # TODO: Extract from transcript result
            "segments": chunk_segments,  # Preserve original segments
            "words": chunk_words  # Preserve word-level timing
        }
    
    def _calculate_chunk_confidence(
        self, 
        segments: List[Dict[str, Any]], 
        words: List[Dict[str, Any]]
    ) -> float:
        """Calculate confidence score for a chunk based on segments and words."""
        if not segments and not words:
            return 0.5  # Default confidence
        
        # Use segment confidence if available
        if segments:
            segment_confidences = []
            for seg in segments:
                # Check if segment has explicit confidence score
                if "confidence" in seg:
                    confidence = seg["confidence"]
                    # Ensure confidence is between 0 and 1
                    confidence = max(0.0, min(1.0, confidence))
                    segment_confidences.append(confidence)
                elif "avg_logprob" in seg:
                    # Convert avg_logprob to confidence score
                    # avg_logprob is typically between -1 and 0 (but can be more negative)
                    # Convert to confidence: exp(avg_logprob) gives a value between 0 and 1
                    avg_logprob = seg["avg_logprob"]
                    # Clamp avg_logprob to reasonable range to avoid overflow/underflow
                    avg_logprob = max(-10.0, min(0.0, avg_logprob))
                    confidence = math.exp(avg_logprob)
                    segment_confidences.append(confidence)
                else:
                    # No confidence information available
                    segment_confidences.append(0.8)  # Default good confidence
            
            if segment_confidences:
                return sum(segment_confidences) / len(segment_confidences)
        
        # Use word confidence if available
        if words:
            word_confidences = []
            for word in words:
                if "confidence" in word:
                    confidence = word["confidence"]
                    confidence = max(0.0, min(1.0, confidence))
                    word_confidences.append(confidence)
                elif "probability" in word:
                    # probability is usually already between 0 and 1
                    probability = word["probability"]
                    probability = max(0.0, min(1.0, probability))
                    word_confidences.append(probability)
                else:
                    word_confidences.append(0.8)  # Default good confidence
            
            if word_confidences:
                return sum(word_confidences) / len(word_confidences)
        
        return 0.8  # Default good confidence
    
    def _create_fallback_chunk(
        self,
        task_uuid: UUID,
        full_transcript: str,
        total_duration: float,
        reference_id: UUID,
        chatbot_id: UUID
    ) -> List[Dict[str, Any]]:
        """Create a single fallback chunk when no segments are available."""
        logger.warning(f"[Task ID: {task_uuid}] Creating fallback chunk for entire transcript")
        
        if not full_transcript.strip():
            return []
        
        return [{
            "chunk_id": 0,
            "reference_id": str(reference_id),
            "chatbot_id": str(chatbot_id),
            "start_time": 0.0,
            "end_time": total_duration,
            "duration": total_duration,
            "text": full_transcript.strip(),
            "word_count": len(full_transcript.split()),
            "character_count": len(full_transcript),
            "confidence_score": 0.7,  # Lower confidence for fallback
            "segment_count": 0,
            "word_count_precise": 0,
            "chunk_type": "transcript",
            "speaker": None,
            "language": "auto-detected",
            "segments": [],
            "words": []
        }]
    
    def optimize_chunk_boundaries(
        self,
        task_uuid: UUID,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Optimize chunk boundaries to respect sentence boundaries and improve coherence.
        This is a future enhancement for better chunking.
        """
        logger.info(f"[Task ID: {task_uuid}] Optimizing chunk boundaries (placeholder)")
        # TODO: Implement sentence boundary detection
        # TODO: Implement speaker change detection
        # TODO: Implement topic boundary detection
        return chunks


# Global service instance
multimedia_chunking_service = MultimediaChunkingService() 