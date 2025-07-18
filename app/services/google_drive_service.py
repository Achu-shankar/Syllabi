"""
Google Drive content service for handling file discovery, processing, and export.
"""
import logging
import tempfile
import os
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
import aiofiles
import aiofiles.os
import json

from app.core.supabase_client import get_supabase_client
from app.core.config import settings
from app.schemas.reference import IngestionSourceEnum, SourceTypeEnum

logger = logging.getLogger(__name__)


class GoogleDriveService:
    """Service for interacting with Google Drive API for content processing."""
    
    # Google Drive MIME types mapping
    GOOGLE_MIME_TYPES = {
        'application/vnd.google-apps.document': 'application/pdf',  # Google Docs -> PDF
        'application/vnd.google-apps.spreadsheet': 'application/pdf',  # Google Sheets -> PDF
        'application/vnd.google-apps.presentation': 'application/pdf',  # Google Slides -> PDF
        'application/vnd.google-apps.drawing': 'application/pdf',  # Google Drawings -> PDF
    }
    
    # File types that can be processed directly without conversion
    DIRECT_PROCESSING_TYPES = {
        'application/pdf': SourceTypeEnum.PDF,
        'text/plain': SourceTypeEnum.TXT,
        'text/markdown': SourceTypeEnum.MD,
        'video/mp4': SourceTypeEnum.VIDEO,
        'video/avi': SourceTypeEnum.VIDEO,
        'video/mov': SourceTypeEnum.VIDEO,
        'video/wmv': SourceTypeEnum.VIDEO,
        'audio/mp3': SourceTypeEnum.AUDIO,
        'audio/wav': SourceTypeEnum.AUDIO,
        'audio/m4a': SourceTypeEnum.AUDIO,
        'audio/ogg': SourceTypeEnum.AUDIO,
    }
    
    def __init__(self, integration_id: str):
        """Initialize Google Drive service with integration credentials."""
        self.integration_id = integration_id
        self.drive_client = None
        
    async def _get_drive_client(self):
        """Get authenticated Google Drive client."""
        if self.drive_client is None:
            # Get decrypted refresh token using the same RPC function as skills
            supabase = get_supabase_client()
            
            try:
                decrypt_result = supabase.rpc('decrypt_google_refresh_token', {
                    'integration_id_in': self.integration_id
                }).execute()
                
                if not decrypt_result.data:
                    raise ValueError(f"No refresh token found for integration {self.integration_id}")
                
                refresh_token = decrypt_result.data
                
            except Exception as e:
                logger.error(f"Failed to decrypt Google refresh token: {e}")
                raise ValueError(f"Failed to access Google credentials for integration {self.integration_id}. " +
                               "Please reconnect your Google account in the integrations page.")
            
            # Get client credentials from settings (loaded from .env file)
            client_id = settings.GOOGLE_CLIENT_ID
            client_secret = settings.GOOGLE_CLIENT_SECRET
            
            # Debug output
            logger.info(f"Loading Google credentials - client_id present: {bool(client_id)}, client_secret present: {bool(client_secret)}")
            
            if not client_id or not client_secret:
                raise ValueError("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in configuration. " +
                               "Please check your .env file and ensure these values are set correctly.")
            
            # Create credentials object with required fields
            credentials = Credentials(
                token=None,  # Will be refreshed automatically
                refresh_token=refresh_token,
                token_uri='https://oauth2.googleapis.com/token',
                client_id=client_id,
                client_secret=client_secret,
                scopes=['https://www.googleapis.com/auth/drive.readonly']
            )
            
            # Build Drive client
            try:
                self.drive_client = build('drive', 'v3', credentials=credentials)
            except Exception as e:
                logger.error(f"Failed to build Google Drive client: {e}")
                raise ValueError(f"Failed to initialize Google Drive client. Error: {str(e)}")
            
        return self.drive_client
    
    async def get_file_metadata(self, file_id: str) -> Dict[str, Any]:
        """Get metadata for a specific Google Drive file."""
        try:
            drive = await self._get_drive_client()
            file_metadata = drive.files().get(
                fileId=file_id,
                fields='id, name, mimeType, size, modifiedTime, parents, webViewLink, owners, description'
            ).execute()
            
            return file_metadata
        except HttpError as e:
            logger.error(f"Error getting file metadata for {file_id}: {e}")
            raise
    
    async def list_files(self, folder_id: str = 'root', page_size: int = 1000) -> List[Dict[str, Any]]:
        """List files in a specific Google Drive folder."""
        try:
            drive = await self._get_drive_client()
            
            query = f"'{folder_id}' in parents and trashed = false"
            
            results = drive.files().list(
                q=query,
                pageSize=page_size,
                fields='nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, webViewLink, iconLink)'
            ).execute()
            
            return results.get('files', [])
        except HttpError as e:
            logger.error(f"Error listing files in folder {folder_id}: {e}")
            raise
    
    async def list_files_recursive(self, folder_id: str = 'root') -> List[Dict[str, Any]]:
        """Recursively list all files in a folder and its subfolders."""
        all_files = []
        
        try:
            # Get files in current folder
            files = await self.list_files(folder_id)
            
            for file in files:
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    # If it's a folder, recursively get its contents
                    subfolder_files = await self.list_files_recursive(file['id'])
                    all_files.extend(subfolder_files)
                else:
                    # Add file to results
                    all_files.append(file)
            
            return all_files
        except HttpError as e:
            logger.error(f"Error recursively listing files in folder {folder_id}: {e}")
            raise
    
    async def search_files(self, query: str, page_size: int = 1000) -> List[Dict[str, Any]]:
        """Search for files in Google Drive."""
        try:
            drive = await self._get_drive_client()
            
            search_query = f"{query} and trashed = false"
            
            results = drive.files().list(
                q=search_query,
                pageSize=page_size,
                fields='nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, webViewLink, iconLink)'
            ).execute()
            
            return results.get('files', [])
        except HttpError as e:
            logger.error(f"Error searching files with query '{query}': {e}")
            raise
    
    async def can_process_file(self, file_metadata: Dict[str, Any]) -> bool:
        """Check if a file can be processed by our system."""
        mime_type = file_metadata.get('mimeType', '')
        
        # Check if it's a Google Workspace file that can be exported
        if mime_type in self.GOOGLE_MIME_TYPES:
            return True
        
        # Check if it's a direct processing type
        if mime_type in self.DIRECT_PROCESSING_TYPES:
            return True
        
        # Check file size (skip files larger than 100MB)
        file_size = int(file_metadata.get('size', 0))
        if file_size > 100 * 1024 * 1024:  # 100MB limit
            return False
        
        return False
    
    async def determine_source_type(self, file_metadata: Dict[str, Any]) -> SourceTypeEnum:
        """Determine the final source type after processing."""
        mime_type = file_metadata.get('mimeType', '')
        
        # Google Workspace files become PDFs after export
        if mime_type in self.GOOGLE_MIME_TYPES:
            return SourceTypeEnum.PDF
        
        # Direct processing types
        if mime_type in self.DIRECT_PROCESSING_TYPES:
            return self.DIRECT_PROCESSING_TYPES[mime_type]
        
        # Default to PDF for unknown types (will be converted)
        return SourceTypeEnum.PDF
    
    async def download_file(self, file_id: str, file_metadata: Dict[str, Any]) -> Tuple[bytes, str]:
        """Download a file from Google Drive and return content and filename."""
        try:
            drive = await self._get_drive_client()
            mime_type = file_metadata.get('mimeType', '')
            file_name = file_metadata.get('name', f'file_{file_id}')
            
            # Check if it's a Google Workspace file that needs export
            if mime_type in self.GOOGLE_MIME_TYPES:
                # Export Google Workspace file as PDF
                export_mime_type = self.GOOGLE_MIME_TYPES[mime_type]
                request = drive.files().export(fileId=file_id, mimeType=export_mime_type)
                file_content = request.execute()
                
                # Change filename extension to .pdf
                file_name = os.path.splitext(file_name)[0] + '.pdf'
                
                logger.info(f"Exported Google Workspace file {file_id} as PDF")
                
            else:
                # Download regular file
                request = drive.files().get_media(fileId=file_id)
                file_content = request.execute()
                
                logger.info(f"Downloaded file {file_id} directly")
            
            return file_content, file_name
            
        except HttpError as e:
            logger.error(f"Error downloading file {file_id}: {e}")
            raise
    
    async def create_temp_file(self, content: bytes, filename: str) -> str:
        """Create a temporary file with the given content."""
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, filename)
        
        # Write content to temporary file
        async with aiofiles.open(temp_file_path, 'wb') as f:
            await f.write(content)
        
        return temp_file_path
    
    async def cleanup_temp_file(self, temp_file_path: str):
        """Clean up temporary file and directory."""
        try:
            if os.path.exists(temp_file_path):
                await aiofiles.os.remove(temp_file_path)
                
            # Also remove the temporary directory if it's empty
            temp_dir = os.path.dirname(temp_file_path)
            if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                os.rmdir(temp_dir)
                
        except Exception as e:
            logger.warning(f"Error cleaning up temporary file {temp_file_path}: {e}")
    
    async def get_folder_path(self, folder_id: str) -> str:
        """Get the full path of a folder in Google Drive."""
        try:
            if folder_id == 'root':
                return '/'
            
            drive = await self._get_drive_client()
            path_parts = []
            current_id = folder_id
            
            while current_id != 'root':
                folder = drive.files().get(
                    fileId=current_id,
                    fields='name, parents'
                ).execute()
                
                path_parts.append(folder['name'])
                
                parents = folder.get('parents', [])
                if not parents:
                    break
                    
                current_id = parents[0]
            
            # Reverse to get correct order and join with '/'
            path_parts.reverse()
            return '/' + '/'.join(path_parts)
            
        except HttpError as e:
            logger.error(f"Error getting folder path for {folder_id}: {e}")
            return f"/folder_{folder_id}"
    
    async def create_content_metadata(self, file_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create metadata for storing in the content source."""
        file_id = file_metadata['id']
        
        # Get folder path
        parents = file_metadata.get('parents', [])
        folder_path = '/'
        if parents:
            folder_path = await self.get_folder_path(parents[0])
        
        metadata = {
            'google_drive': {
                'file_id': file_id,
                'original_name': file_metadata.get('name', ''),
                'mime_type': file_metadata.get('mimeType', ''),
                'drive_folder': folder_path,
                'last_modified': file_metadata.get('modifiedTime', ''),
                'integration_id': self.integration_id,
                'web_view_link': file_metadata.get('webViewLink', ''),
                'file_size': file_metadata.get('size', 0),
                'owners': file_metadata.get('owners', []),
                'description': file_metadata.get('description', ''),
            }
        }
        
        return metadata
    
    async def batch_process_files(self, file_ids: List[str], 
                                 progress_callback: Optional[callable] = None) -> List[Dict[str, Any]]:
        """Process multiple files from Google Drive."""
        results = []
        total_files = len(file_ids)
        
        for i, file_id in enumerate(file_ids):
            try:
                # Get file metadata
                file_metadata = await self.get_file_metadata(file_id)
                
                # Check if file can be processed
                if not await self.can_process_file(file_metadata):
                    logger.warning(f"Skipping file {file_id} - cannot process")
                    continue
                
                # Determine source type
                source_type = await self.determine_source_type(file_metadata)
                
                # Create metadata
                metadata = await self.create_content_metadata(file_metadata)
                
                # Download file content
                content, filename = await self.download_file(file_id, file_metadata)
                
                # Create temporary file
                temp_file_path = await self.create_temp_file(content, filename)
                
                result = {
                    'file_id': file_id,
                    'filename': filename,
                    'source_type': source_type,
                    'ingestion_source': IngestionSourceEnum.GOOGLE_DRIVE,
                    'temp_file_path': temp_file_path,
                    'metadata': metadata,
                    'file_size': len(content),
                    'title': file_metadata.get('name', filename),
                }
                
                results.append(result)
                
                # Call progress callback if provided
                if progress_callback:
                    progress = int((i + 1) / total_files * 100)
                    await progress_callback(progress, f"Processed {i + 1}/{total_files} files")
                
            except Exception as e:
                logger.error(f"Error processing file {file_id}: {e}")
                # Continue with other files even if one fails
                continue
        
        return results