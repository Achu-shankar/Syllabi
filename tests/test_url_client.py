import requests
import json
import time
import uuid

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
URL_PROCESSING_ENDPOINT = f"{BASE_URL}/urls/"
TASKS_STREAM_URL_TEMPLATE = f"{BASE_URL}/tasks/{{task_identifier}}/status-stream"

# Sample data for the request
SAMPLE_USER_ID = "user_2s2mYAVPRsMO8K3Klt0lpTqkB0B"
SAMPLE_CHATBOT_ID = "1833ee55-b4b6-45b2-87e4-822dafc9d863"
SAMPLE_REFERENCE_ID = str(uuid.uuid4())

def initiate_url_processing(user_id: str, chatbot_id: str, url: str, reference_id: str) -> str | None:
    """
    Sends a request to initiate URL processing and returns the task_identifier.
    """
    payload = {
        "user_id": user_id,
        "chatbot_id": chatbot_id,
        "url": url,
        "reference_id": reference_id
    }
    print(f"Attempting to initiate URL processing with payload: {payload}")
    try:
        response = requests.post(URL_PROCESSING_ENDPOINT, json=payload, timeout=10)
        response.raise_for_status()

        if response.status_code == 202:  # Accepted
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"URL processing task initiated successfully. Task Identifier: {task_identifier}")
            print(f"Full task creation response: {response_data}")
            return task_identifier
        else:
            print(f"Error initiating URL processing task. Status: {response.status_code}, Response: {response.text}")
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
        with requests.get(stream_url, stream=True, timeout=300) as response:
            response.raise_for_status()
            print("Successfully connected to stream. Waiting for updates...\n" + "="*30)
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data:'):
                        try:
                            json_data_str = decoded_line[len('data:'):].strip()
                            if json_data_str:
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

def test_different_urls():
    """
    Test the URL processing pipeline with different types of URLs.
    """
    test_urls = [
        {
            "name": "Direct PDF Test",
            "url": "https://arxiv.org/pdf/2103.00020.pdf",
            "description": "Testing direct PDF URL processing"
        },
        {
            "name": "HTML to PDF Test", 
            "url": "https://en.wikipedia.org/wiki/Machine_learning",
            "description": "Testing HTML to PDF conversion"
        },
        {
            "name": "Simple Web Page Test",
            "url": "https://httpbin.org/html", 
            "description": "Testing simple HTML page conversion"
        }
    ]
    
    print("=== Testing Different URL Types ===\n")
    
    for test_url in test_urls:
        print(f"\n--- {test_url['name']} ---")
        print(f"Description: {test_url['description']}")
        print(f"URL: {test_url['url']}")
        
        # Generate unique reference ID for each test
        reference_id = str(uuid.uuid4())
        print(f"Reference ID: {reference_id}")
        
        # Initiate processing
        task_id = initiate_url_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            url=test_url['url'],
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
    print("Starting URL Processing Pipeline Test Script...")
    print(f"Base URL: {BASE_URL}")
    print(f"Sample User ID: {SAMPLE_USER_ID}")
    print(f"Sample Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print(f"Generated Reference ID: {SAMPLE_REFERENCE_ID}")
    print("="*50)

    # Ask user what type of test to run
    print("\nSelect test type:")
    print("1. Single URL test (simple HTML page)")
    print("2. Test different URL types (PDF, Wikipedia, Simple HTML)")
    print("3. Custom URL")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == "1":
        # Single URL test
        test_url = "https://httpbin.org/html"
        task_id = initiate_url_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            url=test_url,
            reference_id=SAMPLE_REFERENCE_ID
        )

        if task_id:
            print(f"Task ID: {task_id}")
            listen_to_task_stream(task_id)
        else:
            print("Could not obtain a task ID. Exiting.")
            
    elif choice == "2":
        # Test different URL types
        test_different_urls()
        
    elif choice == "3":
        # Custom URL
        custom_url = input("Enter URL to process: ").strip()
        custom_reference_id = str(uuid.uuid4())
        
        task_id = initiate_url_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            url=custom_url,
            reference_id=custom_reference_id
        )
        
        if task_id:
            print(f"Task ID: {task_id}")
            listen_to_task_stream(task_id)
        else:
            print("Could not obtain a task ID. Exiting.")
    else:
        print("Invalid choice. Exiting.")

    print("\nURL Processing Test Script Finished.") 