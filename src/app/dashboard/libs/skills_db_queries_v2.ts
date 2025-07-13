'use server';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// Updated interfaces for new schema
export interface Skill {
  id: string;
  user_id: string | null; // null for built-in skills
  name: string;
  display_name: string;
  description: string;
  category: string;
  type: 'custom' | 'builtin';
  function_schema: Record<string, any>;
  configuration: Record<string, any>;
  embedding: number[] | null;
  is_active: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotSkillAssociation {
  id: string;
  chatbot_id: string;
  skill_id: string;
  is_active: boolean;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SkillWithAssociation extends Skill {
  association: ChatbotSkillAssociation;
}

export interface CreateSkillInput {
  name: string;
  display_name: string;
  description: string;
  category?: string;
  type?: 'custom' | 'builtin';
  function_schema: Record<string, any>;
  configuration?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateSkillInput {
  display_name?: string;
  description?: string;
  category?: string;
  function_schema?: Record<string, any>;
  configuration?: Record<string, any>;
  is_active?: boolean;
}

export interface CreateAssociationInput {
  chatbot_id: string;
  skill_id: string;
  is_active?: boolean;
  custom_config?: Record<string, any>;
}

export interface SkillExecution {
  id: string;
  skill_id: string;
  chat_session_id: string | null;
  user_id: string | null;
  channel_type: 'web' | 'embed' | 'slack' | 'discord' | 'api' | 'alexa';
  execution_status: 'pending' | 'success' | 'error' | 'timeout';
  input_parameters: Record<string, any> | null;
  output_result: Record<string, any> | null;
  error_message: string | null;
  execution_time_ms: number | null;
  created_at: string;
}

export interface CreateSkillExecutionInput {
  skill_id: string;
  chat_session_id?: string | null;
  user_id?: string | null;
  channel_type?: 'web' | 'embed' | 'slack' | 'discord' | 'api' | 'alexa';
  execution_status: 'pending' | 'success' | 'error' | 'timeout';
  input_parameters?: Record<string, any> | null;
  output_result?: Record<string, any> | null;
  error_message?: string | null;
  execution_time_ms?: number | null;
}

/**
 * Get all skills associated with a specific chatbot
 */
export async function getSkillsForChatbot(chatbotId: string): Promise<SkillWithAssociation[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_skill_associations')
    .select(`
      *,
      skills (*)
    `)
    .eq('chatbot_id', chatbotId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch skills: ${error.message}`);
  }

  return (data || []).map((association: any) => ({
    ...association.skills,
    association: {
      id: association.id,
      chatbot_id: association.chatbot_id,
      skill_id: association.skill_id,
      is_active: association.is_active,
      custom_config: association.custom_config,
      created_at: association.created_at,
      updated_at: association.updated_at,
    },
  }));
}

/**
 * Get only active skills for a specific chatbot
 */
export async function getActiveSkillsForChatbot(chatbotId: string): Promise<SkillWithAssociation[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_skill_associations')
    .select(`
      *,
      skills (*)
    `)
    .eq('chatbot_id', chatbotId)
    .eq('is_active', true)
    .eq('skills.is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active skills: ${error.message}`);
  }

  return (data || []).map((association: any) => ({
    ...association.skills,
    association: {
      id: association.id,
      chatbot_id: association.chatbot_id,
      skill_id: association.skill_id,
      is_active: association.is_active,
      custom_config: association.custom_config,
      created_at: association.created_at,
      updated_at: association.updated_at,
    },
  }));
}

/**
 * Get a specific skill by ID (with user permission check)
 */
export async function getSkillById(skillId: string): Promise<Skill | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No rows returned
    }
    throw new Error(`Failed to fetch skill: ${error.message}`);
  }

  return data;
}

/**
 * Get all skills available to a user (their custom skills + built-in skills)
 */
