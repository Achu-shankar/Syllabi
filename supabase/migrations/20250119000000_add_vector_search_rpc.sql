-- Create RPC function for vector similarity search of chatbot skills
-- This function performs cosine similarity search on skills associated with a specific chatbot

CREATE OR REPLACE FUNCTION search_chatbot_skills_by_similarity(
  query_embedding vector(1536),
  chatbot_id_param uuid,
  similarity_threshold float DEFAULT 0.5,
  match_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  display_name text,
  description text,
  category text,
  type text,
  function_schema jsonb,
  configuration jsonb,
  embedding vector(1536),
  is_active boolean,
  execution_count integer,
  last_executed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  similarity float,
  association_id uuid,
  association_is_active boolean,
  custom_config jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.name,
    s.display_name,
    s.description,
    s.category,
    s.type,
    s.function_schema,
    s.configuration,
    s.embedding,
    s.is_active,
    s.execution_count,
    s.last_executed_at,
    s.created_at,
    s.updated_at,
    (1 - (s.embedding <=> query_embedding)) as similarity,
    csa.id as association_id,
    csa.is_active as association_is_active,
    csa.custom_config
  FROM skills s
  INNER JOIN chatbot_skill_associations csa ON s.id = csa.skill_id
  WHERE 
    -- Filter by chatbot
    csa.chatbot_id = chatbot_id_param
    -- Only return active skills and active associations
    AND s.is_active = true
    AND csa.is_active = true
    -- Only include skills that have embeddings
    AND s.embedding IS NOT NULL
    -- Filter by similarity threshold
    AND (1 - (s.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_chatbot_skills_by_similarity TO authenticated;

-- Create HNSW index on embeddings for faster similarity search (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS skills_embedding_hnsw_idx 
ON skills USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create a composite index for chatbot skill associations
CREATE INDEX IF NOT EXISTS chatbot_skill_associations_chatbot_active_idx 
ON chatbot_skill_associations (chatbot_id, is_active) 
WHERE is_active = true; 