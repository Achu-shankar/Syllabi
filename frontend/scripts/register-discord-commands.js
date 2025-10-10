const fs = require('fs');

// Load environment variables from .env.local
if (fs.existsSync('.env.local')) {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();
        // Remove comments from the end of the line
        const commentIndex = value.indexOf('#');
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex).trim();
        }
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

async function registerDiscordCommands() {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!DISCORD_CLIENT_ID || !DISCORD_BOT_TOKEN) {
    console.error('Missing Discord environment variables: DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN');
    process.exit(1);
  }

  const commands = [
    {
      name: 'ask',
      description: 'Ask Syllabi a question from your knowledge base',
      options: [
        {
          name: 'question',
          type: 3, // STRING type
          description: 'Your question',
          required: true,
        },
        {
          name: 'bot',
          type: 3, // STRING type
          description: 'Specific chatbot to query (optional)',
          required: false,
        },
      ],
    },
  ];

  try {
    console.log('Registering Discord slash commands...');
    
    const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register commands: ${response.status} ${error}`);
    }

    const result = await response.json();
    console.log('Successfully registered Discord commands:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error registering Discord commands:', error);
    process.exit(1);
  }
}

registerDiscordCommands(); 