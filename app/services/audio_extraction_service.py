import logging
import os
import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from uuid import UUID
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

class AudioExtractionService:
    """
    Service for extracting audio from multimedia files for transcription.
    Handles video files by extracting audio tracks and optimizing for speech recognition.
    """
    
    def __init__(self):
        """Initialize the audio extraction service."""
        self.ffmpeg_path = self._find_ffmpeg()
        logger.info("AudioExtractionService initialized successfully")
    
    def extract_audio_for_transcription(
        self,
        task_uuid: UUID,
        input_file_path: str,
        source_type: str,
        temp_dir: str
    ) -> str:
        """
        Extract and optimize audio from multimedia file for transcription.
        
        Args:
            task_uuid: Task identifier for logging
            input_file_path: Path to the input multimedia file
            source_type: Type of source file (VIDEO, AUDIO, etc.)
            temp_dir: Temporary directory for output files
            
        Returns:
            Path to the extracted/optimized audio file
        """
        logger.info(f"[Task ID: {task_uuid}] Starting audio extraction for {source_type}")
        logger.info(f"[Task ID: {task_uuid}] Input file: {input_file_path}")
        
        extraction_start_time = time.time()
        
        try:
            if source_type.upper() == "AUDIO":
                # For audio files, optimize for transcription
                result = self._optimize_audio_for_transcription(task_uuid, input_file_path, temp_dir)
            else:
                # For video files, extract audio track
                result = self._extract_audio_from_video(task_uuid, input_file_path, temp_dir)
            
            extraction_duration = time.time() - extraction_start_time
            
            # Get output file size for logging
            output_size = os.path.getsize(result) if os.path.exists(result) else 0
            
            logger.info(f"[Task ID: {task_uuid}] Audio extraction completed in {extraction_duration:.2f} seconds")
            logger.info(f"[Task ID: {task_uuid}] Output file: {result}")
            logger.info(f"[Task ID: {task_uuid}] Output size: {output_size / (1024*1024):.2f} MB")
            
            return result
            
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Audio extraction failed: {e}", exc_info=True)
            raise RuntimeError(f"Audio extraction failed: {str(e)}")
    
    def _extract_audio_from_video(self, task_uuid: UUID, video_path: str, temp_dir: str) -> str:
        """Extract audio track from video file."""
        logger.info(f"[Task ID: {task_uuid}] Extracting audio from video file")
        
        output_filename = f"extracted_audio_{task_uuid}.wav"
        output_path = os.path.join(temp_dir, output_filename)
        
        # FFmpeg command to extract audio optimized for speech recognition
        cmd = [
            self.ffmpeg_path,
            "-i", video_path,
            "-vn",  # No video
            "-acodec", "pcm_s16le",  # 16-bit PCM
            "-ar", "16000",  # 16kHz sample rate (optimal for speech)
            "-ac", "1",  # Mono
            "-y",  # Overwrite output file
            output_path
        ]
        
        logger.info(f"[Task ID: {task_uuid}] FFmpeg command: {' '.join(cmd)}")
        
        try:
            ffmpeg_start_time = time.time()
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            ffmpeg_duration = time.time() - ffmpeg_start_time
            
            logger.info(f"[Task ID: {task_uuid}] FFmpeg extraction completed in {ffmpeg_duration:.2f} seconds")
            
            if result.returncode != 0:
                logger.error(f"[Task ID: {task_uuid}] FFmpeg error: {result.stderr}")
                raise RuntimeError(f"FFmpeg failed: {result.stderr}")
            
            if not os.path.exists(output_path):
                raise RuntimeError("Audio extraction completed but output file not found")
            
            logger.info(f"[Task ID: {task_uuid}] Audio successfully extracted to: {output_path}")
            return output_path
            
        except subprocess.TimeoutExpired:
            logger.error(f"[Task ID: {task_uuid}] FFmpeg extraction timed out")
            raise RuntimeError("Audio extraction timed out")
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Audio extraction error: {e}")
            raise RuntimeError(f"Audio extraction failed: {str(e)}")
    
    def _optimize_audio_for_transcription(self, task_uuid: UUID, audio_path: str, temp_dir: str) -> str:
        """Optimize existing audio file for transcription."""
        logger.info(f"[Task ID: {task_uuid}] Optimizing audio file for transcription")
        
        output_filename = f"optimized_audio_{task_uuid}.wav"
        output_path = os.path.join(temp_dir, output_filename)
        
        # FFmpeg command to optimize audio for speech recognition
        cmd = [
            self.ffmpeg_path,
            "-i", audio_path,
            "-acodec", "pcm_s16le",  # 16-bit PCM
            "-ar", "16000",  # 16kHz sample rate
            "-ac", "1",  # Mono
            "-af", "highpass=f=80,lowpass=f=8000",  # Filter for speech frequencies
            "-y",  # Overwrite output file
            output_path
        ]
        
        logger.info(f"[Task ID: {task_uuid}] FFmpeg optimization command: {' '.join(cmd)}")
        
        try:
            optimization_start_time = time.time()
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=180  # 3 minute timeout
            )
            optimization_duration = time.time() - optimization_start_time
            
            logger.info(f"[Task ID: {task_uuid}] FFmpeg optimization completed in {optimization_duration:.2f} seconds")
            
            if result.returncode != 0:
                logger.error(f"[Task ID: {task_uuid}] FFmpeg optimization error: {result.stderr}")
                # Fallback: just copy the original file
                logger.info(f"[Task ID: {task_uuid}] Falling back to original audio file")
                return self._copy_audio_file(task_uuid, audio_path, temp_dir)
            
            if not os.path.exists(output_path):
                logger.warning(f"[Task ID: {task_uuid}] Optimized file not found, using original")
                return self._copy_audio_file(task_uuid, audio_path, temp_dir)
            
            logger.info(f"[Task ID: {task_uuid}] Audio successfully optimized to: {output_path}")
            return output_path
            
        except subprocess.TimeoutExpired:
            logger.error(f"[Task ID: {task_uuid}] Audio optimization timed out")
            return self._copy_audio_file(task_uuid, audio_path, temp_dir)
        except Exception as e:
            logger.error(f"[Task ID: {task_uuid}] Audio optimization error: {e}")
            return self._copy_audio_file(task_uuid, audio_path, temp_dir)
    
    def _find_ffmpeg(self) -> str:
        """Find FFmpeg executable path."""
        import shutil
        
        # Try common FFmpeg paths
        possible_paths = ["ffmpeg", "ffmpeg.exe"]
        
        for path in possible_paths:
            if shutil.which(path):
                logger.info(f"Found FFmpeg at: {path}")
                return path
        
        # If not found in PATH, raise error
        raise RuntimeError(
            "FFmpeg not found. Please install FFmpeg:\n"
            "- Windows: Download from https://ffmpeg.org/download.html\n"
            "- macOS: brew install ffmpeg\n"
            "- Linux: sudo apt-get install ffmpeg"
        )
    
    def _copy_audio_file(self, task_uuid: UUID, audio_path: str, temp_dir: str) -> str:
        """Copy audio file to temp directory as fallback."""
        import shutil
        
        output_filename = f"copied_audio_{task_uuid}.wav"
        output_path = os.path.join(temp_dir, output_filename)
        
        logger.info(f"[Task ID: {task_uuid}] Copying audio file as fallback")
        shutil.copy2(audio_path, output_path)
        
        return output_path


# Global service instance
audio_extraction_service = AudioExtractionService() 