import requests
import json
import time
import uuid
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
MULTIMEDIA_PROCESSING_URL = f"{BASE_URL}/multimedia/"
MULTIMEDIA_INDEXING_URL = f"{BASE_URL}/multimedia/index"
TASKS_STREAM_URL_TEMPLATE = f"{BASE_URL}/tasks/{{task_identifier}}/status-stream"

# Sample data - Using same IDs as other test files
SAMPLE_USER_ID = "82c12328-a231-4a52-9abf-7da597292e9f"
SAMPLE_CHATBOT_ID = "5c198e49-ce34-4dd7-812b-c3f8df9818d6"

def process_multimedia_file(
    user_id: str, 
    chatbot_id: str, 
    file_path: str, 
    media_type: str,
    original_filename: Optional[str] = None
) -> tuple[Optional[str], Optional[str]]:
    """Process multimedia file and return task_id and reference_id."""
    reference_id = str(uuid.uuid4())
    
    payload = {
        "user_id": user_id,
        "file_path": file_path,
        "chatbot_id": chatbot_id,
        "reference_id": reference_id,
        "media_type": media_type,
        "original_filename": original_filename
    }
    
    print(f"\n🎬 STEP 1: Processing {media_type.upper()} File")
    print(f"File Path: {file_path}")
    print(f"Reference ID: {reference_id}")
    
    try:
        response = requests.post(MULTIMEDIA_PROCESSING_URL, json=payload, timeout=10)
        response.raise_for_status()

        if response.status_code == 202:
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"✅ Processing initiated. Task ID: {task_identifier}")
            return task_identifier, reference_id
        else:
            print(f"❌ Error: {response.status_code}, {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None, None

def index_multimedia_content(reference_id: str, user_id: str = SAMPLE_USER_ID, chatbot_id: str = SAMPLE_CHATBOT_ID) -> Optional[str]:
    """Index processed multimedia content and return task_id."""
    
    print(f"\n🔍 STEP 2: Indexing Multimedia Content")
    print(f"Reference ID: {reference_id}")
    
    # Prepare request payload matching MultimediaIndexingRequest schema
    payload = {
        "user_id": user_id,
        "reference_id": reference_id,
        "chatbot_id": chatbot_id
    }
    
    try:
        # Send proper JSON body instead of query parameters
        response = requests.post(
            MULTIMEDIA_INDEXING_URL, 
            json=payload,
            timeout=10
        )
        response.raise_for_status()

        if response.status_code == 202:
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"✅ Indexing initiated. Task ID: {task_identifier}")
            return task_identifier
        else:
            print(f"❌ Error: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def monitor_task(task_identifier: str, task_description: str, max_wait_time: int = 300) -> Dict[str, Any]:
    """Monitor a task until completion and return the final result."""
    sse_url = TASKS_STREAM_URL_TEMPLATE.format(task_identifier=task_identifier)
    print(f"\n📊 Monitoring {task_description}")
    print(f"Task ID: {task_identifier}")
    print("=" * 60)

    start_time = time.time()
    final_result = {"status": "TIMEOUT", "task_id": task_identifier}

    try:
        response = requests.get(sse_url, stream=True, timeout=max_wait_time)
        response.raise_for_status()
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                try:
                    json_data = line[6:]  # Remove "data: " prefix
                    task_data = json.loads(json_data)
                    status = task_data.get("status", "UNKNOWN")
                    progress = task_data.get("progress_percentage", 0)
                    description = task_data.get("current_step_description", "No description")
                    
                    # Show progress with timestamp
                    timestamp = time.strftime("%H:%M:%S")
                    print(f"[{timestamp}] {status:10} | {progress:3d}% | {description}")
                    
                    # Check if task is complete
                    if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                        final_result = {
                            "status": status,
                            "task_id": task_identifier,
                            "result_payload": task_data.get("result_payload", {}),
                            "error_details": task_data.get("error_details", None),
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
                        
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse SSE data: {e}")
                    
    except requests.exceptions.RequestException as e:
        print(f"❌ Error connecting to SSE stream: {e}")
        final_result["error"] = str(e)
    except KeyboardInterrupt:
        print(f"\n⏸️ Monitoring interrupted by user")
        final_result["status"] = "INTERRUPTED"
    
    print("=" * 60)
    return final_result

def test_complete_multimedia_pipeline():
    """Test the complete multimedia pipeline: processing + indexing."""
    test_files = [
        {
            "name": "Video Pipeline Test",
            "path": f"{SAMPLE_CHATBOT_ID}/sample_video.mp4",
            "media_type": "video",
            "filename": "sample_video.mp4"
        }
        # Temporarily removed audio test to focus on video
        # {
        #     "name": "Audio Pipeline Test", 
        #     "path": f"{SAMPLE_CHATBOT_ID}/sample_audio.mp3",
        #     "media_type": "audio",
        #     "filename": "sample_audio.mp3"
        # }
    ]
    
    print("🎬 === Complete Multimedia Pipeline Test (VIDEO ONLY) ===")
    print(f"User ID: {SAMPLE_USER_ID}")
    print(f"Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print("=" * 60)
    
    results = []
    
    for test_file in test_files:
        print(f"\n🚀 Testing: {test_file['name']}")
        print(f"File: {test_file['path']}")
        print(f"Type: {test_file['media_type']}")
        print(f"Start time: {time.strftime('%H:%M:%S')}")
        
        step_start_time = time.time()
        
        # Step 1: Process multimedia file
        processing_task_id, reference_id = process_multimedia_file(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=test_file['path'],
            media_type=test_file['media_type'],
            original_filename=test_file['filename']
        )
        
        if not processing_task_id or not reference_id:
            print("❌ Failed to initiate processing. Skipping this test.")
            results.append({
                "test_name": test_file['name'],
                "processing_result": {"status": "FAILED_TO_START"},
                "indexing_result": {"status": "SKIPPED"}
            })
            continue
        
        # Monitor processing task with detailed timing
        print(f"\n📊 Monitoring processing task... (Started at {time.strftime('%H:%M:%S')})")
        processing_result = monitor_task_with_timing(processing_task_id, "Multimedia Processing")
        
        if processing_result["status"] != "COMPLETED":
            print("❌ Processing failed. Skipping indexing step.")
            results.append({
                "test_name": test_file['name'],
                "processing_result": processing_result,
                "indexing_result": {"status": "SKIPPED"}
            })
            continue
        
        print(f"✅ Processing completed in {processing_result.get('duration', 0):.1f}s")
        if 'result_payload' in processing_result:
            metadata = processing_result['result_payload'].get('metadata', {})
            print(f"📋 File processed: {metadata.get('file_size_bytes', 0)} bytes, "
                  f"format: {metadata.get('format', 'unknown')}")
        
        # Step 2: Index the processed content with detailed monitoring
        indexing_start_time = time.time()
        print(f"\n🔍 Starting indexing at {time.strftime('%H:%M:%S')}")
        
        indexing_task_id = index_multimedia_content(reference_id)
        
        if not indexing_task_id:
            print("❌ Failed to initiate indexing.")
            results.append({
                "test_name": test_file['name'],
                "processing_result": processing_result,
                "indexing_result": {"status": "FAILED_TO_START"}
            })
            continue
        
        # Monitor indexing task with enhanced monitoring
        print(f"\n📊 Monitoring indexing task...")
        indexing_result = monitor_indexing_task_detailed(indexing_task_id, "Multimedia Indexing")
        
        results.append({
            "test_name": test_file['name'],
            "processing_result": processing_result,
            "indexing_result": indexing_result,
            "reference_id": reference_id,
            "total_time": time.time() - step_start_time
        })
        
        print(f"\n✅ Completed pipeline test for: {test_file['name']}")
        print(f"⏱️  Total time: {time.time() - step_start_time:.1f}s")
        print("=" * 60)
    
    # Print final summary
    print("\n📊 === PIPELINE TEST RESULTS ===")
    print("=" * 60)
    
    for result in results:
        test_name = result['test_name']
        processing_status = result['processing_result']['status']
        indexing_status = result['indexing_result']['status']
        
        print(f"🎬 {test_name}")
        print(f"   Processing: {processing_status}")
        print(f"   Indexing:   {indexing_status}")
        print(f"   Total Time: {result.get('total_time', 0):.1f}s")
        
        if 'reference_id' in result:
            print(f"   Reference:  {result['reference_id']}")
        
        # Show transcription details if available
        if indexing_status == "COMPLETED" and 'result_payload' in result['indexing_result']:
            payload = result['indexing_result']['result_payload']
            print(f"   Transcript: {payload.get('transcript_length', 0)} chars, "
                  f"{payload.get('transcript_duration', 0):.1f}s duration")
            print(f"   Chunks:     {payload.get('chunks_created', 0)}")
            print(f"   Model:      {payload.get('model_used', 'unknown')}")
        print()
    
    # Calculate success rate
    successful_pipelines = sum(1 for r in results 
                             if r['processing_result']['status'] == 'COMPLETED' 
                             and r['indexing_result']['status'] == 'COMPLETED')
    total_tests = len(results)
    
    print(f"🎯 Success Rate: {successful_pipelines}/{total_tests} complete pipelines")
    
    if successful_pipelines == total_tests:
        print("🎉 ALL MULTIMEDIA PIPELINES COMPLETED SUCCESSFULLY!")
        print("🎊 Your complete multimedia processing and indexing system is working!")
    elif successful_pipelines > 0:
        print("⚠️ Some pipelines completed successfully. Check failed ones above.")
    else:
        print("❌ No pipelines completed successfully. Check your setup.")
    
    print("=" * 60)

def monitor_task_with_timing(task_identifier: str, task_description: str, max_wait_time: int = 300) -> Dict[str, Any]:
    """Enhanced task monitoring with timing information."""
    return monitor_task(task_identifier, task_description, max_wait_time)

def monitor_indexing_task_detailed(task_identifier: str, task_description: str, max_wait_time: int = 600) -> Dict[str, Any]:
    """Enhanced monitoring for indexing tasks with step-by-step details."""
    sse_url = TASKS_STREAM_URL_TEMPLATE.format(task_identifier=task_identifier)
    print(f"\n📊 Monitoring {task_description}")
    print(f"Task ID: {task_identifier}")
    print("=" * 60)

    start_time = time.time()
    final_result = {"status": "TIMEOUT", "task_id": task_identifier}
    step_times = {}
    current_step = None

    try:
        response = requests.get(sse_url, stream=True, timeout=max_wait_time)
        response.raise_for_status()
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                try:
                    json_data = line[6:]  # Remove "data: " prefix
                    task_data = json.loads(json_data)
                    status = task_data.get("status", "UNKNOWN")
                    progress = task_data.get("progress_percentage", 0)
                    description = task_data.get("current_step_description", "No description")
                    
                    # Track step timing
                    if description != current_step:
                        if current_step:
                            step_times[current_step] = time.time() - step_start_time
                        current_step = description
                        step_start_time = time.time()
                    
                    # Show progress with timestamp
                    timestamp = time.strftime("%H:%M:%S")
                    print(f"[{timestamp}] {status:10} | {progress:3d}% | {description}")
                    
                    # Special handling for key steps
                    if description and "audio track" in description.lower():
                        print(f"    🎵 Audio extraction step detected")
                    elif description and "transcribing" in description.lower():
                        print(f"    🎤 Transcription step detected - this may take a while...")
                    elif description and "chunks" in description.lower():
                        print(f"    🧩 Chunking step detected")
                    elif description and "embeddings" in description.lower():
                        print(f"    🔗 Embedding generation step detected")
                    
                    # Check if task is complete
                    if status in ["COMPLETED", "FAILED", "CANCELLED"]:
                        if current_step:
                            step_times[current_step] = time.time() - step_start_time
                        
                        final_result = {
                            "status": status,
                            "task_id": task_identifier,
                            "result_payload": task_data.get("result_payload", {}),
                            "error_details": task_data.get("error_details", None),
                            "duration": time.time() - start_time,
                            "step_times": step_times
                        }
                        
                        if status == "COMPLETED":
                            print(f"✅ {task_description} COMPLETED in {final_result['duration']:.1f}s")
                            result = final_result['result_payload']
                            if result:
                                print(f"📋 Result Summary:")
                                print(f"   - Transcript: {result.get('transcript_length', 0)} characters")
                                print(f"   - Duration: {result.get('transcript_duration', 0):.1f} seconds")
                                print(f"   - Chunks: {result.get('chunks_created', 0)}")
                                print(f"   - Model: {result.get('model_used', 'unknown')}")
                                print(f"   - Content Type: {result.get('content_type', 'unknown')}")
                            
                            # Show step timing breakdown
                            print(f"⏱️  Step Timing Breakdown:")
                            for step, duration in step_times.items():
                                print(f"   - {step}: {duration:.1f}s")
                                
                        else:
                            print(f"❌ {task_description} {status}")
                            if final_result['error_details']:
                                print(f"💥 Error: {final_result['error_details']}")
                        break
                        
                except json.JSONDecodeError as e:
                    print(f"⚠️ Failed to parse SSE data: {e}")
                    
    except requests.exceptions.RequestException as e:
        print(f"❌ Error connecting to SSE stream: {e}")
        final_result["error"] = str(e)
    except KeyboardInterrupt:
        print(f"\n⏸️ Monitoring interrupted by user")
        final_result["status"] = "INTERRUPTED"
    
    print("=" * 60)
    return final_result

def main():
    """Run multimedia pipeline tests."""
    print("🚀 Starting Complete Multimedia Pipeline Test")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"User ID: {SAMPLE_USER_ID}")
    print(f"Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print("=" * 60)

    print("\nSelect test type:")
    print("1. Complete pipeline test (processing + indexing)")
    print("2. Indexing only (provide reference ID)")
    print("3. Custom file pipeline test")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == "1":
        test_complete_multimedia_pipeline()
        
    elif choice == "2":
        reference_id = input("Enter reference ID to index: ").strip()
        
        indexing_task_id = index_multimedia_content(reference_id)
        if indexing_task_id:
            monitor_task(indexing_task_id, "Multimedia Indexing")
        else:
            print("❌ Failed to initiate indexing.")
            
    elif choice == "3":
        file_path = input("Enter file path in storage: ").strip()
        media_type = input("Enter media type (video/audio): ").strip().lower()
        filename = input("Enter filename (optional): ").strip() or None
        
        if media_type not in ["video", "audio"]:
            print("❌ Invalid media type.")
            return
        
        # Process file
        processing_task_id, reference_id = process_multimedia_file(
            SAMPLE_USER_ID, SAMPLE_CHATBOT_ID, file_path, media_type, filename
        )
        
        if processing_task_id and reference_id:
            processing_result = monitor_task(processing_task_id, "Processing")
            
            if processing_result["status"] == "COMPLETED":
                # Index content
                indexing_task_id = index_multimedia_content(reference_id)
                if indexing_task_id:
                    monitor_task(indexing_task_id, "Indexing")
            else:
                print("❌ Processing failed. Cannot proceed to indexing.")
        else:
            print("❌ Failed to initiate processing.")
    else:
        print("❌ Invalid choice.")

    print("\n👋 Multimedia Pipeline Test Finished.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏸️ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
    finally:
        print("\n🎬 Multimedia Pipeline Test Completed") 