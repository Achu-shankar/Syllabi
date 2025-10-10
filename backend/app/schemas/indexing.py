from uuid import UUID
from pydantic import BaseModel

class IndexingRequest(BaseModel):
    """Schema for indexing request."""
    user_id: UUID
    chatbot_id: UUID
    reference_id: UUID
