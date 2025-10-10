import requests
import json
import time
import uuid
import tempfile
import os
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
MULTIMEDIA_URL = f"{BASE_URL}/multimedia/"
TASKS_STREAM_URL_TEMPLATE = f"{BASE_URL}/tasks/{{task_identifier}}/status-stream"

# Sample data - Using same IDs as other test files
SAMPLE_USER_ID = "82c12328-a231-4a52-9abf-7da597292e9f"
SAMPLE_CHATBOT_ID = "5c198e49-ce34-4dd7-812b-c3f8df9818d6"

# Sample multimedia files for testing (these should exist in your Supabase storage)
SAMPLE_VIDEO_PATH = f"{SAMPLE_CHATBOT_ID}/sample_video.mp4"
SAMPLE_AUDIO_PATH = f"{SAMPLE_CHATBOT_ID}/sample_audio.mp3"

def initiate_multimedia_processing(
    user_id: str, 
    chatbot_id: str, 
    file_path: str, 
    media_type: str,
    original_filename: Optional[str] = None
) -> tuple[Optional[str], Optional[str]]:
    """
    Sends a request to initiate multimedia processing and returns the task_identifier and reference_id.
    """
    reference_id = str(uuid.uuid4())
    
    payload = {
        "user_id": user_id,
        "file_path": file_path,
        "chatbot_id": chatbot_id,
        "reference_id": reference_id,
        "media_type": media_type,
        "original_filename": original_filename
    }
    
    print(f"\n🎬 Processing {media_type.upper()} File")
    print(f"File Path: {file_path}")
    print(f"Reference ID: {reference_id}")
    print(f"Original Filename: {original_filename}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(MULTIMEDIA_URL, json=payload, timeout=10)
        response.raise_for_status()

        if response.status_code == 202:  # Accepted
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"✅ Multimedia processing initiated. Task ID: {task_identifier}")
            print(f"📋 Full response: {json.dumps(response_data, indent=2)}")
            return task_identifier, reference_id
        else:
            print(f"❌ Error initiating multimedia processing. Status: {response.status_code}, Response: {response.text}")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None, None
    except json.JSONDecodeError as e:
        print(f"❌ Failed to decode JSON response: {e}. Response text: {response.text if 'response' in locals() else 'N/A'}")
        return None, None

def listen_to_task_stream(task_identifier: str, task_description: str = "Multimedia Processing"):
    """
    Listens to the SSE stream for a given task_identifier and prints updates.
    """
    if not task_identifier:
        print("No task identifier provided. Cannot listen to stream.")
        return None

    stream_url = TASKS_STREAM_URL_TEMPLATE.format(task_identifier=task_identifier)
    print(f"\n📊 Monitoring {task_description}")
    print(f"Task ID: {task_identifier}")
    print(f"Stream URL: {stream_url}")
    print("=" * 60)

    start_time = time.time()
    final_result = {"status": "TIMEOUT", "task_id": task_identifier}

    try:
        with requests.get(stream_url, stream=True, timeout=300) as response:
            response.raise_for_status()
            print("✅ Successfully connected to stream. Waiting for updates...")
            print("-" * 60)
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data:'):
                        try:
                            json_data_str = decoded_line[len('data:'):].strip()
                            if json_data_str:
                                data = json.loads(json_data_str)
                                status = data.get("status", "UNKNOWN")
                                progress = data.get("progress_percentage", 0)
                                description = data.get("current_step_description", "No description")
                                
                                # Show progress with timestamp
                                timestamp = time.strftime("%H:%M:%S")
                                print(f"[{timestamp}] {status:10} | {progress:3d}% | {description}")
                                
                                # Check for terminal states
                                if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                                    final_result = {
                                        "status": status,
                                        "task_id": task_identifier,
                                        "result_payload": data.get("result_payload", {}),
                                        "error_details": data.get("error_details", None),
                                        "duration": time.time() - start_time
                                    }
                                    
                                    if status == "COMPLETED":
                                        print(f"✅ {task_description} COMPLETED in {final_result['duration']:.1f}s")
                                        result = final_result['result_payload']
                                        if result:
                                            print(f"📋 Result: {json.dumps(result, indent=2)}")
                                    else:
                                        print(f"❌ {task_description} {status}")
                                        if final_result['error_details']:
                                            print(f"💥 Error: {final_result['error_details']}")
                                    break
                            else:
                                print(f"⚠️ Received empty data line: {decoded_line}")

                        except json.JSONDecodeError as e:
                            print(f"⚠️ Error decoding JSON from SSE event: {e}")
                            print(f"Problematic line: {decoded_line}")
                        except Exception as e:
                            print(f"⚠️ Unexpected error processing SSE event: {e}")
                            print(f"Problematic line: {decoded_line}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Error connecting to or streaming from SSE endpoint: {e}")
        final_result["error"] = str(e)
    except Exception as e:
        print(f"❌ Unexpected error during SSE streaming: {e}")
        final_result["error"] = str(e)
    finally:
        print("=" * 60)
        print(f"📊 {task_description} monitoring finished.")
    
    return final_result

