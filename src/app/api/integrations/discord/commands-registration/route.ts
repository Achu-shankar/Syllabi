import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_APPLICATION_ID = process.env.DISCORD_CLIENT_ID!;

interface RegisterCommandRequest {
  action: 'register' | 'unregister';
  guildId: string; // Discord guild ID (the snowflake, not our internal UUID)
  commandName: string;
  chatbotName?: string; // For description purposes
}

export async function POST(request: NextRequest) {
  try {
    const { action, guildId, commandName, chatbotName }: RegisterCommandRequest = await request.json();

    if (!action || !guildId || !commandName) {
      return NextResponse.json(
        { error: 'Missing required fields: action, guildId, commandName' },
        { status: 400 }
      );
    }

    if (action === 'register') {
      // Register a new guild-specific slash command
      const commandData = {
        name: commandName,
        description: `Ask ${chatbotName || commandName} chatbot`,
        options: [
          {
            name: 'question',
            description: 'Your question',
            type: 3, // STRING type
            required: true,
          },
        ],
      };

      const response = await fetch(
        `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${guildId}/commands`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(commandData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Discord API error (register):', response.status, errorData);
        return NextResponse.json(
          { error: `Failed to register command: ${response.status}` },
          { status: 500 }
        );
      }

      const registeredCommand = await response.json();
      console.log(`Successfully registered /${commandName} for guild ${guildId}`);
      
      return NextResponse.json({
        success: true,
        action: 'register',
        commandId: registeredCommand.id,
        commandName,
        guildId,
      });

    } else if (action === 'unregister') {
      // First, get all commands for this guild to find the one to delete
      const getCommandsResponse = await fetch(
        `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${guildId}/commands`,
        {
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          },
        }
      );

      if (!getCommandsResponse.ok) {
        const errorData = await getCommandsResponse.text();
        console.error('Discord API error (get commands):', getCommandsResponse.status, errorData);
        return NextResponse.json(
          { error: `Failed to fetch commands: ${getCommandsResponse.status}` },
          { status: 500 }
        );
      }

      const commands = await getCommandsResponse.json();
      const commandToDelete = commands.find((cmd: any) => cmd.name === commandName);

      if (!commandToDelete) {
        console.log(`Command /${commandName} not found in guild ${guildId}, may already be deleted`);
        return NextResponse.json({
          success: true,
          action: 'unregister',
          message: 'Command not found (may already be deleted)',
          commandName,
          guildId,
        });
      }

      // Delete the specific command
      const deleteResponse = await fetch(
        `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${guildId}/commands/${commandToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.text();
        console.error('Discord API error (delete):', deleteResponse.status, errorData);
        return NextResponse.json(
          { error: `Failed to delete command: ${deleteResponse.status}` },
          { status: 500 }
        );
      }

      console.log(`Successfully unregistered /${commandName} from guild ${guildId}`);
      
      return NextResponse.json({
        success: true,
        action: 'unregister',
        commandName,
        guildId,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "register" or "unregister"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Discord commands registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 