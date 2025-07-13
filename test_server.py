#!/usr/bin/env python3
"""
Skills Test Server - FastAPI server for comprehensive skills testing
Run with: python test_server.py
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
import time
import json
from typing import Optional
import uvicorn

app = FastAPI(title="Skills Test Server", version="1.0.0", description="Test server for Syllabi Skills integration")

# Test models
class CalculationRequest(BaseModel):
    operation: str
    a: float
    b: float

class DataRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

class UserRequest(BaseModel):
    name: str
    email: str
    age: Optional[int] = None

# ===== BASIC ENDPOINTS =====

@app.get("/")
async def root():
    return {"message": "Skills Test Server is running!", "endpoints": [
        "/calculate", "/secure-data", "/api-key-data", "/slow", "/error", 
        "/large-data", "/search", "/user-data", "/health"
    ]}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}

# ===== CALCULATION API (POST with JSON body) =====

@app.post("/calculate")
async def calculate(request: CalculationRequest):
    """Test POST requests with JSON body validation"""
    operations = {
        "add": request.a + request.b,
        "subtract": request.a - request.b,
        "multiply": request.a * request.b,
        "divide": request.a / request.b if request.b != 0 else None
    }
    
    if request.operation not in operations:
        raise HTTPException(status_code=400, detail=f"Invalid operation. Supported: {list(operations.keys())}")
    
    result = operations[request.operation]
    if result is None:
        raise HTTPException(status_code=400, detail="Division by zero")
    
    return {
        "operation": request.operation,
        "operand_a": request.a,
        "operand_b": request.b,
        "result": result,
        "timestamp": time.time(),
        "message": f"Successfully calculated {request.a} {request.operation} {request.b} = {result}"
    }

# ===== AUTHENTICATION ENDPOINTS =====

@app.get("/secure-data")
async def secure_data(authorization: str = Header(...)):
    """Test Bearer token authentication"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format. Use 'Bearer <token>'")
    
    token = authorization.split("Bearer ")[1]
    if token != "test-secret-token":
        raise HTTPException(status_code=403, detail="Invalid token. Use 'test-secret-token'")
    
    return {
        "message": "Access granted to secure data",
        "data": ["confidential_item_1", "confidential_item_2", "confidential_item_3"],
        "user_level": "premium",
        "access_time": time.time()
    }

@app.get("/api-key-data")
async def api_key_data(x_api_key: str = Header(..., alias="X-API-Key")):
    """Test API key authentication"""
    if x_api_key != "my-secret-api-key":
        raise HTTPException(status_code=403, detail="Invalid API key. Use 'my-secret-api-key'")
    
    return {
        "status": "success",
        "api_version": "v1.0",
        "rate_limit_remaining": 99,
        "data": {"message": "API key authentication successful"},
        "timestamp": time.time()
    }

# ===== ERROR TESTING ENDPOINTS =====

@app.get("/error")
async def error_endpoint(code: int = 500):
    """Test different HTTP error codes"""
    error_messages = {
        400: "Bad request - invalid parameters",
        401: "Unauthorized - authentication required",
        403: "Forbidden - access denied",
        404: "Not found - resource does not exist",
        500: "Internal server error - something went wrong",
        503: "Service unavailable - server is temporarily down"
    }
    
    if code == 200:
        return {"message": "No error", "status": "success"}
    
    message = error_messages.get(code, "Unknown error code")
    raise HTTPException(status_code=code, detail=message)

@app.get("/slow")
async def slow_endpoint(delay: int = 5):
    """Test timeout handling"""
    if delay > 30:
        raise HTTPException(status_code=400, detail="Delay too long (max 30 seconds)")
    
    time.sleep(delay)
    return {
        "message": f"Response completed after {delay} seconds",
        "delay": delay,
        "timestamp": time.time()
    }

# ===== DATA ENDPOINTS =====

@app.get("/large-data")
async def large_data(size: int = 1000):
    """Test large response handling"""
    if size > 10000:
        raise HTTPException(status_code=400, detail="Size too large (max 10000)")
    
    return {
        "data": [f"item_{i}" for i in range(size)],
        "metadata": {
            "total_items": size,
            "generated_at": time.time(),
            "size_category": "small" if size < 100 else "medium" if size < 1000 else "large"
        }
    }

@app.get("/search")
async def search(q: str, limit: int = 10, category: str = "general"):
    """Test query parameters"""
    results = []
    for i in range(1, limit + 1):
        results.append({
            "id": i,
            "title": f"Result {i} for '{q}'",
            "description": f"This is search result {i} matching your query '{q}' in category '{category}'",
            "relevance": round(1.0 - (i * 0.1), 2),
            "category": category
        })
    
    return {
        "query": q,
        "results": results,
        "category": category,
        "total_found": limit * 10,  # Simulated total
        "search_time_ms": 150,
        "timestamp": time.time()
    }

@app.post("/user-data")
async def create_user(user: UserRequest):
    """Test POST with complex data validation"""
    # Validate email format
    if "@" not in user.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate age if provided
    if user.age is not None and (user.age < 0 or user.age > 150):
        raise HTTPException(status_code=400, detail="Invalid age (must be 0-150)")
    
    return {
        "message": f"User {user.name} created successfully",
        "user": {
            "name": user.name,
            "email": user.email,
            "age": user.age,
            "id": f"user_{int(time.time())}",
            "created_at": time.time()
        },
        "status": "created"
    }

# ===== UTILITY ENDPOINTS =====

