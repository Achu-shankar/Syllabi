import dotenv from 'dotenv';
import { createServiceClient } from '../src/utils/supabase/service';
import { discordSkills } from '../src/services/skills/builtin/discord';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabase = createServiceClient();

async function generateEmbeddingForDescription(description: string): Promise<number[] | null> {
  try {
    console.log(`[Embedding] Generating embedding for: "${description.substring(0, 50)}..."`);
    
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[Embedding] OPENAI_API_KEY not found, skipping embedding generation');
      return null;
    }
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: description,
        model: 'text-embedding-3-small',
        dimensions: 1536,
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
    return null;
  }
}

async function seedDiscordBuiltinSkills() {
  console.log('🚀 Starting Discord built-in skills seeding...');
  console.log(`📦 Found ${discordSkills.length} skill(s) to seed`);

  for (const skill of discordSkills) {
    try {
      console.log(`📝 Processing skill: ${skill.name} (${skill.display_name})`);

      // Generate embedding for the skill description ONLY (matching Slack implementation)
      const embedding = await generateEmbeddingForDescription(skill.description);

      // Check if skill already exists
      const { data: existingSkill, error: fetchError } = await supabase
        .from('skills')
        .select('id, name')
        .eq('name', skill.name)
        .eq('type', 'builtin')
        .maybeSingle();

      if (fetchError) {
        console.error(`❌ Error checking existing skill ${skill.name}:`, fetchError.message);
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

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error processing skill ${skill.name}:`, error);
    }
  }

  console.log('🎉 Discord built-in skills seeding completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Users can now see these skills in their skills page');
  console.log('2. To use them, users need to connect their Discord integration');
  console.log('3. The skills will automatically appear when Discord is connected');
  console.log('4. Skills with embeddings will be better discoverable in semantic search');
}

// Run the seeding
seedDiscordBuiltinSkills().catch(console.error); 