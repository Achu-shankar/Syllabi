import requests
import json
import time
import uuid
import tempfile
import os
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
DOCUMENTS_URL = f"{BASE_URL}/documents/initiate-processing"
URLS_URL = f"{BASE_URL}/urls/"
INDEXING_URL = f"{BASE_URL}/indexing/initiate-indexing"
TASKS_STREAM_URL_TEMPLATE = f"{BASE_URL}/tasks/{{task_identifier}}/status-stream"

# Sample data - Update these with your actual IDs
SAMPLE_USER_ID = "82c12328-a231-4a52-9abf-7da597292e9f"  # Update with your user UUID
SAMPLE_CHATBOT_ID = "1833ee55-b4b6-45b2-87e4-822dafc9d863"  # Update with your chatbot ID
SAMPLE_URL = "https://arxiv.org/abs/2106.09685"  # Example: ArXiv paper PDF
# SAMPLE_URL = "https://docs.python.org/3/tutorial/introduction.html"  # Example: HTML page

# Sample markdown content for testing
SAMPLE_MARKDOWN_CONTENT = """# Test Document

## Introduction

This is a **test markdown document** for testing the full pipeline functionality.

### Key Features

1. **Document Processing**: Converts MD to PDF
2. **URL Processing**: Fetches and converts URLs to PDF
3. **Document Indexing**: Parses, chunks, and embeds content

### Code Example

```python
def test_function():
    print("Hello, World!")
    return "success"
```

### Mathematical Formula

The quadratic formula is: ax² + bx + c = 0

### Conclusion

This document contains various types of content including:
- Headers and subheaders
- Bold and italic text
- Code blocks
- Lists and bullet points
- Mathematical expressions

This should provide good test data for the chunking and embedding process.

## Additional Section

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Final Notes

This completes our test markdown document. It should be sufficient for testing the complete pipeline functionality.
"""

