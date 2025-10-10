from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, Dict, Any
from enum import Enum

class MediaTypeEnum(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"


class MultimediaProcessRequest(BaseModel):
    user_id: str = Field(..., description="User ID who owns the content")
    file_path: str = Field(..., description="Path to the multimedia file in Supabase bucket")
    chatbot_id: UUID = Field(..., description="Chatbot ID this content belongs to")
    reference_id: UUID = Field(..., description="Reference ID for the content source")
    media_type: MediaTypeEnum = Field(..., description="Type of multimedia content")
    original_filename: Optional[str] = Field(None, description="Original filename of the uploaded file")
    
    class Config:
        json_encoders = {
            UUID: str
        }
        schema_extra = {
            "example": {
                "user_id": "user-uuid-string",
                "file_path": "chatbot-id/video-file.mp4",
                "chatbot_id": "chatbot-uuid",
                "reference_id": "reference-uuid",
                "media_type": "video",
                "original_filename": "lecture_01.mp4"
            }
        }

class MultimediaMetadata(BaseModel):
    """Metadata structure for multimedia content"""
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None
    video_resolution: Optional[str] = None  # e.g., "1920x1080"
    audio_codec: Optional[str] = None
    video_codec: Optional[str] = None
    frame_rate: Optional[float] = None
    audio_sample_rate: Optional[int] = None
    bitrate: Optional[int] = None
    format: Optional[str] = None  # e.g., "mp4", "avi", "mp3"
    
    class Config:
        schema_extra = {
            "example": {
                "duration_seconds": 1800.5,
                "file_size_bytes": 50000000,
                "video_resolution": "1920x1080",
                "audio_codec": "aac",
                "video_codec": "h264",
                "frame_rate": 30.0,
                "audio_sample_rate": 44100,
                "bitrate": 2000000,
                "format": "mp4"
            }
        } 


class MultimediaIndexingRequest(BaseModel):
    user_id: UUID = Field(..., description="User ID who owns the content")
    reference_id: UUID = Field(..., description="Reference ID for the content source")
    chatbot_id: UUID = Field(..., description="Chatbot ID this content belongs to")

