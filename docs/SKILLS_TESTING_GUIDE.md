# Skills Testing Guide

## 🎯 **Testing Strategy Overview**

Test your skills integration with various scenarios to ensure robustness, error handling, and real-world compatibility.

## 📋 **Phase 1: Public API Testing**

Start with these free public APIs that don't require authentication:

### 1. **Weather Skill** (OpenWeatherMap - Free Tier)
```json
{
  "name": "get_weather",
  "display_name": "Get Weather",
  "description": "Get current weather information for any city",
  "skill_type": "webhook",
  "function_schema": {
    "name": "get_weather",
    "description": "Get current weather information for any city worldwide",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string",
          "description": "City name (e.g., 'London', 'New York')"
        },
        "units": {
          "type": "string",
          "enum": ["metric", "imperial", "kelvin"],
          "description": "Temperature units",
          "default": "metric"
        }
      },
      "required": ["city"]
    }
  },
  "configuration": {
    "webhook_config": {
      "url": "https://api.openweathermap.org/data/2.5/weather",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Test Cases:**
- "What's the weather in Tokyo?"
- "Tell me the temperature in London in Fahrenheit"
- "Is it raining in Paris?"

### 2. **Random Joke Skill** (No Auth Required)
```json
{
  "name": "get_joke",
  "display_name": "Get Random Joke",
  "description": "Get a random programming joke",
  "skill_type": "webhook",
  "function_schema": {
    "name": "get_joke",
    "description": "Fetch a random programming joke to lighten the mood",
    "parameters": {
      "type": "object",
      "properties": {
        "category": {
          "type": "string",
          "enum": ["programming", "misc", "dark", "pun"],
          "description": "Type of joke",
          "default": "programming"
        }
      },
      "required": []
    }
  },
  "configuration": {
    "webhook_config": {
      "url": "https://v2.jokeapi.dev/joke/Programming",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Test Cases:**
- "Tell me a joke"
- "I need a programming joke"
- "Can you make me laugh?"

### 3. **UUID Generator Skill** (httpbin.org)
```json
{
  "name": "generate_uuid",
  "display_name": "Generate UUID",
  "description": "Generate a unique identifier",
  "skill_type": "webhook",
  "function_schema": {
    "name": "generate_uuid",
    "description": "Generate a universally unique identifier (UUID)",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  "configuration": {
    "webhook_config": {
      "url": "https://httpbin.org/uuid",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Test Cases:**
- "Generate a unique ID for me"
- "I need a UUID"
- "Create a random identifier"

### 4. **IP Information Skill** (Free API)
```json
{
  "name": "get_ip_info",
  "display_name": "Get IP Information",
  "description": "Get location and details about an IP address",
  "skill_type": "webhook",
  "function_schema": {
    "name": "get_ip_info",
    "description": "Get geographic and network information about an IP address",
    "parameters": {
      "type": "object",
      "properties": {
        "ip": {
          "type": "string",
          "description": "IP address to lookup (e.g., '8.8.8.8')"
        }
      },
      "required": ["ip"]
    }
  },
  "configuration": {
    "webhook_config": {
      "url": "http://ip-api.com/json",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Test Cases:**
- "What information can you find about IP 8.8.8.8?"
- "Where is IP address 1.1.1.1 located?"

## 🛠️ **Phase 2: Custom FastAPI Test Server**

Create controlled test endpoints for comprehensive testing:

### FastAPI Test Server Setup

```python
# test_server.py
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
import time
import json
from typing import Optional
import uvicorn

app = FastAPI(title="Skills Test Server", version="1.0.0")

# Test models
class CalculationRequest(BaseModel):
    operation: str
    a: float
    b: float

class DataRequest(BaseModel):
    query: str
    limit: Optional[int] = 10

# 1. BASIC MATH API (POST with JSON body)
@app.post("/calculate")
async def calculate(request: CalculationRequest):
    operations = {
        "add": request.a + request.b,
        "subtract": request.a - request.b,
        "multiply": request.a * request.b,
        "divide": request.a / request.b if request.b != 0 else None
    }
    
    if request.operation not in operations:
        raise HTTPException(status_code=400, detail="Invalid operation")
    
    result = operations[request.operation]
    if result is None:
        raise HTTPException(status_code=400, detail="Division by zero")
    
    return {
        "operation": request.operation,
        "operand_a": request.a,
        "operand_b": request.b,
        "result": result,
        "timestamp": time.time()
    }

# 2. AUTHENTICATED ENDPOINT (Bearer Token)
@app.get("/secure-data")
async def secure_data(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split("Bearer ")[1]
    if token != "test-secret-token":
        raise HTTPException(status_code=403, detail="Invalid token")
    
    return {
        "message": "Access granted to secure data",
        "data": ["item1", "item2", "item3"],
        "user_level": "premium"
    }

# 3. API KEY ENDPOINT (Custom header)
@app.get("/api-key-data")
async def api_key_data(x_api_key: str = Header(..., alias="X-API-Key")):
    if x_api_key != "my-secret-api-key":
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    return {
        "status": "success",
        "api_version": "v1.0",
        "rate_limit_remaining": 99
    }

# 4. SLOW ENDPOINT (Test timeouts)
@app.get("/slow")
async def slow_endpoint(delay: int = 5):
    time.sleep(delay)
    return {"message": f"Completed after {delay} seconds"}

# 5. ERROR ENDPOINT (Test error handling)
@app.get("/error")
async def error_endpoint(code: int = 500):
    if code == 400:
        raise HTTPException(status_code=400, detail="Bad request error")
    elif code == 404:
        raise HTTPException(status_code=404, detail="Resource not found")
    elif code == 500:
        raise HTTPException(status_code=500, detail="Internal server error")
    else:
        return {"message": "No error"}

# 6. LARGE RESPONSE (Test size limits)
@app.get("/large-data")
async def large_data(size: int = 1000):
    return {
        "data": ["item_" + str(i) for i in range(size)],
        "metadata": {
            "total_items": size,
            "generated_at": time.time()
        }
    }

# 7. QUERY PARAMETERS (GET with params)
@app.get("/search")
async def search(q: str, limit: int = 10, category: str = "general"):
    return {
        "query": q,
        "results": [f"Result {i} for '{q}'" for i in range(1, limit + 1)],
        "category": category,
        "total_found": limit * 10
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Run Test Server
```bash
pip install fastapi uvicorn
python test_server.py
```

### Skills for Custom Endpoints

**Calculator Skill (POST with JSON):**
```json
{
  "name": "advanced_calculator",
  "display_name": "Advanced Calculator",
  "description": "Perform mathematical operations with detailed results",
  "skill_type": "webhook",
  "function_schema": {
    "name": "advanced_calculator",
    "description": "Perform mathematical calculations (add, subtract, multiply, divide)",
    "parameters": {
      "type": "object",
      "properties": {
        "operation": {
          "type": "string",
          "enum": ["add", "subtract", "multiply", "divide"],
          "description": "Mathematical operation to perform"
        },
        "a": {
          "type": "number",
          "description": "First number"
        },
        "b": {
          "type": "number",
          "description": "Second number"
        }
      },
      "required": ["operation", "a", "b"]
    }
  },
  "configuration": {
    "webhook_config": {
      "url": "http://localhost:8000/calculate",
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      }
    }
  }
}
```

**Secure Data Skill (Bearer Token):**
```json
{
  "name": "get_secure_data",
  "display_name": "Get Secure Data",
  "description": "Access authenticated data with bearer token",
  "skill_type": "webhook",
  "function_schema": {
    "name": "get_secure_data",
    "description": "Retrieve secure data that requires authentication",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  },
  "configuration": {
    "webhook_config": {
      "url": "http://localhost:8000/secure-data",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-secret-token"
      }
    }
  }
}
```

## 📊 **Comprehensive Test Cases Matrix**

### ✅ **Functionality Tests**
| Test Case | Expected Behavior | Example Prompt |
|-----------|-------------------|----------------|
| Basic GET | Successful data retrieval | "Get me a joke" |
| Basic POST | Successful data submission | "Calculate 15 + 27" |
| Query Parameters | Proper parameter passing | "Search for 'python tutorials'" |
| JSON Body | Correct JSON formatting | "Multiply 12 by 8" |

### 🔐 **Authentication Tests**
| Auth Type | Test Scenario | Expected Result |
|-----------|---------------|-----------------|
| Bearer Token | Valid token | Success response |
| Bearer Token | Missing token | 401 Unauthorized |
| API Key | Valid key | Success response |
| API Key | Invalid key | 403 Forbidden |

### ⚠️ **Error Handling Tests**
| Error Type | Test Scenario | Expected Behavior |
|------------|---------------|-------------------|
| 400 Bad Request | Invalid parameters | Error logged, graceful failure |
| 404 Not Found | Wrong endpoint | Error logged, retry or fallback |
| 500 Server Error | Server issues | Error logged, user-friendly message |
| Network Timeout | Slow response | Timeout after 30s, error message |

### 🔧 **Edge Case Tests**
| Scenario | Test Method | Expected Outcome |
|----------|-------------|------------------|
| Large Response | Request 5000+ items | Handle large data gracefully |
| Empty Response | API returns {} | No crash, appropriate message |
| Malformed JSON | Invalid API response | Parse error handling |
| Rate Limiting | Multiple rapid requests | Proper error handling |

## 🎯 **Testing Checklist**

### Phase 1: Basic Functionality ✅
- [ ] Create weather skill
- [ ] Create joke skill  
- [ ] Create UUID skill
- [ ] Test basic chat interactions
- [ ] Verify skill execution logging

### Phase 2: Authentication ✅
- [ ] Set up FastAPI test server
- [ ] Create bearer token skill
- [ ] Create API key skill
- [ ] Test valid authentication
- [ ] Test invalid authentication

### Phase 3: Error Scenarios ✅
- [ ] Test 400/404/500 errors
- [ ] Test network timeouts
- [ ] Test malformed responses
- [ ] Verify error logging

### Phase 4: Performance ✅
- [ ] Test large responses
- [ ] Test slow endpoints
- [ ] Monitor execution times
- [ ] Check memory usage

### Phase 5: Real-world Integration ✅
- [ ] Test with actual external APIs
- [ ] Test different HTTP methods
- [ ] Test various response formats
- [ ] Validate production scenarios

## 🚀 **Next Steps**

1. **Start with Phase 1** - Create public API skills for immediate testing
2. **Set up FastAPI server** - Build controlled test environment  
3. **Run test matrix** - Systematically test all scenarios
4. **Monitor logs** - Check `skill_executions` table for proper logging
5. **Performance testing** - Test with multiple concurrent users
6. **Production readiness** - Test with real APIs you plan to use

Would you like me to help you create any of these specific skills or set up the FastAPI test server? 