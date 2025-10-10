import requests
import json
import time
import uuid

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"  # Your FastAPI app's base URL
INDEXING_URL = f"{BASE_URL}/indexing/initiate-indexing"
TASKS_STREAM_URL_TEMPLATE = f"{BASE_URL}/tasks/{{task_identifier}}/status-stream"

# Sample data for the request
SAMPLE_USER_ID = "82c12328-a231-4a52-9abf-7da597292e9f"  # Use a relevant user UUID
SAMPLE_CHATBOT_ID = "1833ee55-b4b6-45b2-87e4-822dafc9d863"  # Use a relevant chatbot ID
# !!! IMPORTANT: Replace this with a UUID of an ACTUAL reference in your database !!!
# This reference should have a `file_storage_path` set, as the indexing task will try to download it.
SAMPLE_REFERENCE_ID = "2f3d0faf-b51e-4ceb-8e60-0e3709e457eb" # e.g., "d290f1ee-6c54-4b01-90e6-d701748f0851"


def initiate_indexing(user_id: str, chatbot_id: str, reference_id: str) -> str | None:
    """
    Sends a request to initiate document indexing and returns the task_identifier.
    """
    if reference_id == "YOUR_EXISTING_REFERENCE_ID_HERE":
        print("ERROR: Please replace SAMPLE_REFERENCE_ID with an actual reference UUID in the script.")
        return None

    payload = {
        "user_id": user_id,
        "chatbot_id": chatbot_id,
        "reference_id": reference_id,
    }
    print(f"Attempting to initiate indexing with payload: {payload}")
    try:
        response = requests.post(INDEXING_URL, json=payload, timeout=10)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)

        if response.status_code == 202:  # Accepted
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"Indexing task initiated successfully. Task Identifier: {task_identifier}")
            print(f"Full task creation response: {response_data}")
            return task_identifier
        else:
            print(f"Error initiating indexing task. Status: {response.status_code}, Response: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON response: {e}. Response text: {response.text if 'response' in locals() else 'N/A'}")
        return None


def listen_to_task_stream(task_identifier: str):
    """
    Connects to the SSE endpoint to listen for real-time task status updates.
    """
    sse_url = TASKS_STREAM_URL_TEMPLATE.format(task_identifier=task_identifier)
    print(f"Listening to task status stream at: {sse_url}")
    
    try:
        response = requests.get(sse_url, stream=True, timeout=300)  # 5-minute timeout
        response.raise_for_status()

        print("Connected to status stream. Listening for updates...")
        for line in response.iter_lines(decode_unicode=True):
            if line:
                print(f"[STREAM] {line}")
                
                # Parse SSE format: "data: <json_data>"
                if line.startswith("data: "):
                    try:
                        json_data = line[6:]  # Remove "data: " prefix
                        task_data = json.loads(json_data)
                        status = task_data.get("status", "UNKNOWN")
                        progress = task_data.get("progress_percentage", 0)
                        description = task_data.get("current_step_description", "No description")
                        
                        print(f"Status: {status} | Progress: {progress}% | {description}")
                        
                        # Break if task is complete or failed
                        if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                            print(f"Task finished with status: {status}")
                            if status == "COMPLETED":
                                result = task_data.get("result_payload", {})
                                print(f"Task result: {result}")
                            elif status == "FAILED":
                                error = task_data.get("error_details", "Unknown error")
                                print(f"Task failed with error: {error}")
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"Failed to parse SSE data as JSON: {e}. Line: {line}")
                        
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to SSE stream: {e}")
    except KeyboardInterrupt:
        print("\nSSE stream interrupted by user.")


if __name__ == "__main__":
    print("Starting Indexing Task Test Script...")

    # Validate that SAMPLE_REFERENCE_ID has been changed
    if SAMPLE_REFERENCE_ID == "YOUR_EXISTING_REFERENCE_ID_HERE":
        print("\nERROR: Please update the SAMPLE_REFERENCE_ID in the script with a valid UUID string \n"
              "       of a reference that exists in your database and has a 'file_storage_path'.")
    else:
        # 1. Initiate document indexing
        task_id = initiate_indexing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            reference_id=SAMPLE_REFERENCE_ID
        )

        # 2. If task initiation was successful, listen to the SSE stream
        if task_id:
            listen_to_task_stream(task_id)
        else:
            print("Could not obtain an indexing task ID. Exiting.")

    print("\nTest Script Finished.") 