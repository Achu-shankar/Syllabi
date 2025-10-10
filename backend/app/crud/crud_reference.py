from supabase import Client
from app.schemas.reference import (
    ContentSourceCreate, 
    ContentSourceUpdate, 
    ContentSource, 
    SourceTypeEnum,
    IngestionSourceEnum,
    IndexingStatusEnum
)
from postgrest.exceptions import APIError as PostgrestAPIError
from uuid import UUID
from typing import List, Optional, Dict, Any


def create_reference(db: Client, *, reference_in: ContentSourceCreate, reference_id: UUID) -> Optional[ContentSource]:
    """Create a new content source in the database with supplied ID."""
    try:
        reference_data_dict = {
            "id": str(reference_id),  # Use supplied ID
            "chatbot_id": str(reference_in.chatbot_id),
            "source_type": reference_in.source_type.value,
            "ingestion_source": reference_in.ingestion_source.value,
            "file_name": reference_in.file_name,
            "storage_path": reference_in.storage_path,
            "source_url": reference_in.source_url,
            "title": reference_in.title,
            "indexing_status": reference_in.indexing_status.value,
            "error_message": reference_in.error_message,
            "metadata": reference_in.metadata,
            # 'uploaded_at', 'created_at' and 'updated_at' are handled by DB defaults/triggers
        }
        
        response = db.table("chatbot_content_sources").insert(reference_data_dict).execute()
        
        if response.data:
            return ContentSource(**response.data[0])
        else:
            print(f"Error creating reference: No data returned and no exception raised. Payload: {reference_data_dict}")
            return None
    except PostgrestAPIError as e:
        print(f"Database error creating reference: {e}")
        print(f"Error details: {e.details if hasattr(e, 'details') else 'N/A'}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while creating reference: {e}")
        return None

def get_reference(db: Client, *, reference_id: UUID) -> Optional[ContentSource]:
    """Retrieve a content source by its ID."""
    try:
        response = (
            db.table("chatbot_content_sources")
            .select("*")
            .eq("id", str(reference_id))
            .maybe_single()
            .execute()
        )
        return ContentSource(**response.data) if response.data else None
    except PostgrestAPIError as e:
        print(f"Database error retrieving reference {reference_id}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while retrieving reference {reference_id}: {e}")
        return None

def get_references_by_chatbot(
    db: Client, *, chatbot_id: UUID, skip: int = 0, limit: int = 100
) -> List[ContentSource]:
    """Retrieve content sources by chatbot ID."""
    try:
        response = (
            db.table("chatbot_content_sources")
            .select("*")
            .eq("chatbot_id", str(chatbot_id))
            .order("created_at", desc=True)
            .offset(skip)
            .limit(limit)
            .execute()
        )
        return [ContentSource(**data) for data in response.data] if response.data else []
    except PostgrestAPIError as e:
        print(f"Database error retrieving references for chatbot {chatbot_id}: {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred while retrieving references: {e}")
        return []

def update_reference(db: Client, *, reference_id: UUID, reference_in: ContentSourceUpdate) -> Optional[ContentSource]:
    """Update an existing content source."""
    try:
        update_data = reference_in.model_dump(exclude_unset=True)
        if not update_data:
            # If nothing to update, just fetch and return the current state
            return get_reference(db=db, reference_id=reference_id)

        # Handle enum fields if they are present in the update payload
        if "source_type" in update_data and isinstance(update_data["source_type"], SourceTypeEnum):
            update_data["source_type"] = update_data["source_type"].value

        if "ingestion_source" in update_data and isinstance(update_data["ingestion_source"], IngestionSourceEnum):
            update_data["ingestion_source"] = update_data["ingestion_source"].value

        if "indexing_status" in update_data and isinstance(update_data["indexing_status"], IndexingStatusEnum):
            update_data["indexing_status"] = update_data["indexing_status"].value

        response = (
            db.table("chatbot_content_sources")
            .update(update_data)
            .eq("id", str(reference_id))
            .execute()
        )
        return ContentSource(**response.data) if response.data else None
    except PostgrestAPIError as e:
        print(f"Database error updating reference {reference_id}: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while updating reference {reference_id}: {e}")
        return None

def delete_reference(db: Client, *, reference_id: UUID) -> bool:
    """Delete a content source by its ID."""
    try:
        response = db.table("chatbot_content_sources").delete().eq("id", str(reference_id)).execute()
        return True
    except PostgrestAPIError as e:
        print(f"Database error deleting reference {reference_id}: {e}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred while deleting reference {reference_id}: {e}")
        return False
    
        
        





