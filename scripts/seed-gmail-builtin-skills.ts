import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GMAIL_SKILL_DEFINITIONS } from '../src/services/skills/builtin/gmail';

// Load environment variables from .env.local and .env files
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * Generate embedding for skill description using OpenAI
 */
async function generateEmbeddingForDescription(description: string): Promise<number[] | null> {
  try {
    console.log(`[Embedding] Generating embedding for: "${description.substring(0, 50)}..."`);
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Embedding] OPENAI_API_KEY not found, skipping embedding generation');
      return null;
    }
    
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
    
    console.log(`[Embedding] Successfully generated embedding (${embedding.length} dimensions)`);
    return embedding;
    
  } catch (error) {
    console.error(`[Embedding] Failed to generate embedding:`, error);
    // Return null if embedding generation fails - we don't want to block skill creation
    return null;
  }
}

/**
 * Create service client for scripts (loads env vars directly)
 */
function createScriptServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required. Please check your .env.local file.');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Please add it to your .env.local file.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Script to seed built-in Gmail skills to the database
 * Run with: npx tsx scripts/seed-gmail-builtin-skills.ts
 */
async function seedGmailBuiltinSkills() {
  const supabase = createScriptServiceClient();
  
  console.log('🚀 Starting Gmail built-in skills seeding...');
  console.log(`📦 Found ${GMAIL_SKILL_DEFINITIONS.length} skill(s) to seed`);

  try {
    for (const skill of GMAIL_SKILL_DEFINITIONS) {
      console.log(`📝 Seeding skill: ${skill.name} (${skill.display_name})`);
      
      // Generate embedding for the skill description
      const embedding = await generateEmbeddingForDescription(skill.description);
      
      // First, check if the skill already exists
      const { data: existingSkill, error: checkError } = await supabase
        .from('skills')
        .select('id, name')
        .eq('name', skill.name)
        .eq('type', 'builtin')
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Error checking existing skill ${skill.name}:`, checkError.message);
        continue;
      }

      const skillData = {
        name: skill.name,
        display_name: skill.display_name,
        description: skill.description,
        category: skill.category,
        type: skill.type,
        is_active: skill.is_active,
        user_id: skill.user_id,
        function_schema: skill.function_schema,
        configuration: skill.configuration,
        updated_at: new Date().toISOString(),
        ...(embedding && { embedding: embedding }), // Only add if embedding was generated
      };

      let result;
      if (existingSkill) {
        // Update existing skill
        console.log(`🔄 Updating existing skill: ${skill.name}`);
        result = await supabase
          .from('skills')
          .update(skillData)
          .eq('id', existingSkill.id)
          .select('id, name, display_name')
          .single();
      } else {
        // Insert new skill
        console.log(`➕ Creating new skill: ${skill.name}`);
        result = await supabase
          .from('skills')
          .insert(skillData)
          .select('id, name, display_name')
          .single();
      }

      if (result.error) {
        console.error(`❌ Failed to seed skill ${skill.name}:`, result.error.message);
        continue;
      }

      const embeddingStatus = embedding ? '✅ with embedding' : '⚠️ without embedding';
      console.log(`✅ Successfully seeded: ${result.data.name} (ID: ${result.data.id}) ${embeddingStatus}`);
    }

    console.log('🎉 Gmail built-in skills seeding completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Users can now see these skills in their skills page');
    console.log('2. To use them, users need to connect their Google integration');
    console.log('3. The skills will automatically appear when Google is connected');
    console.log('4. Skills with embeddings will be better discoverable in semantic search');

  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  seedGmailBuiltinSkills()
    .then(() => {
      console.log('🏁 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
} 