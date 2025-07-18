import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local and .env files
dotenv.config({ path: '.env.local' });
dotenv.config();

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
 * Script to backfill existing integrations to all chatbots
 * This creates associations between existing integrations and chatbots
 */
async function backfillChatbotIntegrations() {
  const supabase = createScriptServiceClient();
  
  console.log('🚀 Starting chatbot integrations backfill...');

  try {
    // Get all users who have both integrations and chatbots
    const { data: users, error: usersError } = await supabase
      .from('connected_integrations')
      .select('user_id')
      .neq('user_id', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const uniqueUserIds = [...new Set(users.map(u => u.user_id))];
    console.log(`📦 Found ${uniqueUserIds.length} unique users with integrations`);

    let totalAssociations = 0;

    for (const userId of uniqueUserIds) {
      console.log(`\n👤 Processing user: ${userId}`);

      // Get all integrations for this user
      const { data: userIntegrations, error: integrationsError } = await supabase
        .from('connected_integrations')
        .select('id, integration_type, metadata')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (integrationsError) {
        console.error(`❌ Failed to fetch integrations for user ${userId}:`, integrationsError.message);
        continue;
      }

      // Get all chatbots for this user
      const { data: userChatbots, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('id, name')
        .eq('user_id', userId);

      if (chatbotsError) {
        console.error(`❌ Failed to fetch chatbots for user ${userId}:`, chatbotsError.message);
        continue;
      }

      console.log(`   📱 Found ${userIntegrations.length} integrations and ${userChatbots.length} chatbots`);

      if (userIntegrations.length === 0 || userChatbots.length === 0) {
        console.log(`   ⏭️  Skipping user ${userId} (no integrations or chatbots)`);
        continue;
      }

      // Create all possible associations
      const associations = [];
      for (const integration of userIntegrations) {
        for (const chatbot of userChatbots) {
          associations.push({
            chatbot_id: chatbot.id,
            integration_id: integration.id
          });
        }
      }

      console.log(`   🔗 Creating ${associations.length} associations...`);

      // Insert associations (ignore duplicates)
      const { error: associationError } = await supabase
        .from('chatbot_integrations')
        .upsert(associations, { 
          onConflict: 'chatbot_id,integration_id',
          ignoreDuplicates: true 
        });

      if (associationError) {
        console.error(`   ❌ Failed to create associations for user ${userId}:`, associationError.message);
        continue;
      }

      console.log(`   ✅ Successfully created ${associations.length} associations`);
      totalAssociations += associations.length;

      // Show breakdown by integration type
      const breakdown = userIntegrations.map(integration => {
        const integrationName = integration.integration_type;
        const workspaceName = integration.metadata?.team_name || integration.metadata?.guild_name || '';
        return `${integrationName}${workspaceName ? ` (${workspaceName})` : ''}`;
      });
      console.log(`   📋 Integrations: ${breakdown.join(', ')}`);
    }

    console.log(`\n🎉 Backfill completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Processed ${uniqueUserIds.length} users`);
    console.log(`   - Created ${totalAssociations} total associations`);
    console.log(`\n📋 Next steps:`);
    console.log('1. Test a chatbot with connected integrations');
    console.log('2. Try using a built-in skill (e.g., slack_send_message)');
    console.log('3. Verify the skill can access the integration automatically');

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  backfillChatbotIntegrations()
    .then(() => {
      console.log('🏁 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
} 