def create_temp_markdown_file() -> str:
    """Create a temporary markdown file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        f.write(SAMPLE_MARKDOWN_CONTENT)
        return f.name

def upload_file_to_storage(file_path: str) -> Optional[str]:
    """
    Upload file to Supabase storage and return the storage path.
    This simulates the file upload process.
    """
    # For this test, we'll use a simulated storage path
    # In a real scenario, this would upload to Supabase storage
    filename = os.path.basename(file_path)
    storage_path = f"test-documents/{uuid.uuid4()}/{filename}"
    print(f"Simulated upload: {filename} -> {storage_path}")
    return storage_path

def process_document(user_id: str, chatbot_id: str, file_path: str) -> Optional[str]:
    """Process a document and return the task identifier."""
    # In real implementation, you'd upload to storage first
    storage_path = upload_file_to_storage(file_path)
    reference_id = str(uuid.uuid4())
    
    payload = {
        "user_id": user_id,
        "chatbot_id": chatbot_id,
        "file_path_in_storage": storage_path,
        "reference_id": reference_id
    }
    
    print(f"\n📄 Processing Document")
    print(f"File: {os.path.basename(file_path)}")
    print(f"Reference ID: {reference_id}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(DOCUMENTS_URL, json=payload, timeout=10)
        response.raise_for_status()
        
        if response.status_code == 202:
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"✅ Document processing initiated. Task ID: {task_identifier}")
            return task_identifier, reference_id
        else:
            print(f"❌ Error processing document. Status: {response.status_code}, Response: {response.text}")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None, None

def process_url(user_id: str, chatbot_id: str, url: str) -> Optional[str]:
    """Process a URL and return the task identifier and reference ID."""
    reference_id = str(uuid.uuid4())
    
    payload = {
        "user_id": user_id,
        "url": url,
        "chatbot_id": chatbot_id,
        "reference_id": reference_id
    }
    
    print(f"\n🌐 Processing URL")
    print(f"URL: {url}")
    print(f"Reference ID: {reference_id}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(URLS_URL, json=payload, timeout=10)
        response.raise_for_status()
        
        if response.status_code == 202:
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"✅ URL processing initiated. Task ID: {task_identifier}")
            return task_identifier, reference_id
        else:
            print(f"❌ Error processing URL. Status: {response.status_code}, Response: {response.text}")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None, None

def index_document(user_id: str, chatbot_id: str, reference_id: str, content_type: str) -> Optional[str]:
    """Index a processed document and return the task identifier."""
    payload = {
        "user_id": user_id,
        "chatbot_id": chatbot_id,
        "reference_id": reference_id
    }
    
    print(f"\n🔍 Indexing {content_type}")
    print(f"Reference ID: {reference_id}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(INDEXING_URL, json=payload, timeout=10)
        response.raise_for_status()
        
        if response.status_code == 202:
            response_data = response.json()
            task_identifier = response_data.get("task_identifier")
            print(f"✅ Indexing initiated. Task ID: {task_identifier}")
            return task_identifier
        else:
            print(f"❌ Error initiating indexing. Status: {response.status_code}, Response: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def monitor_task(task_identifier: str, task_description: str, max_wait_time: int = 300) -> Dict[str, Any]:
    """Monitor a task until completion and return the final result."""
    sse_url = TASKS_STREAM_URL_TEMPLATE.format(task_identifier=task_identifier)
    print(f"\n📊 Monitoring {task_description}")
    print(f"Task ID: {task_identifier}")
    print(f"Stream URL: {sse_url}")
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
                    print(f"[{timestamp}] {status} | {progress:3d}% | {description}")
                    
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

def cleanup_temp_file(file_path: str):
    """Clean up temporary file."""
    try:
        os.unlink(file_path)
        print(f"🧹 Cleaned up temporary file: {os.path.basename(file_path)}")
    except Exception as e:
        print(f"⚠️ Failed to cleanup {file_path}: {e}")

def main():
    """Run the complete pipeline test."""
    print("🚀 Starting Full Pipeline Test")
    print("=" * 60)
    print(f"User ID: {SAMPLE_USER_ID}")
    print(f"Chatbot ID: {SAMPLE_CHATBOT_ID}")
    print(f"Test URL: {SAMPLE_URL}")
    print("=" * 60)
    
    # Results tracking
    results = {
        "document_processing": None,
        "url_processing": None,
        "document_indexing": None,
        "url_indexing": None
    }
    
    # Step 1: Process Markdown Document
    print("\n🔥 PHASE 1: DOCUMENT PROCESSING")
    temp_md_file = create_temp_markdown_file()
    print(f"📝 Created temporary markdown file: {temp_md_file}")
    
    try:
        doc_task_id, doc_reference_id = process_document(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            file_path=temp_md_file
        )
        
        if doc_task_id:
            results["document_processing"] = monitor_task(doc_task_id, "Document Processing")
        
    finally:
        cleanup_temp_file(temp_md_file)
    
    # Step 2: Process URL
    print("\n\n🔥 PHASE 2: URL PROCESSING")
    url_task_id, url_reference_id = process_url(
        user_id=SAMPLE_USER_ID,
        chatbot_id=SAMPLE_CHATBOT_ID,
        url=SAMPLE_URL
    )
    
    if url_task_id:
        results["url_processing"] = monitor_task(url_task_id, "URL Processing")
    
    # Step 3: Index Document (if processing was successful)
    if (results["document_processing"] and 
        results["document_processing"]["status"] == "COMPLETED" and 
        doc_reference_id):
        print("\n\n🔥 PHASE 3: DOCUMENT INDEXING")
        doc_index_task_id = index_document(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            reference_id=doc_reference_id,
            content_type="Document"
        )
        
        if doc_index_task_id:
            results["document_indexing"] = monitor_task(doc_index_task_id, "Document Indexing")
    else:
        print("\n⏭️ Skipping document indexing (processing failed or no reference ID)")
    
    # Step 4: Index URL (if processing was successful)
    if (results["url_processing"] and 
        results["url_processing"]["status"] == "COMPLETED" and 
        url_reference_id):
        print("\n\n🔥 PHASE 4: URL INDEXING")
        url_index_task_id = index_document(
            user_id=SAMPLE_USER_ID,
            chatbot_id=SAMPLE_CHATBOT_ID,
            reference_id=url_reference_id,
            content_type="URL"
        )
        
        if url_index_task_id:
            results["url_indexing"] = monitor_task(url_index_task_id, "URL Indexing")
    else:
        print("\n⏭️ Skipping URL indexing (processing failed or no reference ID)")
    
    # Final Summary
    print("\n\n" + "=" * 60)
    print("📊 FINAL RESULTS SUMMARY")
    print("=" * 60)
    
    for phase, result in results.items():
        phase_name = phase.replace("_", " ").title()
        if result:
            status = result["status"]
            duration = result.get("duration", 0)
            if status == "COMPLETED":
                print(f"✅ {phase_name:20} | {status:10} | {duration:6.1f}s")
            else:
                print(f"❌ {phase_name:20} | {status:10} | {duration:6.1f}s")
        else:
            print(f"⏭️ {phase_name:20} | SKIPPED   |      -")
    
    # Check overall success
    successful_phases = sum(1 for r in results.values() if r and r["status"] == "COMPLETED")
    total_phases = len([r for r in results.values() if r is not None])
    
    print(f"\n🎯 Overall Success Rate: {successful_phases}/{total_phases} phases completed")
    
    if successful_phases == total_phases and total_phases > 0:
        print("🎉 ALL PHASES COMPLETED SUCCESSFULLY!")
        print("🎊 Your complete pipeline is working perfectly!")
    elif successful_phases > 0:
        print("⚠️ Some phases completed successfully, check failed phases above.")
    else:
        print("❌ No phases completed successfully. Check your setup.")
    
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏸️ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
    finally:
        print("\n👋 Full Pipeline Test Completed") 