import requests
import json
import time
import uuid # For generating sample IDs

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1" # Your FastAPI app's base URL
DOCUMENTS_URL = f"{BASE_URL}/documents/initiate-processing"
TASKS_STREAM_URL_TEMPLATE = f"{BASE_URL}/tasks/{{task_identifier}}/status-stream"

# Sample data for the request
SAMPLE_USER_ID = "user_2s2mYAVPRsMO8K3Klt0lpTqkB0B"
SAMPLE_CHATBOT_ID = "1833ee55-b4b6-45b2-87e4-822dafc9d863" # Generate a random UUID for chatbot_id for testing
SAMPLE_REFERENCE_ID = str(uuid.uuid4()) # Generate a random UUID for reference_id (required)
SAMPLE_FILE_PATH = "1833ee55-b4b6-45b2-87e4-822dafc9d863/sample.txt" # Example path in Supabase storage

def initiate_processing(user_id: str, chatbot_id: str, file_path: str, reference_id: str) -> str | None:
    """
    Sends a request to initiate document processing and returns the task_identifier.
    """
    payload = {
        "user_id": user_id,
        "chatbot_id": chatbot_id,
        "file_path_in_storage": file_path,
        "reference_id": reference_id # Required field
    }
    print(f"Attempting to initiate processing with payload: {payload}")
    try:
        response = requests.post(DOCUMENTS_URL, json=payload, timeout=10) # Added timeout
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

        if response.status_code == 202: # Accepted
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"Task initiated successfully. Task Identifier: {task_identifier}")
            print(f"Full task creation response: {response_data}")
            return task_identifier
        else:
            print(f"Error initiating task. Status: {response.status_code}, Response: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON response: {e}. Response text: {response.text if 'response' in locals() else 'N/A'}")
        return None


def listen_to_task_stream(task_identifier: str):
    """
    Listens to the SSE stream for a given task_identifier and prints updates.
    """
    if not task_identifier:
        print("No task identifier provided. Cannot listen to stream.")
        return

    stream_url = TASKS_STREAM_URL_TEMPLATE.format(task_identifier=task_identifier)
    print(f"\nConnecting to SSE stream: {stream_url}\n")

    try:
        with requests.get(stream_url, stream=True, timeout=300) as response: # Added timeout for initial connection
            response.raise_for_status() # Check for HTTP errors on stream connection
            print("Successfully connected to stream. Waiting for updates...\n" + "="*30)
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data:'):
                        try:
                            # Remove "data: " prefix and parse JSON
                            json_data_str = decoded_line[len('data:'):].strip()
                            if json_data_str: # Ensure it's not empty after stripping
                                data = json.loads(json_data_str)
                                print(f"Received Task Update ({time.strftime('%H:%M:%S')}):")
                                print(f"  Task ID: {data.get('task_identifier')}")
                                print(f"  Status: {data.get('status')}")
                                print(f"  Step: {data.get('current_step_description')}")
                                print(f"  Progress: {data.get('progress_percentage')}%")
                                if data.get('error_details'):
                                    print(f"  Error: {data.get('error_details')}")
                                if data.get('result_payload'):
                                     print(f"  Result: {data.get('result_payload')}")
                                print("-"*30)

                                # Check for terminal states
                                status = data.get('status')
                                if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                                    print(f"\nTask reached terminal state: {status}. Closing stream.")
                                    break
                            else:
                                print(f"Received empty data line: {decoded_line}")

                        except json.JSONDecodeError as e:
                            print(f"Error decoding JSON from SSE event: {e}")
                            print(f"Problematic line: {decoded_line}")
                        except Exception as e:
                            print(f"An unexpected error occurred while processing an SSE event: {e}")
                            print(f"Problematic line: {decoded_line}")


    except requests.exceptions.RequestException as e:
        print(f"Error connecting to or streaming from SSE endpoint: {e}")
    except Exception as e:
        print(f"An unexpected error occurred during SSE streaming: {e}")
    finally:
        print("="*30 + "\nSSE Stream listener finished.")


