#!/usr/bin/env python3
"""
Test script for multimedia transcription service integration.
Tests the complete pipeline from audio extraction to transcription.
"""

import os
import sys
import json
import time
import requests
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
CHATBOT_ID = "5c198e49-ce34-4dd7-812b-c3f8df9818d6"

# Test files (you can modify these paths)
TEST_FILES = {
    "audio": {
        "path": "test_audio.mp3",
        "url": "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",  # Small test audio
        "description": "Small audio file for testing"
    },
    "video": {
        "path": "test_video.mp4", 
        "url": "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",  # Small test video
        "description": "Small video file for testing"
    }
}

def download_test_file(file_info):
    """Download test file if it doesn't exist."""
    file_path = file_info["path"]
    if os.path.exists(file_path):
        print(f"✓ Test file already exists: {file_path}")
        return file_path
    
    print(f"📥 Downloading test file: {file_info['description']}")
    try:
        response = requests.get(file_info["url"], stream=True)
        response.raise_for_status()
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✓ Downloaded: {file_path} ({os.path.getsize(file_path)} bytes)")
        return file_path
    except Exception as e:
        print(f"❌ Failed to download {file_path}: {e}")
        return None

def upload_multimedia_file(file_path, content_type):
    """Upload multimedia file for processing."""
    print(f"\n🚀 Starting multimedia processing for: {file_path}")
    
    url = f"{BASE_URL}/api/v1/multimedia"
    
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, content_type)}
        data = {'chatbot_id': CHATBOT_ID}
        
        response = requests.post(url, files=files, data=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Upload successful!")
        print(f"   Task ID: {result['task_id']}")
        print(f"   Reference ID: {result['reference_id']}")
        return result
    else:
        print(f"❌ Upload failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def trigger_indexing(reference_id):
    """Trigger multimedia indexing."""
    print(f"\n🔄 Starting indexing for reference: {reference_id}")
    
    url = f"{BASE_URL}/api/v1/multimedia/index"
    params = {'reference_id': reference_id}
    
    response = requests.post(url, params=params)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Indexing started!")
        print(f"   Task ID: {result['task_id']}")
        return result['task_id']
    else:
        print(f"❌ Indexing failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def check_task_status(task_id):
    """Check task status."""
    url = f"{BASE_URL}/api/v1/tasks/{task_id}"
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"❌ Failed to get task status: {response.status_code}")
        return None

def monitor_task(task_id, task_type="processing"):
    """Monitor task progress until completion."""
    print(f"\n⏳ Monitoring {task_type} task: {task_id}")
    
    start_time = time.time()
    last_progress = -1
    
    while True:
        task_status = check_task_status(task_id)
        if not task_status:
            break
        
        status = task_status.get('status', 'unknown')
        progress = task_status.get('progress_percentage', 0)
        description = task_status.get('current_step_description', 'Processing...')
        
        # Show progress updates
        if progress != last_progress:
            print(f"   📊 {progress}% - {description}")
            last_progress = progress
        
        if status == 'COMPLETED':
            elapsed = time.time() - start_time
            print(f"✅ Task completed in {elapsed:.1f}s")
            
            # Show result details
            result = task_status.get('result_payload', {})
            if result:
                print(f"   📋 Result Summary:")
                for key, value in result.items():
                    print(f"      {key}: {value}")
            
            return task_status
        elif status == 'FAILED':
            print(f"❌ Task failed: {task_status.get('error_details', 'Unknown error')}")
            return task_status
        elif status in ['PENDING', 'PROCESSING']:
            time.sleep(2)  # Wait 2 seconds before checking again
        else:
            print(f"⚠️  Unknown status: {status}")
            time.sleep(2)

def test_multimedia_transcription():
    """Test complete multimedia transcription pipeline."""
    print("🎵 Testing Multimedia Transcription Pipeline")
    print("=" * 50)
    
    # Test both audio and video files
    for media_type, file_info in TEST_FILES.items():
        print(f"\n📁 Testing {media_type.upper()} file:")
        print(f"   Description: {file_info['description']}")
        
        # Download test file
        file_path = download_test_file(file_info)
        if not file_path:
            continue
        
        # Determine content type
        content_type = "audio/mpeg" if media_type == "audio" else "video/mp4"
        
        # Step 1: Upload and process multimedia file
        upload_result = upload_multimedia_file(file_path, content_type)
        if not upload_result:
            continue
        
        processing_task_id = upload_result['task_id']
        reference_id = upload_result['reference_id']
        
        # Step 2: Monitor processing task
        processing_result = monitor_task(processing_task_id, "processing")
        if not processing_result or processing_result.get('status') != 'COMPLETED':
            print(f"❌ Processing failed for {media_type}")
            continue
        
        # Step 3: Trigger indexing (transcription)
        indexing_task_id = trigger_indexing(reference_id)
        if not indexing_task_id:
            continue
        
        # Step 4: Monitor indexing task (this includes transcription)
        indexing_result = monitor_task(indexing_task_id, "indexing/transcription")
        
        if indexing_result and indexing_result.get('status') == 'COMPLETED':
            print(f"🎉 {media_type.upper()} transcription pipeline completed successfully!")
            
            # Show transcription details
            result = indexing_result.get('result_payload', {})
            if result:
                print(f"   📝 Transcription Summary:")
                print(f"      Model used: {result.get('model_used', 'unknown')}")
                print(f"      Duration: {result.get('transcript_duration', 0):.2f}s")
                print(f"      Transcript length: {result.get('transcript_length', 0)} characters")
                print(f"      Chunks created: {result.get('chunks_created', 0)}")
        else:
            print(f"❌ {media_type.upper()} transcription pipeline failed")
        
        print("-" * 30)

def main():
    """Main test function."""
    print("🧪 Multimedia Transcription Service Test")
    print("=" * 50)
    print(f"Base URL: {BASE_URL}")
    print(f"Chatbot ID: {CHATBOT_ID}")
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print(f"⚠️  Server responded with status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to server: {e}")
        print("   Make sure the FastAPI server is running on localhost:8000")
        return
    
    # Run transcription tests
    test_multimedia_transcription()
    
    print("\n🏁 Test completed!")
    print("\nNote: This test requires:")
    print("- OpenAI API key configured in your environment")
    print("- FFmpeg installed (for video processing)")
    print("- Celery worker running")

if __name__ == "__main__":
    main() 