export async function getAvailableSkills(userId: string): Promise<Skill[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`) // User's skills or built-in skills
    .order('category', { ascending: true })
    .order('display_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch available skills: ${error.message}`);
  }

  return data || [];
}

/**
 * Get skills by category for a user
 */
export async function getSkillsByCategory(userId: string, category: string): Promise<Skill[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('category', category)
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('display_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch skills by category: ${error.message}`);
  }

  return data || [];
}

/**
 * Generate an embedding for a skill description
 */
async function generateEmbeddingForDescription(description: string): Promise<number[] | null> {
  try {
    console.log(`[Skills] Generating embedding for description: ${description}`);
    
    // Generate embedding using OpenAI
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: description,
        dimensions: 1536, // OpenAI default for text-embedding-3-small
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;
    
    console.log(`[Skills] Successfully generated embedding`);
    return embedding;
    
  } catch (error) {
    console.error(`[Skills] Failed to generate embedding:`, error);
    // Return null if embedding generation fails - we don't want to block skill creation
    return null;
  }
}

/**
 * Create a new skill (generates embedding first, then creates skill atomically)
 */
export async function createSkill(input: CreateSkillInput, userId: string): Promise<Skill> {
  const supabase = await createClient();
  
  // Generate embedding first
  const embedding = await generateEmbeddingForDescription(input.description);
  
  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      name: input.name,
      display_name: input.display_name,
      description: input.description,
      category: input.category || 'custom',
      type: input.type || 'custom',
      function_schema: input.function_schema,
      configuration: input.configuration || {},
      is_active: input.is_active ?? true,
      embedding, // Include embedding in the initial insert
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create skill: ${error.message}`);
  }

  if (embedding) {
    console.log(`[Skills] Successfully created skill ${data.id} with embedding`);
  } else {
    console.log(`[Skills] Created skill ${data.id} without embedding (generation failed)`);
  }

  return data;
}

/**
 * Update an existing skill (generates embedding first if description changed, then updates atomically)
 */
export async function updateSkill(skillId: string, input: UpdateSkillInput): Promise<Skill> {
  const supabase = await createClient();
  
  // Prepare update data
  const updateData: any = {
    ...input,
    updated_at: new Date().toISOString(),
  };
  
  // Generate new embedding if description changed
  if (input.description) {
    const embedding = await generateEmbeddingForDescription(input.description);
    updateData.embedding = embedding;
  }
  
  const { data, error } = await supabase
    .from('skills')
    .update(updateData)
    .eq('id', skillId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update skill: ${error.message}`);
  }

  if (input.description && updateData.embedding) {
    console.log(`[Skills] Successfully updated skill ${skillId} with new embedding`);
  } else if (input.description) {
    console.log(`[Skills] Updated skill ${skillId} but embedding generation failed`);
  }

  return data;
}

/**
 * Delete a skill (only if user owns it)
 */
export async function deleteSkill(skillId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId);

  if (error) {
    throw new Error(`Failed to delete skill: ${error.message}`);
  }
}

/**
 * Associate a skill with a chatbot
 */
export async function createSkillAssociation(input: CreateAssociationInput): Promise<ChatbotSkillAssociation> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_skill_associations')
    .insert({
      chatbot_id: input.chatbot_id,
      skill_id: input.skill_id,
      is_active: input.is_active ?? true,
      custom_config: input.custom_config || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create skill association: ${error.message}`);
  }

  return data;
}

/**
 * Update a skill association
 */
export async function updateSkillAssociation(
  associationId: string, 
  updates: { is_active?: boolean; custom_config?: Record<string, any> }
): Promise<ChatbotSkillAssociation> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('chatbot_skill_associations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', associationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update skill association: ${error.message}`);
  }

  return data;
}

/**
 * Remove a skill association from a chatbot
 */
export async function deleteSkillAssociation(associationId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('chatbot_skill_associations')
    .delete()
    .eq('id', associationId);

  if (error) {
    throw new Error(`Failed to delete skill association: ${error.message}`);
  }
}

