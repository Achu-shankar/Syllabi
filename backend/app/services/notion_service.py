"""
Notion content service for handling page discovery, processing, and content extraction.
"""
import logging
import tempfile
import os
import asyncio
import json
import time
from typing import List, Dict, Any, Optional, Tuple
from notion_client import Client
from notion_client.errors import APIResponseError, RequestTimeoutError
import aiofiles
import aiofiles.os
import markdown2
from weasyprint import HTML, CSS

from app.core.supabase_client import get_supabase_client
from app.core.config import settings
from app.schemas.reference import IngestionSourceEnum, SourceTypeEnum

logger = logging.getLogger(__name__)


class NotionService:
    """Service for interacting with Notion API for content processing."""
    
    # Rate limiting configuration
    RATE_LIMIT_DELAY = 0.4  # 400ms between requests (2.5 req/sec, under 3 req/sec limit)
    MAX_BLOCKS_PER_REQUEST = 100  # Notion's pagination limit
    MAX_RETRIES = 3
    
    def __init__(self, integration_id: str):
        """Initialize Notion service with integration credentials."""
        self.integration_id = integration_id
        self.notion_client = None
        self.last_request_time = 0
        
    async def _get_notion_client(self) -> Client:
        """Get authenticated Notion client."""
        if self.notion_client is None:
            # Get decrypted access token using the same pattern as Google Drive
            supabase = get_supabase_client()
            
            try:
                # Use a similar RPC function for Notion tokens
                # Note: This assumes a similar decrypt function exists for Notion
                decrypt_result = supabase.rpc('decrypt_notion_access_token', {
                    'integration_id_in': self.integration_id
                }).execute()
                
                if not decrypt_result.data:
                    raise ValueError(f"No access token found for integration {self.integration_id}")
                
                access_token = decrypt_result.data
                
            except Exception as e:
                logger.error(f"Failed to decrypt Notion access token: {e}")
                raise ValueError(f"Failed to access Notion credentials for integration {self.integration_id}. " +
                               "Please reconnect your Notion account in the integrations page.")
            
            # Create Notion client with the access token
            try:
                self.notion_client = Client(auth=access_token)
                
                # Test the connection
                await self._rate_limited_request(self.notion_client.users.me)
                
            except Exception as e:
                logger.error(f"Failed to create Notion client: {e}")
                raise ValueError(f"Failed to initialize Notion client. Error: {str(e)}")
            
        return self.notion_client
    
    async def _rate_limited_request(self, request_func, *args, **kwargs):
        """Execute a Notion API request with rate limiting."""
        # Ensure we don't exceed rate limits
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.RATE_LIMIT_DELAY:
            sleep_time = self.RATE_LIMIT_DELAY - time_since_last
            await asyncio.sleep(sleep_time)
        
        # Execute request with retries
        for attempt in range(self.MAX_RETRIES):
            try:
                self.last_request_time = time.time()
                return request_func(*args, **kwargs)
                
            except RequestTimeoutError:
                if attempt < self.MAX_RETRIES - 1:
                    wait_time = (2 ** attempt) * self.RATE_LIMIT_DELAY
                    await asyncio.sleep(wait_time)
                    continue
                raise
                
            except APIResponseError as e:
                if e.status == 429:  # Rate limited
                    if attempt < self.MAX_RETRIES - 1:
                        wait_time = (2 ** attempt) * 2  # Exponential backoff
                        await asyncio.sleep(wait_time)
                        continue
                raise
    
    async def get_user_info(self) -> Dict[str, Any]:
        """Get current user information."""
        notion = await self._get_notion_client()
        response = await self._rate_limited_request(notion.users.me)
        return response
    
    async def search_pages(self, query: str = "", page_size: int = 100) -> List[Dict[str, Any]]:
        """Search for pages accessible to the integration."""
        try:
            notion = await self._get_notion_client()
            
            search_params = {
                "page_size": min(page_size, 100),
                "filter": {
                    "property": "object",
                    "value": "page"
                }
            }
            
            if query:
                search_params["query"] = query
            
            response = await self._rate_limited_request(notion.search, **search_params)
            
            pages = []
            for result in response.get("results", []):
                if result["object"] == "page":
                    pages.append(await self._format_page_info(result))
            
            return pages
            
        except Exception as e:
            logger.error(f"Error searching Notion pages: {e}")
            raise
    
    async def get_page_info(self, page_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific page."""
        try:
            notion = await self._get_notion_client()
            response = await self._rate_limited_request(notion.pages.retrieve, page_id)
            return await self._format_page_info(response)
            
        except Exception as e:
            logger.error(f"Error getting page info for {page_id}: {e}")
            raise
    
    async def _format_page_info(self, page_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format page data into a consistent structure."""
        page_id = page_data["id"]
        
        # Extract title from properties or plain_text
        title = "Untitled"
        if "properties" in page_data:
            # Try to find title property
            for prop_name, prop_data in page_data["properties"].items():
                if prop_data.get("type") == "title" and prop_data.get("title"):
                    title_parts = []
                    for title_part in prop_data["title"]:
                        if title_part.get("plain_text"):
                            title_parts.append(title_part["plain_text"])
                    if title_parts:
                        title = "".join(title_parts)
                    break
        
        # Get parent information
        parent_info = {"type": "workspace"}
        if "parent" in page_data:
            parent = page_data["parent"]
            if parent.get("type") == "database_id":
                parent_info = {"type": "database", "id": parent["database_id"]}
            elif parent.get("type") == "page_id":
                parent_info = {"type": "page", "id": parent["page_id"]}
        
        return {
            "id": page_id,
            "title": title,
            "url": page_data.get("url", ""),
            "created_time": page_data.get("created_time", ""),
            "last_edited_time": page_data.get("last_edited_time", ""),
            "parent": parent_info,
            "archived": page_data.get("archived", False),
            "icon": page_data.get("icon"),
            "cover": page_data.get("cover"),
            "can_process": True  # All pages can be processed
        }
    
    async def get_page_content(self, page_id: str) -> str:
        """Extract full content from a Notion page as markdown."""
        try:
            notion = await self._get_notion_client()
            
            # Get all blocks from the page recursively
            blocks = await self._get_all_blocks(page_id)
            
            # Convert blocks to markdown
            markdown_content = await self._blocks_to_markdown(blocks)
            
            return markdown_content
            
        except Exception as e:
            logger.error(f"Error getting content for page {page_id}: {e}")
            raise
    
    async def _get_all_blocks(self, page_id: str) -> List[Dict[str, Any]]:
        """Recursively retrieve all blocks from a page."""
        all_blocks = []
        
        try:
            notion = await self._get_notion_client()
            
            # Get blocks with pagination
            has_more = True
            next_cursor = None
            
            while has_more:
                params = {"page_size": self.MAX_BLOCKS_PER_REQUEST}
                if next_cursor:
                    params["start_cursor"] = next_cursor
                
                response = await self._rate_limited_request(
                    notion.blocks.children.list, 
                    page_id, 
                    **params
                )
                
                blocks = response.get("results", [])
                
                # Process each block and get children if they exist
                for block in blocks:
                    all_blocks.append(block)
                    
                    # Check if block has children
                    if block.get("has_children", False):
                        child_blocks = await self._get_all_blocks(block["id"])
                        # Add children with proper nesting
                        for child in child_blocks:
                            child["_parent_id"] = block["id"]
                            all_blocks.append(child)
                
                has_more = response.get("has_more", False)
                next_cursor = response.get("next_cursor")
            
            return all_blocks
            
        except Exception as e:
            logger.error(f"Error getting blocks for page {page_id}: {e}")
            raise
    
    async def _blocks_to_markdown(self, blocks: List[Dict[str, Any]]) -> str:
        """Convert Notion blocks to markdown format."""
        markdown_lines = []
        
        for block in blocks:
            block_type = block.get("type", "")
            block_content = block.get(block_type, {})
            
            # Skip if this is a child block (will be handled by parent)
            if "_parent_id" in block:
                continue
            
            line = await self._convert_block_to_markdown(block, block_type, block_content)
            if line:
                markdown_lines.append(line)
        
        return "\n\n".join(markdown_lines)
    
    async def _convert_block_to_markdown(self, block: Dict[str, Any], block_type: str, content: Dict[str, Any]) -> str:
        """Convert a single block to markdown."""
        if block_type == "paragraph":
            return self._rich_text_to_markdown(content.get("rich_text", []))
        
        elif block_type == "heading_1":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"# {text}"
        
        elif block_type == "heading_2":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"## {text}"
        
        elif block_type == "heading_3":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"### {text}"
        
        elif block_type == "bulleted_list_item":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"- {text}"
        
        elif block_type == "numbered_list_item":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"1. {text}"
        
        elif block_type == "to_do":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            checked = content.get("checked", False)
            checkbox = "[x]" if checked else "[ ]"
            return f"- {checkbox} {text}"
        
        elif block_type == "toggle":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"▶ {text}"
        
        elif block_type == "code":
            code_text = self._rich_text_to_markdown(content.get("rich_text", []))
            language = content.get("language", "")
            return f"```{language}\n{code_text}\n```"
        
        elif block_type == "quote":
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return f"> {text}"
        
        elif block_type == "divider":
            return "---"
        
        elif block_type == "image":
            # Handle image blocks
            if content.get("type") == "file":
                url = content.get("file", {}).get("url", "")
                caption = self._rich_text_to_markdown(content.get("caption", []))
                return f"![{caption}]({url})"
            elif content.get("type") == "external":
                url = content.get("external", {}).get("url", "")
                caption = self._rich_text_to_markdown(content.get("caption", []))
                return f"![{caption}]({url})"
        
        elif block_type == "table":
            # Basic table support
            return "[Table content - formatting preserved in PDF]"
        
        # For unsupported block types, try to extract any text
        elif content.get("rich_text"):
            text = self._rich_text_to_markdown(content.get("rich_text", []))
            return text if text else f"[{block_type.replace('_', ' ').title()}]"
        
        return f"[{block_type.replace('_', ' ').title()}]"
    
    def _rich_text_to_markdown(self, rich_text: List[Dict[str, Any]]) -> str:
        """Convert Notion rich text to markdown."""
        if not rich_text:
            return ""
        
        result = []
        for text_obj in rich_text:
            text = text_obj.get("plain_text", "")
            annotations = text_obj.get("annotations", {})
            
            # Apply formatting
            if annotations.get("bold"):
                text = f"**{text}**"
            if annotations.get("italic"):
                text = f"*{text}*"
            if annotations.get("strikethrough"):
                text = f"~~{text}~~"
            if annotations.get("code"):
                text = f"`{text}`"
            
            # Handle links
            if text_obj.get("href"):
                text = f"[{text}]({text_obj['href']})"
            
            result.append(text)
        
        return "".join(result)
    
    async def can_process_page(self, page_info: Dict[str, Any]) -> bool:
        """Check if a page can be processed."""
        # Don't process archived pages
        if page_info.get("archived", False):
            return False
        
        # All other pages can be processed
        return True
    
    async def determine_source_type(self, page_info: Dict[str, Any]) -> SourceTypeEnum:
        """Determine the final source type after processing (always PDF)."""
        return SourceTypeEnum.PDF
    
    async def create_content_metadata(self, page_info: Dict[str, Any]) -> Dict[str, Any]:
        """Create metadata for storing in the content source."""
        page_id = page_info["id"]
        
        metadata = {
            "notion": {
                "page_id": page_id,
                "title": page_info.get("title", ""),
                "url": page_info.get("url", ""),
                "parent": page_info.get("parent", {}),
                "created_time": page_info.get("created_time", ""),
                "last_edited_time": page_info.get("last_edited_time", ""),
                "integration_id": self.integration_id,
                "icon": page_info.get("icon"),
                "cover": page_info.get("cover"),
            }
        }
        
        return metadata
    
    async def download_page_as_pdf(self, page_id: str, page_info: Dict[str, Any]) -> Tuple[bytes, str]:
        """Download a Notion page as PDF."""
        try:
            # Get page content as markdown
            markdown_content = await self.get_page_content(page_id)
            
            # Convert markdown to HTML
            html_content = markdown2.markdown(
                markdown_content, 
                extras=["tables", "fenced-code-blocks", "footnotes", "cuddled-lists", "code-friendly"]
            )
            
            # Add title to HTML
            title = page_info.get("title", "Untitled")
            full_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>{title}</title>
            </head>
            <body>
                <h1>{title}</h1>
                {html_content}
            </body>
            </html>
            """
            
            # Convert to PDF using weasyprint
            css = CSS(string="""
                @page { size: A4; margin: 1.5cm; } 
                body { font-family: sans-serif; line-height: 1.4; } 
                h1, h2, h3, h4, h5, h6 { margin-top: 1.2em; margin-bottom: 0.5em; line-height: 1.2; } 
                p { margin-bottom: 0.8em; } 
                a { color: #007bff; } 
                table { border-collapse: collapse; width: 100%; margin-bottom: 1em; } 
                th, td { border: 1px solid #ddd; padding: 8px; } 
                th { background-color: #f2f2f2; } 
                pre { background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 4px; }
                code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
                blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1em; color: #666; }
            """)
            
            pdf_bytes = HTML(string=full_html).write_pdf(stylesheets=[css])
            
            # Create filename
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            filename = f"{safe_title[:50]}.pdf" if safe_title else f"notion_page_{page_id[:8]}.pdf"
            
            logger.info(f"Converted Notion page {page_id} to PDF: {filename}")
            
            return pdf_bytes, filename
            
        except Exception as e:
            logger.error(f"Error converting Notion page {page_id} to PDF: {e}")
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