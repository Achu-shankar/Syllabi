# Skills System Technical Specification

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Specifications](#api-specifications)
5. [Implementation Details](#implementation-details)
6. [Integration Patterns](#integration-patterns)
7. [Security Considerations](#security-considerations)
8. [Future Extensibility](#future-extensibility)

## Overview

The Skills system enables chatbots to perform actions beyond simple text responses. Skills can be webhook calls to external APIs, built-in functions, or integrations with third-party services.

### Key Concepts

- **Skills**: Discrete actions a chatbot can perform (e.g., book meeting, send email)
- **Skill Types**:
  - `webhook`: Custom API endpoints defined by users
  - `builtin`: Pre-built functions provided by the platform
  - `integration`: Actions using connected third-party services
- **Skill Executions**: Logged instances of skill usage for analytics and debugging

### Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Vercel AI SDK
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 with function calling

## Architecture

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chat UI       │     │   Embed UI      │     │  Slack/Discord  │
│   (Full Bot)    │     │  (Embedded)     │     │   (Future)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   Unified Chat Service  │
                    │   (chat-service.ts)     │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
        ┌───────┴────────┐              ┌────────┴────────┐
        │  Tools Builder  │              │  Skills Service │
        │(tools-builder.ts)│             │(skills-service.ts)│
        └───────┬────────┘              └────────┬────────┘
                │                                 │
                └────────────┬────────────────────┘
                             │
                    ┌────────┴────────┐
                    │ Skill Executor  │
                    │(skill-executor.ts)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────┴────────┐  ┌────────┴────────┐  ┌───────┴────────┐
│ Webhook Skills │  │ Builtin Skills  │  │Integration Skills│
│   (External)   │  │   (Internal)    │  │    (OAuth)      │
└────────────────┘  └─────────────────┘  └─────────────────┘
```

### File Structure

```
/syllabi-frontend/src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts                    # Full chatbot endpoint
│   │   │   └── embed/route.ts              # Embedded chatbot endpoint
│   │   ├── chatbots/[id]/skills/
│   │   │   └── route.ts                    # GET (list), POST (create)
│   │   └── skills/[id]/
│   │       ├── route.ts                    # GET, PUT, DELETE
│   │       └── execute/route.ts            # POST (test execution)
│   └── dashboard/chatbots/[chatbotId]/skills/
│       ├── page.tsx                        # Skills management page
│       └── components/
│           ├── SkillsList.tsx              # Display all skills
│           ├── SkillCreator.tsx            # Create/edit skill form
│           └── SkillTester.tsx             # Test skill execution
├── services/
│   ├── chat/
│   │   ├── chat-service.ts                 # Unified chat processing
│   │   └── tools-builder.ts                # Convert skills to AI tools
│   └── skills/
│       ├── skills-service.ts               # Skills CRUD operations
│       ├── skill-executor.ts               # Execute skills
│       └── builtin-skills.ts               # Built-in skill implementations
└── lib/db/queries/
    └── skills.ts                           # Database queries
```

## Database Schema

### Tables

#### chatbot_skills
Stores skill definitions for each chatbot.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| chatbot_id | UUID | Foreign key to chatbots table |
| name | TEXT | Unique skill identifier (snake_case) |
| display_name | TEXT | Human-readable name |
| description | TEXT | Detailed description for AI context |
| skill_type | TEXT | 'webhook', 'builtin', or 'integration' |
| configuration | JSONB | Type-specific configuration |
| function_schema | JSONB | OpenAI function calling schema |
| is_active | BOOLEAN | Whether skill is enabled |
| execution_count | INTEGER | Total execution count |
| last_executed_at | TIMESTAMPTZ | Last execution timestamp |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### skill_executions
Logs all skill execution attempts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| skill_id | UUID | Foreign key to chatbot_skills |
| chat_session_id | UUID | Foreign key to chat_sessions (nullable) |
| user_id | UUID | Foreign key to auth.users (nullable) |
| channel_type | TEXT | 'web', 'embed', 'slack', 'discord', 'api' |
| execution_status | TEXT | 'pending', 'success', 'error', 'timeout' |
| input_parameters | JSONB | Parameters passed to skill |
| output_result | JSONB | Result from skill execution |
| error_message | TEXT | Error details if failed |
| execution_time_ms | INTEGER | Execution duration |
| created_at | TIMESTAMPTZ | Execution timestamp |

### Configuration Schemas

#### Webhook Skill Configuration
```json
{
  "webhook_url": "https://api.example.com/endpoint",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "timeout_ms": 30000,
  "retry_count": 3
}
```

#### Builtin Skill Configuration
```json
{
  "template_id": "send_email",
  "settings": {
    "from_email": "bot@company.com",
    "smtp_config": "default"
  }
}
```

#### Integration Skill Configuration
```json
{
  "integration_type": "calendly",
  "connection_id": "uuid-of-integration-connection",
  "action": "create_event"
}
```

### Function Schema Format
```json
{
  "name": "book_meeting",
  "description": "Books a meeting with the sales team",
  "parameters": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "description": "Meeting date in YYYY-MM-DD format"
      },
      "time": {
        "type": "string",
        "description": "Meeting time in HH:MM format"
      },
      "attendee_email": {
        "type": "string",
        "format": "email",
        "description": "Email of the person booking"
      }
    },
    "required": ["date", "time", "attendee_email"]
  }
}
```

## API Specifications

### Skills CRUD Endpoints

#### List Skills
```
GET /api/chatbots/[chatbotId]/skills

Response:
{
  "skills": [
    {
      "id": "skill-uuid",
      "name": "book_meeting",
      "display_name": "Book Meeting",
      "description": "Books a meeting with sales team",
      "skill_type": "webhook",
      "is_active": true,
      "execution_count": 42,
      "last_executed_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Create Skill
```
POST /api/chatbots/[chatbotId]/skills

Request:
{
  "name": "book_meeting",
  "display_name": "Book Meeting",
  "description": "Books a meeting with the sales team",
  "skill_type": "webhook",
  "configuration": {
    "webhook_url": "https://api.example.com/book",
    "method": "POST"
  },
  "function_schema": {
    "name": "book_meeting",
    "parameters": { ... }
  }
}

Response:
{
  "skill": { ... },
  "success": true
}
```

#### Update Skill
```
PUT /api/skills/[skillId]

Request:
{
  "display_name": "Schedule Demo",
  "is_active": false
}

Response:
{
  "skill": { ... },
  "success": true
}
```

#### Delete Skill
```
DELETE /api/skills/[skillId]

Response:
{
  "success": true
}
```

#### Execute Skill (Test)
```
POST /api/skills/[skillId]/execute

Request:
{
  "parameters": {
    "date": "2024-01-20",
    "time": "14:00",
    "attendee_email": "test@example.com"
  },
  "test_mode": true
}

Response:
{
  "result": {
    "success": true,
    "data": { ... }
  },
  "execution_time_ms": 245
}
```

## Implementation Details

### Chat Service Integration

```typescript
// services/chat/chat-service.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getSkillsAsTools } from './tools-builder';

interface ChatRequest {
  messages: Message[];
  chatbotId: string;
  sessionId?: string;
  userId?: string;
  channel: 'web' | 'embed' | 'slack' | 'discord' | 'api';
  metadata?: Record<string, any>;
}

export async function processChatMessage(request: ChatRequest) {
  // 1. Get chatbot configuration
  const chatbot = await getChatbotConfig(request.chatbotId);
  
  // 2. Build tools from skills
  const tools = await getSkillsAsTools(request.chatbotId);
  
  // 3. Process with AI
  const result = await streamText({
    model: openai(chatbot.model || 'gpt-4'),
    system: chatbot.systemPrompt,
    messages: request.messages,
    tools,
    toolChoice: 'auto',
    
    onToolCall: async ({ toolCall }) => {
      // Log execution
      await logSkillExecution({
        skillName: toolCall.toolName,
        parameters: toolCall.args,
        channel: request.channel,
        sessionId: request.sessionId,
        userId: request.userId
      });
    }
  });
  
  return result;
}
```

### Tools Builder

```typescript
// services/chat/tools-builder.ts
import { tool } from 'ai';
import { z } from 'zod';
import { executeSkill } from '../skills/skill-executor';

export async function getSkillsAsTools(chatbotId: string) {
  const skills = await getActiveSkills(chatbotId);
  const tools: Record<string, any> = {};
  
  for (const skill of skills) {
    const parameters = convertJsonSchemaToZod(skill.function_schema.parameters);
    
    tools[skill.name] = tool({
      description: skill.description,
      parameters,
      execute: async (params) => {
        return await executeSkill(skill, params);
      }
    });
  }
  
  return tools;
}

function convertJsonSchemaToZod(schema: any): z.ZodObject<any> {
  // Convert JSON Schema to Zod schema
  // Implementation details...
}
```

### Skill Executor

```typescript
// services/skills/skill-executor.ts
export async function executeSkill(skill: Skill, parameters: any) {
  const startTime = Date.now();
  let result;
  let status: 'success' | 'error' = 'success';
  let errorMessage: string | null = null;
  
  try {
    switch (skill.skill_type) {
      case 'webhook':
        result = await executeWebhookSkill(skill, parameters);
        break;
      case 'builtin':
        result = await executeBuiltinSkill(skill, parameters);
        break;
      case 'integration':
        result = await executeIntegrationSkill(skill, parameters);
        break;
    }
  } catch (error) {
    status = 'error';
    errorMessage = error.message;
    result = { error: error.message };
  }
  
  // Log execution
  await createSkillExecution({
    skill_id: skill.id,
    execution_status: status,
    input_parameters: parameters,
    output_result: result,
    error_message: errorMessage,
    execution_time_ms: Date.now() - startTime
  });
  
  return result;
}
```

### Built-in Skills

```typescript
// services/skills/builtin-skills.ts
export const builtinSkills = {
  collect_lead_info: {
    execute: async (params: any) => {
      return {
        action: 'show_lead_form',
        fields: ['name', 'email', 'company', 'phone'],
        required: ['name', 'email']
      };
    }
  },
  
  send_email: {
    execute: async (params: { to: string; subject: string; body: string }) => {
      // Integration with email service
      await emailService.send({
        to: params.to,
        subject: params.subject,
        body: params.body,
        from: process.env.DEFAULT_FROM_EMAIL
      });
      
      return { success: true, message: 'Email sent successfully' };
    }
  },
  
  check_business_hours: {
    execute: async (params: { timezone?: string }) => {
      const tz = params.timezone || 'America/New_York';
      const now = new Date();
      const hours = getBusinessHours(now, tz);
      
      return {
        is_open: hours.isOpen,
        current_time: hours.currentTime,
        next_open: hours.nextOpen
      };
    }
  }
};
```

## Integration Patterns

### Adding New Channels (Future)

```typescript
// api/integrations/slack/events/route.ts
export async function POST(req: Request) {
  const slackEvent = await verifySlackRequest(req);
  
  if (slackEvent.type === 'app_mention') {
    // Convert Slack format to standard
    const chatRequest = {
      messages: [{
        role: 'user' as const,
        content: slackEvent.text.replace(/<@\w+>/, '').trim()
      }],
      chatbotId: await getChatbotFromSlackTeam(slackEvent.team_id),
      channel: 'slack' as const,
      metadata: {
        slack_user_id: slackEvent.user,
        slack_channel: slackEvent.channel
      }
    };
    
    // Use unified chat service
    const response = await processChatMessage(chatRequest);
    
    // Send back to Slack
    await slack.chat.postMessage({
      channel: slackEvent.channel,
      text: response.text,
      thread_ts: slackEvent.thread_ts
    });
  }
  
  return new Response('ok', { status: 200 });
}
```

### Adding New Skill Types

To add a new skill type:

1. Update the database constraint:
```sql
ALTER TABLE chatbot_skills 
DROP CONSTRAINT chatbot_skills_skill_type_check;

ALTER TABLE chatbot_skills 
ADD CONSTRAINT chatbot_skills_skill_type_check 
CHECK (skill_type IN ('webhook', 'builtin', 'integration', 'new_type'));
```

2. Add executor logic:
```typescript
// In skill-executor.ts
case 'new_type':
  result = await executeNewTypeSkill(skill, parameters);
  break;
```

3. Add configuration validation:
```typescript
// In skills-service.ts
const validateConfiguration = (type: string, config: any) => {
  switch (type) {
    case 'new_type':
      return validateNewTypeConfig(config);
    // ...
  }
};
```

## Security Considerations

### API Security
- All endpoints require authentication via Supabase Auth
- Skills are scoped to chatbot owner via RLS policies
- Webhook URLs are validated against allowlist patterns
- API keys and secrets are encrypted in configuration

### Webhook Security
```typescript
const webhookSecurityConfig = {
  // Timeout to prevent hanging
  timeout: 30000,
  
  // Retry logic with exponential backoff
  retryCount: 3,
  retryDelay: [1000, 2000, 4000],
  
  // Request size limits
  maxRequestSize: '1mb',
  
  // Response validation
  validateResponse: true,
  
  // URL validation
  urlWhitelist: [
    /^https:\/\/api\.calendly\.com/,
    /^https:\/\/hooks\.zapier\.com/,
    // User's own domains from settings
  ]
};
```

### Data Privacy
- Skill executions are logged but PII can be redacted
- Separate retention policies for logs vs chat history
- User can delete skill execution history

## Future Extensibility

### Planned Features

#### 1. Skill Marketplace
```typescript
interface MarketplaceSkill {
  id: string;
  name: string;
  category: 'productivity' | 'sales' | 'support' | 'utility';
  author: string;
  rating: number;
  installs: number;
  configuration_template: any;
}
```

#### 2. Skill Chaining
```typescript
interface SkillChain {
  id: string;
  name: string;
  steps: Array<{
    skill_id: string;
    condition?: string;
    parameter_mapping: Record<string, string>;
  }>;
}
```

#### 3. Conditional Skills
```typescript
interface ConditionalSkill {
  conditions: Array<{
    type: 'time' | 'user_property' | 'context';
    operator: 'equals' | 'contains' | 'greater_than';
    value: any;
  }>;
  action_if_true: string;
  action_if_false?: string;
}
```

#### 4. Analytics Dashboard
- Skill usage metrics
- Success/failure rates
- Popular parameters
- Performance metrics

### Migration Path

When adding new features:

1. **Database migrations**: Use Supabase migrations
2. **API versioning**: Support v1 while developing v2
3. **Backwards compatibility**: New fields should be optional
4. **Feature flags**: Roll out gradually to users

### Performance Optimization

```typescript
// Caching frequently used skills
const skillCache = new Map<string, Skill[]>();

// Batch execution for multiple skills
const batchExecutor = new BatchSkillExecutor({
  maxBatchSize: 10,
  maxWaitTime: 100
});

// Connection pooling for webhooks
const webhookPool = new WebhookConnectionPool({
  maxConnections: 50,
  keepAlive: true
});
```

## Monitoring and Observability

### Metrics to Track
- Skill execution count by type
- Average execution time
- Error rates by skill
- Channel distribution
- User engagement with skills

### Logging Strategy
```typescript
interface SkillLog {
  level: 'info' | 'warn' | 'error';
  skill_id: string;
  execution_id: string;
  timestamp: Date;
  duration_ms: number;
  status: 'success' | 'error';
  error_type?: 'timeout' | 'network' | 'validation' | 'unknown';
  metadata: Record<string, any>;
}
```

### Health Checks
```typescript
// Health check endpoint
GET /api/skills/health

Response:
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "webhook_service": "ok",
    "builtin_skills": "ok"
  },
  "metrics": {
    "total_executions_24h": 1523,
    "error_rate": 0.02,
    "avg_response_time_ms": 245
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// Example test for skill executor
describe('SkillExecutor', () => {
  it('should execute webhook skill successfully', async () => {
    const mockSkill = createMockWebhookSkill();
    const params = { date: '2024-01-20' };
    
    const result = await executeSkill(mockSkill, params);
    
    expect(result.success).toBe(true);
    expect(mockWebhook).toHaveBeenCalledWith(params);
  });
});
```

### Integration Tests
- Test full chat flow with skills
- Test webhook timeouts and retries
- Test error handling and fallbacks

### End-to-End Tests
- Create skill via UI
- Trigger skill in chat
- Verify execution logs
- Check analytics update

## Deployment Considerations

### Environment Variables
```env
# Skills Configuration
SKILL_WEBHOOK_TIMEOUT=30000
SKILL_MAX_RETRIES=3
SKILL_EXECUTION_RATE_LIMIT=100

# Built-in Skills
EMAIL_SERVICE_API_KEY=xxx
DEFAULT_FROM_EMAIL=bot@company.com

# Security
WEBHOOK_URL_WHITELIST=["api.calendly.com", "hooks.zapier.com"]
SKILL_ENCRYPTION_KEY=xxx
```

### Rollout Strategy
1. Deploy database changes
2. Deploy API with feature flag
3. Deploy UI behind feature flag
4. Enable for beta users
5. Monitor and iterate
6. General availability

---

This document serves as the authoritative reference for the Skills system implementation. It should be updated as the system evolves. 