/**
 * Check if skill name is unique for a user
 */
export async function isSkillNameUnique(userId: string, name: string, excludeSkillId?: string): Promise<boolean> {
  const supabase = await createClient();
  
  let query = supabase
    .from('skills')
    .select('id')
    .eq('user_id', userId)
    .eq('name', name);

  if (excludeSkillId) {
    query = query.neq('id', excludeSkillId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check skill name uniqueness: ${error.message}`);
  }

  return (data?.length || 0) === 0;
}

/**
 * Search skills using semantic similarity (placeholder implementation)
 */
/**
 * Search chatbot skills using vector similarity with fallback to text search
 */
export async function searchChatbotSkills(
  query: string, 
  chatbotId: string, 
  limit: number = 5
): Promise<SkillWithAssociation[]> {
  const supabase = await createClient();
  
  try {
    // First, try vector similarity search
    const queryEmbedding = await generateEmbeddingForDescription(query);
    
    if (queryEmbedding) {
      console.log(`[Skills] Performing vector similarity search for chatbot ${chatbotId}: ${query}`);
      
      const { data, error } = await supabase.rpc('search_chatbot_skills_by_similarity', {
        query_embedding: queryEmbedding,
        chatbot_id_param: chatbotId,
        similarity_threshold: 0.3, // Lower threshold for more results
        match_limit: limit
      });

      if (error) {
        console.error('[Skills] Vector search failed:', error);
        // Fall back to text search
      } else if (data && data.length > 0) {
        console.log(`[Skills] Vector search found ${data.length} results`);
        // Transform RPC results to SkillWithAssociation format
        return data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          name: item.name,
          display_name: item.display_name,
          description: item.description,
          category: item.category,
          type: item.type,
          function_schema: item.function_schema,
          configuration: item.configuration,
          embedding: item.embedding,
          is_active: item.is_active,
          execution_count: item.execution_count,
          last_executed_at: item.last_executed_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
          association: {
            id: item.association_id,
            chatbot_id: chatbotId,
            skill_id: item.id,
            is_active: item.association_is_active,
            custom_config: item.custom_config,
            created_at: item.created_at, // Using skill created_at as fallback
            updated_at: item.updated_at, // Using skill updated_at as fallback
          }
        }));
      } else {
        console.log('[Skills] Vector search returned no results, falling back to text search');
      }
    }
  } catch (error) {
    console.error('[Skills] Vector search error:', error);
    // Fall back to text search
  }

  // Fallback: text-based search on chatbot skills
  console.log(`[Skills] Using text-based search for chatbot ${chatbotId}: ${query}`);
  return getActiveSkillsForChatbot(chatbotId).then(skills => 
    skills.filter(skill => 
      skill.description.toLowerCase().includes(query.toLowerCase()) ||
      skill.display_name.toLowerCase().includes(query.toLowerCase()) ||
      skill.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit)
  );
}

/**
 * Search chatbot skills using vector similarity only (no text fallback)
 * Returns results with similarity scores
 */
export async function searchChatbotSkillsBySimilarity(
  query: string, 
  chatbotId: string, 
  options: {
    limit?: number;
    similarityThreshold?: number;
  } = {}
): Promise<Array<SkillWithAssociation & { similarity: number }>> {
  const { limit = 5, similarityThreshold = 0.5 } = options;
  const supabase = await createClient();
  
  const queryEmbedding = await generateEmbeddingForDescription(query);
  
  if (!queryEmbedding) {
    throw new Error('Failed to generate embedding for search query');
  }

  const { data, error } = await supabase.rpc('search_chatbot_skills_by_similarity', {
    query_embedding: queryEmbedding,
    chatbot_id_param: chatbotId,
    similarity_threshold: similarityThreshold,
    match_limit: limit
  });

  if (error) {
    throw new Error(`Vector similarity search failed: ${error.message}`);
  }

  // Transform RPC results to SkillWithAssociation format with similarity
  return (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    name: item.name,
    display_name: item.display_name,
    description: item.description,
    category: item.category,
    type: item.type,
    function_schema: item.function_schema,
    configuration: item.configuration,
    embedding: item.embedding,
    is_active: item.is_active,
    execution_count: item.execution_count,
    last_executed_at: item.last_executed_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
    association: {
      id: item.association_id,
      chatbot_id: chatbotId,
      skill_id: item.id,
      is_active: item.association_is_active,
      custom_config: item.custom_config,
      created_at: item.created_at,
      updated_at: item.updated_at,
    },
    similarity: item.similarity
  }));
}

/**
 * Legacy function for backward compatibility - searches user's available skills
 * @deprecated Use searchChatbotSkills for chatbot-specific searches
 */
export async function searchSkills(query: string, userId: string, limit: number = 5): Promise<Skill[]> {
  const supabase = await createClient();
  
  // Simple text-based search for user's available skills
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .or(`description.ilike.%${query}%,display_name.ilike.%${query}%,name.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search skills: ${error.message}`);
  }

  return data || [];
}

/**
 * Legacy function kept for backward compatibility - now just calls generateEmbeddingForDescription
 * @deprecated Use generateEmbeddingForDescription directly
 */
async function generateSkillEmbedding(skillId: string, description: string): Promise<void> {
  try {
    const embedding = await generateEmbeddingForDescription(description);
    
    if (embedding) {
      // Store embedding in database
      const supabase = createServiceClient();
      const { error } = await supabase
        .from('skills')
        .update({ embedding })
        .eq('id', skillId);

      if (error) {
        throw new Error(`Failed to store embedding: ${error.message}`);
      }

      console.log(`[Skills] Successfully generated and stored embedding for skill ${skillId}`);
    }
  } catch (error) {
    console.error(`[Skills] Failed to generate embedding for skill ${skillId}:`, error);
    // Don't throw - we don't want operations to fail if embedding generation fails
  }
}

/**
 * Get skill execution statistics (using the existing skill_executions table)
 */
export async function getSkillExecutionStats(skillId: string, days: number = 7): Promise<{
  total_executions: number;
  success_count: number;
  error_count: number;
  avg_execution_time_ms: number;
  success_rate: number;
}> {
  const supabase = await createClient();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('skill_executions')
    .select('execution_status, execution_time_ms')
    .eq('skill_id', skillId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    throw new Error(`Failed to fetch skill execution stats: ${error.message}`);
  }

  const executions = data || [];
  const total = executions.length;
  const successes = executions.filter(e => e.execution_status === 'success').length;
  const errors = executions.filter(e => e.execution_status === 'error').length;
  const avgTime = executions
    .filter(e => e.execution_time_ms !== null)
    .reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / total || 0;

  return {
    total_executions: total,
    success_count: successes,
    error_count: errors,
    avg_execution_time_ms: Math.round(avgTime),
    success_rate: total > 0 ? Math.round((successes / total) * 100) / 100 : 0,
  };
}

/**
 * Log a skill execution
 */
export async function createSkillExecution(input: CreateSkillExecutionInput): Promise<SkillExecution> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skill_executions')
    .insert({
      skill_id: input.skill_id,
      chat_session_id: input.chat_session_id || null,
      user_id: input.user_id || null,
      channel_type: input.channel_type || 'web',
      execution_status: input.execution_status,
      input_parameters: input.input_parameters || null,
      output_result: input.output_result || null,
      error_message: input.error_message || null,
      execution_time_ms: input.execution_time_ms || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log skill execution: ${error.message}`);
  }

  return data;
}

/**
 * Get recent skill executions for a specific skill
 */
export async function getSkillExecutions(skillId: string, limit: number = 50): Promise<SkillExecution[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('skill_executions')
    .select('*')
    .eq('skill_id', skillId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch skill executions: ${error.message}`);
  }

  return data || [];
} 