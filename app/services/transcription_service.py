import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional
from uuid import UUID
import openai
from openai import OpenAI
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

class TranscriptionService:
    """
    Service for transcribing audio content using OpenAI's GPT-4o transcription models.
    Supports automatic chunking for large files and intelligent prompting for better accuracy.
    """
    
    # Model configuration
    DEFAULT_MODEL = "whisper-1"  # Use reliable whisper-1 as default
    EXPERIMENTAL_MODEL = "gpt-4o-transcribe"  # Experimental high-quality model  
    FALLBACK_MODEL = "gpt-4o-mini-transcribe"  # Fallback for cost optimization
    LEGACY_MODEL = "whisper-1"  # Legacy model with timestamp support
    
    # File size limits (OpenAI limit is 25MB)
    MAX_FILE_SIZE_MB = 24  # Leave 1MB buffer
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
    
    # Chunking configuration for large files
    CHUNK_DURATION_MINUTES = 10  # 10-minute chunks for large files
    OVERLAP_SECONDS = 30  # 30-second overlap between chunks
    
    def __init__(self):
        """Initialize the transcription service with OpenAI client."""
        try:
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("TranscriptionService initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize TranscriptionService: {e}")
            raise RuntimeError(f"TranscriptionService initialization failed: {e}")
    
    def transcribe_audio(
        self, 
        task_uuid: UUID,
        audio_file_path: str,
        content_title: Optional[str] = None,
        use_timestamps: bool = True,  # Default to True for multimedia
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio file using OpenAI's transcription API.
        
        Args:
            task_uuid: Task identifier for logging
            audio_file_path: Path to the audio file
            content_title: Title/context for better transcription (used in prompt)
            use_timestamps: Whether to include detailed timestamps (requires whisper-1)
            language: Language code (optional, auto-detected if not provided)
            
        Returns:
            Dictionary containing transcript and metadata
            
        Raises:
            RuntimeError: If transcription fails
            FileNotFoundError: If audio file doesn't exist
        """
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        file_size = os.path.getsize(audio_file_path)
        logger.info(f"[Task ID: {task_uuid}] Starting transcription of {audio_file_path}")
        logger.info(f"[Task ID: {task_uuid}] File size: {file_size / (1024*1024):.2f} MB")
        
        try:
            # Check if file needs chunking
            if file_size > self.MAX_FILE_SIZE_BYTES:
                logger.info(f"[Task ID: {task_uuid}] File exceeds {self.MAX_FILE_SIZE_MB}MB, using chunked transcription")
                return self._transcribe_large_file(task_uuid, audio_file_path, content_title, use_timestamps, language)
            else:
                logger.info(f"[Task ID: {task_uuid}] File within size limit, using direct transcription")
                return self._transcribe_single_file(task_uuid, audio_file_path, content_title, use_timestamps, language)
                
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Transcription failed: {e}", exc_info=True)
            raise RuntimeError(f"Audio transcription failed: {str(e)}")
    
    def _transcribe_single_file(
        self,
        task_uuid: UUID,
        audio_file_path: str,
        content_title: Optional[str],
        use_timestamps: bool,
        language: Optional[str]
    ) -> Dict[str, Any]:
        """Transcribe a single audio file that fits within size limits."""
        
        # Choose model based on timestamp requirements
        # For multimedia, we always need timestamps for proper chunking
        model = self.LEGACY_MODEL  # Always use whisper-1 for multimedia
        response_format = "verbose_json"  # Always use verbose for timestamps
        
        # Generate context-aware prompt
        prompt = self._generate_prompt(content_title)
        
        logger.info(f"[Task ID: {task_uuid}] Using model: {model}, format: {response_format}")
        logger.info(f"[Task ID: {task_uuid}] Timestamps enabled for multimedia chunking")
        
        try:
            with open(audio_file_path, "rb") as audio_file:
                # Prepare transcription parameters
                transcription_params = {
                    "file": audio_file,
                    "model": model,
                    "response_format": response_format
                }
                
                # Add optional parameters
                if prompt:
                    transcription_params["prompt"] = prompt
                if language:
                    transcription_params["language"] = language
                
                # Always add timestamp granularities for multimedia
                transcription_params["timestamp_granularities"] = ["segment", "word"]
                
                # Make API call
                logger.info(f"[Task ID: {task_uuid}] Sending transcription request to OpenAI")
                logger.info(f"[Task ID: {task_uuid}] Request params: model={model}, format={response_format}, prompt={'set' if prompt else 'none'}")
                
                api_start_time = time.time()
                transcription = self.client.audio.transcriptions.create(**transcription_params)
                api_duration = time.time() - api_start_time
                
                logger.info(f"[Task ID: {task_uuid}] OpenAI API call completed in {api_duration:.2f} seconds")
                
                # Process response based on format
                if response_format == "verbose_json":
                    result = self._process_verbose_response(task_uuid, transcription)
                else:
                    result = self._process_simple_response(task_uuid, transcription, audio_file_path)
                
                logger.info(f"[Task ID: {task_uuid}] Transcription completed successfully")
                logger.info(f"[Task ID: {task_uuid}] Transcript length: {len(result.get('transcript', ''))} characters")
                
                return result
                
        except openai.APIError as e:
            logger.error(f"[Task ID: {task_uuid}] OpenAI API error: {e}")
            # Try fallback model if primary fails
            if model == self.DEFAULT_MODEL:
                logger.info(f"[Task ID: {task_uuid}] Retrying with fallback model: {self.FALLBACK_MODEL}")
                return self._transcribe_with_fallback(task_uuid, audio_file_path, content_title, language)
            raise RuntimeError(f"OpenAI API error: {e}")
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Unexpected transcription error: {e}")
            raise RuntimeError(f"Transcription error: {e}")
    
    def _transcribe_with_fallback(
        self,
        task_uuid: UUID,
        audio_file_path: str,
        content_title: Optional[str],
        language: Optional[str]
    ) -> Dict[str, Any]:
        """Retry transcription with fallback model."""
        try:
            with open(audio_file_path, "rb") as audio_file:
                prompt = self._generate_prompt(content_title)
                
                transcription_params = {
                    "file": audio_file,
                    "model": self.FALLBACK_MODEL,
                    "response_format": "json"
                }
                
                if prompt:
                    transcription_params["prompt"] = prompt
                if language:
                    transcription_params["language"] = language
                
                transcription = self.client.audio.transcriptions.create(**transcription_params)
                return self._process_simple_response(task_uuid, transcription, audio_file_path)
                
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Fallback transcription also failed: {e}")
            raise RuntimeError(f"Both primary and fallback transcription failed: {e}")
    
    def _transcribe_large_file(
        self,
        task_uuid: UUID,
        audio_file_path: str,
        content_title: Optional[str],
        use_timestamps: bool,
        language: Optional[str]
    ) -> Dict[str, Any]:
        """Transcribe large audio file by splitting into chunks."""
        logger.info(f"[Task ID: {task_uuid}] Starting chunked transcription for large file")
        
        temp_dir = None
        try:
            # Load audio file
            try:
                audio = AudioSegment.from_file(audio_file_path)
            except CouldntDecodeError as e:
                raise RuntimeError(f"Could not decode audio file: {e}")
            
            duration_seconds = len(audio) / 1000.0
            logger.info(f"[Task ID: {task_uuid}] Audio duration: {duration_seconds:.2f} seconds")
            
            # Create temporary directory for chunks
            temp_dir = tempfile.mkdtemp()
            
            # Split audio into chunks
            chunks = self._split_audio_into_chunks(task_uuid, audio, temp_dir)
            logger.info(f"[Task ID: {task_uuid}] Created {len(chunks)} audio chunks")
            
            # Transcribe each chunk
            all_segments = []
            full_transcript = ""
            current_offset = 0.0
            
            for i, chunk_path in enumerate(chunks):
                logger.info(f"[Task ID: {task_uuid}] Transcribing chunk {i+1}/{len(chunks)}")
                
                # Use previous transcript as context for better continuity
                context_prompt = self._generate_chunk_prompt(content_title, full_transcript[-500:] if full_transcript else None)
                
                chunk_result = self._transcribe_single_file(
                    task_uuid, chunk_path, None, use_timestamps, language
                )
                
                # Adjust timestamps and combine results
                if chunk_result.get("segments"):
                    for segment in chunk_result["segments"]:
                        segment["start"] += current_offset
                        segment["end"] += current_offset
                        all_segments.append(segment)
                
                full_transcript += " " + chunk_result.get("transcript", "")
                current_offset += (self.CHUNK_DURATION_MINUTES * 60) - self.OVERLAP_SECONDS
            
            # Combine results
            result = {
                "transcript": full_transcript.strip(),
                "duration_seconds": duration_seconds,
                "language": language or "auto-detected",
                "segments": all_segments,
                "chunk_count": len(chunks),
                "model_used": self.DEFAULT_MODEL
            }
            
            logger.info(f"[Task ID: {task_uuid}] Chunked transcription completed")
            logger.info(f"[Task ID: {task_uuid}] Total segments: {len(all_segments)}")
            
            return result
            
        finally:
            # Clean up temporary files
            if temp_dir and os.path.exists(temp_dir):
                try:
                    import shutil
                    shutil.rmtree(temp_dir)
                    logger.info(f"[Task ID: {task_uuid}] Cleaned up temporary chunk files")
                except Exception as cleanup_error:
                    logger.warning(f"[Task ID: {task_uuid}] Error cleaning up temp files: {cleanup_error}")
    
    def _split_audio_into_chunks(self, task_uuid: UUID, audio: AudioSegment, temp_dir: str) -> List[str]:
        """Split audio into overlapping chunks for transcription."""
        chunk_duration_ms = self.CHUNK_DURATION_MINUTES * 60 * 1000  # Convert to milliseconds
        overlap_ms = self.OVERLAP_SECONDS * 1000
        
        chunks = []
        start_ms = 0
        chunk_index = 0
        
        while start_ms < len(audio):
            end_ms = min(start_ms + chunk_duration_ms, len(audio))
            
            # Extract chunk
            chunk = audio[start_ms:end_ms]
            
            # Save chunk to temporary file
            chunk_filename = f"chunk_{chunk_index:03d}.wav"
            chunk_path = os.path.join(temp_dir, chunk_filename)
            
            # Export as WAV for best compatibility
            chunk.export(chunk_path, format="wav", parameters=["-ar", "16000", "-ac", "1"])
            chunks.append(chunk_path)
            
            logger.debug(f"[Task ID: {task_uuid}] Created chunk {chunk_index}: {start_ms/1000:.1f}s - {end_ms/1000:.1f}s")
            
            # Move to next chunk with overlap
            start_ms += chunk_duration_ms - overlap_ms
            chunk_index += 1
        
        return chunks
    
    def _generate_prompt(self, content_title: Optional[str]) -> Optional[str]:
        """Generate context-aware prompt for better transcription accuracy."""
        if not content_title:
            return None
        
        # Create a prompt that provides context about the content
        prompt = f"The following audio is from content titled '{content_title}'. "
        prompt += "Please transcribe accurately with proper punctuation and capitalization. "
        prompt += "Pay attention to technical terms, proper nouns, and domain-specific vocabulary."
        
        return prompt
    
    def _generate_chunk_prompt(self, content_title: Optional[str], previous_context: Optional[str]) -> Optional[str]:
        """Generate prompt for chunk transcription with previous context."""
        prompt_parts = []
        
        if content_title:
            prompt_parts.append(f"This audio chunk is from content titled '{content_title}'.")
        
        if previous_context:
            prompt_parts.append(f"Previous context: ...{previous_context}")
        
        if prompt_parts:
            prompt_parts.append("Please transcribe this chunk accurately, maintaining continuity with the previous context.")
            return " ".join(prompt_parts)
        
        return None
    
    def _process_verbose_response(self, task_uuid: UUID, transcription) -> Dict[str, Any]:
        """Process verbose JSON response from whisper-1 model."""
        result = {
            "transcript": transcription.text,
            "duration_seconds": getattr(transcription, 'duration', 0),
            "language": getattr(transcription, 'language', 'unknown'),
            "segments": [],
            "words": [],
            "model_used": self.LEGACY_MODEL
        }
        
        # Process segments
        if hasattr(transcription, 'segments'):
            for segment in transcription.segments:
                result["segments"].append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "confidence": getattr(segment, 'avg_logprob', 0.0)
                })
        
        # Process words if available
        if hasattr(transcription, 'words'):
            for word in transcription.words:
                result["words"].append({
                    "start": word.start,
                    "end": word.end,
                    "word": word.word,
                    "confidence": getattr(word, 'probability', 0.0)
                })
        
        return result
    
    def _process_simple_response(self, task_uuid: UUID, transcription, audio_file_path: str) -> Dict[str, Any]:
        """Process simple JSON response from GPT-4o models."""
        # Get audio duration using file metadata
        duration = self._get_audio_duration(audio_file_path)
        
        result = {
            "transcript": transcription.text,
            "duration_seconds": duration,
            "language": "auto-detected",  # GPT-4o models auto-detect language
            "segments": self._create_basic_segments(transcription.text, duration),
            "model_used": self.DEFAULT_MODEL
        }
        
        return result
    
    def _get_audio_duration(self, audio_file_path: str) -> float:
        """Get audio file duration in seconds."""
        try:
            audio = AudioSegment.from_file(audio_file_path)
            return len(audio) / 1000.0
        except Exception as e:
            logger.warning(f"Could not determine audio duration: {e}")
            return 0.0
    
    def _create_basic_segments(self, transcript: str, duration: float) -> List[Dict[str, Any]]:
        """Create basic segments for non-timestamp models."""
        if not transcript or duration <= 0:
            return []
        
        # Create a single segment for the entire transcript
        # In a more sophisticated implementation, we could use sentence boundaries
        return [{
            "start": 0.0,
            "end": duration,
            "text": transcript,
            "confidence": 0.95  # Placeholder confidence
        }]


# Global service instance
transcription_service = TranscriptionService() 