# Skills System Cleanup Guide

## Overview
This document outlines the cleanup process for removing the old skills implementation after migrating to the new reusable skills architecture.

## Database Migration
Run the migration to clean up old database objects:
```bash
npx supabase db push
```

## Files to Delete

### 1. Old Database Query Files
- `src/app/dashboard/libs/skills_db_queries.ts` - Old skills database queries
- `src/lib/db/queries/skills.ts` - Legacy skills queries (commented out)

### 2. Old Service Files
- `src/services/skills/skill-executor.ts` - Old skill executor
- `src/services/skills/skills-service.ts` - Old skills service
- `src/services/chat/tools-builder.ts` - Old tools builder

### 3. Old Migration Files (in temp folder)
- `supabase/temp/20250630000000_add_skills_system.sql` - Old skills schema
- `supabase/temp/20250117000002_cleanup_old_tables.sql` - Old cleanup script

## Files to Update

### 1. Update Import References
The following files still reference old implementations and need to be updated:

#### `src/app/api/dashboard/chatbots/[chatbotId]/skills/route.ts`
- Line 62: Remove fallback to old skills_db_queries
- Remove: `const { getSkillsForChatbot: getOldSkills } = await import('@/app/dashboard/libs/skills_db_queries');`

### 2. UI Components
Check if any UI components still reference the old Skill type from skills_db_queries.ts:
- Update imports to use skills_db_queries_v2.ts
- Ensure all components use the new SkillWithAssociation type

## Migration Verification

### 1. Database Tables
After migration, verify these tables exist:
- ✅ `skills` - Reusable skill definitions
- ✅ `chatbot_skill_associations` - Many-to-many links
- ✅ `skill_executions` - Execution logs (updated to reference skills.id)
- ❌ `chatbot_skills` - Should be deleted

### 2. Test Application
1. Create a new skill
2. Add existing skill to chatbot
3. Test semantic search
4. Verify skill execution works
5. Check skill removal from chatbot

## Architecture Changes

### Before (Old)
```
chatbots -> chatbot_skills (1:many)
chatbot_skills -> skill_executions (1:many)
```

### After (New)
```
chatbots -> chatbot_skill_associations -> skills (many:many)
skills -> skill_executions (1:many)
```

## Benefits of New Architecture
1. **Reusability**: Skills can be shared across multiple chatbots
2. **Semantic Search**: Vector embeddings for intelligent skill selection
3. **Better Organization**: Category-based skill management
4. **Scalability**: Optimized for large numbers of skills
5. **Flexibility**: Per-chatbot skill configuration overrides

## Rollback Plan
If issues arise, the old implementation can be restored by:
1. Reverting the cleanup migration
2. Restoring deleted files from git history
3. Updating imports back to old files

However, this should only be done as a last resort since data migration is one-way.

## Post-Cleanup Checklist
- [ ] Database migration completed successfully
- [ ] Old files deleted
- [ ] Import references updated
- [ ] Application tested end-to-end
- [ ] No references to old chatbot_skills table
- [ ] All skills functionality working
- [ ] Semantic search working
- [ ] Browse skills modal working 