def test_different_file_types():
    """
    Test the processing pipeline with different file types.
    """
    test_files = [
        {
            "name": "PDF Test",
            "path": f"{SAMPLE_CHATBOT_ID}/sample.pdf",
            "description": "Testing PDF processing (no conversion needed)"
        },
        {
            "name": "TXT Test", 
            "path": f"{SAMPLE_CHATBOT_ID}/sample.txt",
            "description": "Testing TXT to PDF conversion"
        },
        {
            "name": "MD Test",
            "path": f"{SAMPLE_CHATBOT_ID}/sample.md", 
            "description": "Testing Markdown to PDF conversion"
        },
        {
            "name": "Unicode TXT Test",
            "path": f"{SAMPLE_CHATBOT_ID}/test_unicode_text.txt",
            "description": "Testing TXT with emojis and Unicode characters"
        }
    ]
    
    print("=== Testing Different File Types ===\n")
    
    for test_file in test_files:
        print(f"\n--- {test_file['name']} ---")
        print(f"Description: {test_file['description']}")
        print(f"File path: {test_file['path']}")
        
        # Generate unique reference ID for each test
        reference_id = str(uuid.uuid4())
        print(f"Reference ID: {reference_id}")
        
        # Initiate processing
        task_id = initiate_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=test_file['path'],
            reference_id=reference_id
        )
        
        if task_id:
            print(f"Task initiated: {task_id}")
            user_input = input("Listen to stream for this task? (y/n): ").lower().strip()
            if user_input == 'y':
                listen_to_task_stream(task_id)
        else:
            print("Failed to initiate task")
        
        print("\n" + "="*50)


if __name__ == "__main__":
    print("Starting Document Processing Pipeline Test Script...")
    print(f"Base URL: {BASE_URL}")
    print(f"Sample User ID: {SAMPLE_USER_ID}")
    print(f"Sample Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print(f"Generated Reference ID: {SAMPLE_REFERENCE_ID}")
    print("="*50)

    # Ask user what type of test to run
    print("\nSelect test type:")
    print("1. Single file test (sample.txt - used to be sample.pdf)")
    print("2. Test different file types (PDF, TXT, MD)")
    print("3. Unicode text file test (emojis and special characters)")
    print("4. Custom file path")
    
    choice = input("Enter choice (1-4): ").strip()
    
    if choice == "1":
        # 1. Test with single file (original test)
        task_id = initiate_processing(
            user_id=SAMPLE_USER_ID,
                chatbot_id=SAMPLE_CHATBOT_ID,
                file_path=SAMPLE_FILE_PATH, # This is sample.txt by default
                reference_id=SAMPLE_REFERENCE_ID
        )

    # 2. If task initiation was successful, listen to the SSE stream
        if task_id:
            print(f"Task ID: {task_id}")
            listen_to_task_stream(task_id)
        else:
            print("Could not obtain a task ID. Exiting.")
            
    elif choice == "2":
        # Test different file types
        test_different_file_types()
        
    elif choice == "3":
        # Unicode text file test
        custom_path = f"{SAMPLE_CHATBOT_ID}/test_unicode_text.txt"
        custom_reference_id = str(uuid.uuid4())
        
        task_id = initiate_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=custom_path,
            reference_id=custom_reference_id
        )
        
        if task_id:
            print(f"Task ID: {task_id}")
            listen_to_task_stream(task_id)
        else:
            print("Could not obtain a task ID. Exiting.")

    elif choice == "4":
        # Custom file path
        custom_path = input("Enter file path in storage: ").strip()
        custom_reference_id = str(uuid.uuid4())
        
        task_id = initiate_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=custom_path,
            reference_id=custom_reference_id
        )
        
        if task_id:
            print(f"Task ID: {task_id}")
            listen_to_task_stream(task_id)
        else:
            print("Could not obtain a task ID. Exiting.")
            
    else:
        print("Invalid choice. Exiting.")

    print("\nTest Script Finished.")
