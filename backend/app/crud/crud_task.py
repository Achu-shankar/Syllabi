from supabase import Client
from postgrest.exceptions import APIError as PostgrestAPIError
from uuid import UUID, uuid4
from typing import List, Optional, Dict, Any
from app.schemas.task import Task, TaskCreate, TaskUpdate, TaskStatusEnum

def create_task(db: Client, *, task_in: TaskCreate) -> Optional[Task]:
    """Create a new task in the database.
    
    Args:
        db: The Supabase client instance.
        task_in: The task creation data.
        
    Returns:
        The created task if successful, otherwise None.
    """
    generated_task_identifier = uuid4()

    task_data_dict = {
        "task_identifier": str(generated_task_identifier),
        "user_id": task_in.user_id,
        "chatbot_id": str(task_in.chatbot_id),
        "reference_id": str(task_in.reference_id) if task_in.reference_id else None,
        "task_type": task_in.task_type.value,
        "status": TaskStatusEnum.QUEUED.value,
        "progress_percentage": 0,
        "input_payload": task_in.input_payload,
    }

    try:
        response = db.table("tasks").insert(task_data_dict).execute()
        
        if response.data:
            created_record_data = response.data[0]
            return Task(**created_record_data)
        else:
            print("Error creating task: No data returned from insert operation and no exception was raised.")
            return None
            
    except PostgrestAPIError as e:
        print(f"Database error creating task: {e}")
        print(f"Error details: {e.details if hasattr(e, 'details') else 'N/A'}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while creating task: {e}")
        return None

def get_task(db: Client, *, task_identifier: UUID) -> Optional[Task]:
    """Retrieve a task from the database by its identifier.

    Args:
        db: The Supabase client instance.
        task_identifier: The identifier of the task to retrieve.

    Returns:
        The task if found, otherwise None.
    """
    try:
        response = (
            db.table("tasks")
            .select("*")
            .eq("task_identifier", str(task_identifier))
            .maybe_single()
            .execute()
        )
        
        if response.data:
            return Task(**response.data)
        else:
            return None
            
    except PostgrestAPIError as e:
        print(f"Database error retrieving task: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while retrieving task: {e}")
        return None

def get_multi_tasks_by_user_chatbot(
    db: Client, *, user_id: str, chatbot_id: UUID, skip: int = 0, limit: int = 100
 ) -> List[Task]:
    """Retrieve multiple tasks for a specific user and chatbot, with pagination.

    Args:
        db: The Supabase client instance.
        user_id: The ID of the user.
        chatbot_id: The ID of the chatbot.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return.

    Returns:
        A list of tasks, or an empty list if none are found or an error occurs.
    """
    try:
        response = (
            db.table("tasks")
            .select("*")
            .eq("user_id", user_id)
            .eq("chatbot_id", str(chatbot_id))
            .order("created_at", desc=True)
            .offset(skip)
            .limit(limit)
            .execute()
        )
        
        if response.data:
            return [Task(**task_data) for task_data in response.data]
        else:
            return []
            
    except PostgrestAPIError as e:
        print(f"Database error retrieving tasks: {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred while retrieving tasks: {e}")
        return []
    
def update_task(db: Client, *, task_identifier: UUID, task_in: TaskUpdate) -> Optional[Task]:
    """Update an existing task in the database.

    Args:
        db: The Supabase client instance.
        task_identifier: The identifier of the task to update.
        task_in: The Pydantic model with fields to update. Unset fields will be ignored.

    Returns:
        The updated task if successful, otherwise None.
    """
    update_data = task_in.model_dump(exclude_unset=True)

    if not update_data:
        return get_task(db=db, task_identifier=task_identifier)

    if "status" in update_data and isinstance(update_data["status"], TaskStatusEnum):
        update_data["status"] = update_data["status"].value

    if "reference_id" in update_data and update_data["reference_id"] is not None:
        update_data["reference_id"] = str(update_data["reference_id"])

    try:
        response = (
            db.table("tasks")
            .update(update_data)
            .eq("task_identifier", str(task_identifier))
            .execute()
        )
        
        if response.data:
            return Task(**response.data[0])
        else:
            print(f"Task with identifier {task_identifier} not found for update, or no data returned.")
            return None
            
    except PostgrestAPIError as e:
        print(f"Database error updating task: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while updating task: {e}")
        return None

def delete_task(db: Client, *, task_identifier: UUID) -> bool:
    """Delete a task from the database.
    
    Args:
        db: The Supabase client instance.
        task_identifier: The identifier of the task to delete.

    Returns:
        True if the task was deleted successfully, otherwise False.
    """
    try:
        response = (
            db.table("tasks")
            .delete()
            .eq("task_identifier", str(task_identifier))
            .execute()
        )
        
        return True
            
    except PostgrestAPIError as e:
        print(f"Database error deleting task: {e}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred while deleting task: {e}")
        return False
    
