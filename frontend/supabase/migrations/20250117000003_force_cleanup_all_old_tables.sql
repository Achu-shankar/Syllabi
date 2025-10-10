-- AGGRESSIVE CLEANUP: Force delete ALL old integration tables
-- WARNING: This will completely remove the old slack_workspaces table too
-- Only run this if you're 100% sure you don't need the old tables

-- Step 1: Drop ALL constraints and dependencies aggressively
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- First drop ALL table constraints (foreign keys, primary keys, unique constraints, etc.)
    FOR r IN (
        SELECT constraint_name, table_name, constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name IN ('discord_guilds', 'discord_guild_chatbots', 'slack_workspaces', 'slack_workspace_chatbots', 'voice_assistant_chatbots')
        ORDER BY CASE constraint_type 
            WHEN 'FOREIGN KEY' THEN 1 
            WHEN 'UNIQUE' THEN 2 
            WHEN 'PRIMARY KEY' THEN 3 
            ELSE 4 
        END
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE IF EXISTS ' || r.table_name || ' DROP CONSTRAINT IF EXISTS ' || r.constraint_name || ' CASCADE';
            RAISE NOTICE 'Dropped constraint % from %', r.constraint_name, r.table_name;
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not drop constraint % from %: %', r.constraint_name, r.table_name, SQLERRM;
        END;
    END LOOP;
    
    -- Now drop indexes (after constraints are gone)
    FOR r IN (
        SELECT indexname, tablename
        FROM pg_indexes 
        WHERE tablename IN ('discord_guilds', 'discord_guild_chatbots', 'slack_workspaces', 'slack_workspace_chatbots', 'voice_assistant_chatbots')
        AND indexname NOT LIKE '%_pkey' -- Skip primary key indexes as they should be gone now
    ) LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS ' || r.indexname || ' CASCADE';
            RAISE NOTICE 'Dropped index %', r.indexname;
        EXCEPTION 
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not drop index %: %', r.indexname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 2: Drop all RLS policies on old tables (with proper error handling)
DO $$
BEGIN
    -- Drop policies only if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_guild_chatbots') THEN
        DROP POLICY IF EXISTS "Users can manage Discord links for their own chatbots" ON public.discord_guild_chatbots;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_guilds') THEN
        DROP POLICY IF EXISTS "Users can view Discord guilds linked to their chatbots" ON public.discord_guilds;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_workspace_chatbots') THEN
        DROP POLICY IF EXISTS "Users can manage their own Slack workspace chatbot links" ON public.slack_workspace_chatbots;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_assistant_chatbots') THEN
        DROP POLICY IF EXISTS "Users can manage their own voice assistant chatbot links" ON public.voice_assistant_chatbots;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_workspaces') THEN
        DROP POLICY IF EXISTS "Users can manage their own Slack workspaces" ON public.slack_workspaces;
    END IF;
    
    RAISE NOTICE 'RLS policy cleanup completed';
END $$;

-- Step 3: Force drop all old tables with CASCADE
DROP TABLE IF EXISTS public.discord_guild_chatbots CASCADE;
DROP TABLE IF EXISTS public.slack_workspace_chatbots CASCADE;
DROP TABLE IF EXISTS public.voice_assistant_chatbots CASCADE;
DROP TABLE IF EXISTS public.discord_guilds CASCADE;
DROP TABLE IF EXISTS public.slack_workspaces CASCADE;

-- Step 4: Clean up any related functions
DROP FUNCTION IF EXISTS public.decrypt_slack_credentials(text) CASCADE;
DROP FUNCTION IF EXISTS public.encrypt_slack_credentials(text, text) CASCADE;

-- Step 5: Clean up any types or other objects that might depend on these tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Find and drop any custom types that might reference old tables
    FOR r IN (
        SELECT typname FROM pg_type 
        WHERE typname LIKE '%discord_guild%' OR typname LIKE '%slack_workspace%' OR typname LIKE '%voice_assistant%'
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || r.typname || ' CASCADE';
    END LOOP;
END $$;

-- Step 6: Verify cleanup
DO $$
BEGIN
    -- Check if tables still exist and log
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_guild_chatbots') THEN
        RAISE NOTICE 'WARNING: discord_guild_chatbots still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_workspace_chatbots') THEN
        RAISE NOTICE 'WARNING: slack_workspace_chatbots still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voice_assistant_chatbots') THEN
        RAISE NOTICE 'WARNING: voice_assistant_chatbots still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_guilds') THEN
        RAISE NOTICE 'WARNING: discord_guilds still exists';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'slack_workspaces') THEN
        RAISE NOTICE 'WARNING: slack_workspaces still exists';
    END IF;
    
    RAISE NOTICE 'Old table cleanup completed successfully';
END $$; 