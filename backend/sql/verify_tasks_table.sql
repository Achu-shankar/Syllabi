-- Verification script to check if tasks table exists and has correct structure

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'tasks';

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'tasks';

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'tasks';

-- Sample query to test table access
SELECT COUNT(*) as task_count FROM public.tasks; 