def test_different_multimedia_types():
    """
    Test the multimedia processing pipeline with different file types.
    """
    test_files = [
        {
            "name": "Video MP4 Test",
            "path": f"{SAMPLE_CHATBOT_ID}/sample_video.mp4",
            "media_type": "video",
            "filename": "sample_lecture.mp4",
            "description": "Testing MP4 video processing and metadata extraction"
        },
        {
            "name": "Audio MP3 Test", 
            "path": f"{SAMPLE_CHATBOT_ID}/sample_audio.mp3",
            "media_type": "audio",
            "filename": "sample_podcast.mp3",
            "description": "Testing MP3 audio processing and metadata extraction"
        },
        {
            "name": "Video AVI Test",
            "path": f"{SAMPLE_CHATBOT_ID}/sample_video.avi", 
            "media_type": "video",
            "filename": "sample_presentation.avi",
            "description": "Testing AVI video processing"
        },
        {
            "name": "Audio WAV Test",
            "path": f"{SAMPLE_CHATBOT_ID}/sample_audio.wav",
            "media_type": "audio", 
            "filename": "sample_recording.wav",
            "description": "Testing WAV audio processing"
        }
    ]
    
    print("🎬 === Testing Different Multimedia Types ===")
    print(f"User ID: {SAMPLE_USER_ID}")
    print(f"Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print("=" * 60)
    
    results = []
    
    for test_file in test_files:
        print(f"\n--- {test_file['name']} ---")
        print(f"Description: {test_file['description']}")
        print(f"File path: {test_file['path']}")
        print(f"Media type: {test_file['media_type']}")
        print(f"Filename: {test_file['filename']}")
        
        # Initiate processing
        task_id, reference_id = initiate_multimedia_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=test_file['path'],
            media_type=test_file['media_type'],
            original_filename=test_file['filename']
        )
        
        if task_id:
            print(f"✅ Task initiated: {task_id}")
            user_input = input("Monitor this task? (y/n/q to quit): ").lower().strip()
            
            if user_input == 'q':
                print("🛑 Quitting test suite...")
                break
            elif user_input == 'y':
                result = listen_to_task_stream(task_id, f"{test_file['name']} Processing")
                results.append({
                    "test_name": test_file['name'],
                    "task_id": task_id,
                    "reference_id": reference_id,
                    "result": result
                })
            else:
                print("⏭️ Skipping monitoring for this task")
                results.append({
                    "test_name": test_file['name'],
                    "task_id": task_id,
                    "reference_id": reference_id,
                    "result": {"status": "SKIPPED"}
                })
        else:
            print("❌ Failed to initiate task")
            results.append({
                "test_name": test_file['name'],
                "task_id": None,
                "reference_id": None,
                "result": {"status": "FAILED_TO_START"}
            })
        
        print("\n" + "=" * 60)
    
    # Print summary
    print("\n📊 === TEST RESULTS SUMMARY ===")
    print("=" * 60)
    
    for result in results:
        test_name = result['test_name']
        status = result['result']['status']
        task_id = result['task_id']
        
        if status == "COMPLETED":
            print(f"✅ {test_name:25} | {status:10} | Task: {task_id}")
        elif status == "FAILED":
            print(f"❌ {test_name:25} | {status:10} | Task: {task_id}")
        elif status == "SKIPPED":
            print(f"⏭️ {test_name:25} | {status:10} | Task: {task_id}")
        else:
            print(f"⚠️ {test_name:25} | {status:10} | Task: {task_id}")
    
    successful_tests = sum(1 for r in results if r['result']['status'] == 'COMPLETED')
    total_tests = len([r for r in results if r['result']['status'] != 'SKIPPED'])
    
    print(f"\n🎯 Success Rate: {successful_tests}/{total_tests} tests completed successfully")
    print("=" * 60)

def main():
    """Run the multimedia processing test."""
    print("🚀 Starting Multimedia Processing Test")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"User ID: {SAMPLE_USER_ID}")
    print(f"Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print("=" * 60)

    # Ask user what type of test to run
    print("\nSelect test type:")
    print("1. Single video test (MP4)")
    print("2. Single audio test (MP3)")
    print("3. Test different multimedia types (MP4, MP3, AVI, WAV)")
    print("4. Custom file path")
    
    choice = input("Enter choice (1-4): ").strip()
    
    if choice == "1":
        # Single video test
        task_id, reference_id = initiate_multimedia_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=SAMPLE_VIDEO_PATH,
            media_type="video",
            original_filename="test_video.mp4"
        )

        if task_id:
            print(f"✅ Task ID: {task_id}")
            print(f"📋 Reference ID: {reference_id}")
            listen_to_task_stream(task_id, "Video Processing")
        else:
            print("❌ Could not obtain a task ID. Exiting.")
            
    elif choice == "2":
        # Single audio test
        task_id, reference_id = initiate_multimedia_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=SAMPLE_AUDIO_PATH,
            media_type="audio",
            original_filename="test_audio.mp3"
        )

        if task_id:
            print(f"✅ Task ID: {task_id}")
            print(f"📋 Reference ID: {reference_id}")
            listen_to_task_stream(task_id, "Audio Processing")
        else:
            print("❌ Could not obtain a task ID. Exiting.")
        
    elif choice == "3":
        # Test different multimedia types
        test_different_multimedia_types()
        
    elif choice == "4":
        # Custom file path
        custom_path = input("Enter file path in storage: ").strip()
        media_type = input("Enter media type (video/audio): ").strip().lower()
        
        if media_type not in ["video", "audio"]:
            print("❌ Invalid media type. Must be 'video' or 'audio'.")
            return
            
        custom_filename = input("Enter original filename (optional): ").strip() or None
        
        task_id, reference_id = initiate_multimedia_processing(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=custom_path,
            media_type=media_type,
            original_filename=custom_filename
        )
        
        if task_id:
            print(f"✅ Task ID: {task_id}")
            print(f"📋 Reference ID: {reference_id}")
            listen_to_task_stream(task_id, f"Custom {media_type.title()} Processing")
        else:
            print("❌ Could not obtain a task ID. Exiting.")
            
    else:
        print("❌ Invalid choice. Exiting.")

    print("\n👋 Multimedia Processing Test Finished.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏸️ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
    finally:
        print("\n🎬 Multimedia Test Script Completed") 