@app.get("/echo")
async def echo(message: str = "Hello, World!"):
    """Simple echo endpoint for basic testing"""
    return {
        "original": message,
        "echoed": message,
        "length": len(message),
        "timestamp": time.time()
    }

@app.get("/enum-test")
async def enum_test(
    priority: str = "medium",
    category: str = "general", 
    status: str = "active"
):
    """Test enum parameter handling"""
    # Validate enum values
    valid_priorities = ["low", "medium", "high", "urgent"]
    valid_categories = ["general", "technical", "business", "personal"]
    valid_statuses = ["active", "inactive", "pending", "completed"]
    
    errors = []
    if priority not in valid_priorities:
        errors.append(f"Invalid priority. Must be one of: {valid_priorities}")
    if category not in valid_categories:
        errors.append(f"Invalid category. Must be one of: {valid_categories}")
    if status not in valid_statuses:
        errors.append(f"Invalid status. Must be one of: {valid_statuses}")
    
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    
    return {
        "message": "Enum parameters validated successfully",
        "parameters": {
            "priority": priority,
            "category": category,
            "status": status
        },
        "validation": {
            "priority_level": ["low", "medium", "high", "urgent"].index(priority) + 1,
            "category_type": category,
            "is_active": status == "active"
        },
        "timestamp": time.time()
    }

@app.post("/task-manager")
async def task_manager(task_data: dict):
    """Comprehensive task manager with multiple enum validations"""
    
    # Define valid enum values
    valid_priorities = ["low", "medium", "high", "urgent", "critical"]
    valid_categories = ["work", "personal", "health", "education", "finance", "shopping", "travel"]
    valid_statuses = ["todo", "in_progress", "review", "blocked", "completed", "cancelled"]
    valid_departments = ["engineering", "marketing", "sales", "hr", "finance", "operations"]
    
    # Required fields
    required_fields = ["task_title", "priority", "category", "status"]
    
    # Validation
    errors = []
    
    # Check required fields
    for field in required_fields:
        if field not in task_data or not task_data[field]:
            errors.append(f"Missing required field: {field}")
    
    # Validate enum values
    if "priority" in task_data and task_data["priority"] not in valid_priorities:
        errors.append(f"Invalid priority. Must be one of: {valid_priorities}")
    
    if "category" in task_data and task_data["category"] not in valid_categories:
        errors.append(f"Invalid category. Must be one of: {valid_categories}")
        
    if "status" in task_data and task_data["status"] not in valid_statuses:
        errors.append(f"Invalid status. Must be one of: {valid_statuses}")
        
    if "department" in task_data and task_data["department"] not in valid_departments:
        errors.append(f"Invalid department. Must be one of: {valid_departments}")
    
    # Validate numeric fields
    if "estimated_hours" in task_data:
        try:
            hours = float(task_data["estimated_hours"])
            if hours < 0:
                errors.append("Estimated hours must be positive")
        except (ValueError, TypeError):
            errors.append("Estimated hours must be a valid number")
    
    # Validate email format (basic)
    if "assignee_email" in task_data and task_data["assignee_email"]:
        email = task_data["assignee_email"]
        if "@" not in email or "." not in email:
            errors.append("Invalid email format")
    
    # Validate date format (basic)
    if "due_date" in task_data and task_data["due_date"]:
        date_str = task_data["due_date"]
        if len(date_str) != 10 or date_str.count("-") != 2:
            errors.append("Due date must be in YYYY-MM-DD format")
    
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))
    
    # Calculate priority score
    priority_scores = {
        "low": 1,
        "medium": 2, 
        "high": 3,
        "urgent": 4,
        "critical": 5
    }
    
    # Build response
    response = {
        "message": "Task processed successfully",
        "task_id": f"task_{int(time.time())}",
        "processed_data": task_data,
        "metadata": {
            "priority_score": priority_scores.get(task_data.get("priority", "medium"), 2),
            "is_work_task": task_data.get("category") == "work",
            "has_deadline": "due_date" in task_data and task_data["due_date"],
            "estimated_hours": task_data.get("estimated_hours", 0),
            "notifications_enabled": task_data.get("send_notifications", False)
        },
        "validation": {
            "all_enums_valid": True,
            "required_fields_present": True,
            "data_types_correct": True
        },
        "timestamp": time.time()
    }
    
    return response

if __name__ == "__main__":
    print("🚀 Starting Skills Test Server...")
    print("📋 Available endpoints:")
    print("   GET  /              - Server info")
    print("   GET  /health        - Health check")
    print("   POST /calculate     - Math operations (test POST + JSON)")
    print("   GET  /secure-data   - Bearer token auth (Header: Authorization: Bearer test-secret-token)")
    print("   GET  /api-key-data  - API key auth (Header: X-API-Key: my-secret-api-key)")
    print("   GET  /error?code=X  - Test error codes (400, 404, 500, etc.)")
    print("   GET  /slow?delay=X  - Test timeouts (delay in seconds)")
    print("   GET  /large-data?size=X - Test large responses")
    print("   GET  /search?q=X    - Test query parameters")
    print("   POST /user-data     - Test complex validation")
    print("   GET  /echo?message=X - Simple echo test")
    print("   GET  /enum-test    - Test enum parameters (priority, category, status)")
    print("   POST /task-manager - Comprehensive enum test with multiple enum fields")
    print("\n🌐 Server will be available at: http://localhost:8000")
    print("📖 API docs at: http://localhost:8000/docs")
    
    uvicorn.run(app, host="0.0.0.0", port=8000) 