const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Safe config loading with error handling
let config;
try {
    config = require('./config.js');
} catch (error) {
    console.error('❌ Failed to load config.js:', error.message);
    console.log('Creating default config...');
    config = {
        version: '3.0.0',
        token: process.env.DISCORD_BOT_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        prefix: 'v!',
        embedColors: {
            success: 0x00FF00,
            error: 0xFF0000,
            warning: 0xFFA500,
            info: 0x5865F2
        }
    };
}

// Validate environment variables
function validateEnvironment() {
    const requiredVars = ['DISCORD_BOT_TOKEN'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.error('📝 Please check your .env file and ensure all required variables are set.');
        console.error('💡 Your .env file should contain: DISCORD_BOT_TOKEN=your_bot_token_here');
        process.exit(1);
    }

    // Enhanced token format validation
    const token = process.env.DISCORD_BOT_TOKEN;
    if (token) {
        if (token.length < 50) {
            console.error('❌ Discord bot token appears to be too short. Please check your token.');
            console.error('💡 Valid bot tokens are usually 70+ characters long.');
            console.error('📝 Example format: MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.FgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsT');
            process.exit(1);
        }
        
        if (!token.includes('.')) {
            console.error('❌ Discord bot token format appears invalid. Tokens should contain dots (.)');
            console.error('💡 Make sure you copied the bot token (not client ID or client secret)');
            console.error('📝 Get your bot token from: https://discord.com/developers/applications');
            process.exit(1);
        }
        
        if (token === 'MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GaBcDe.FgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsT') {
            console.error('❌ You are using the example token. Please replace it with your actual bot token.');
            console.error('📝 Get your real bot token from: https://discord.com/developers/applications');
            process.exit(1);
        }
    }
}

// Create a new client instance with enhanced intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

// Create collections for commands and cooldowns
client.commands = new Collection();
client.prefixCommands = new Collection();
client.cooldowns = new Collection();
client.activeHunts = new Collection();
client.activeBattles = new Collection();

// Safe require function for optional modules
function safeRequire(modulePath, fallback = null) {
    try {
        return require(modulePath);
    } catch (error) {
        console.warn(`⚠️ Optional module not found: ${modulePath}`);
        return fallback;
    }
}

// Load command files using enhanced command loader
const CommandLoader = safeRequire('./utils/commandLoader.js');

function loadCommands(dir) {
    if (CommandLoader) {
        try {
            const loader = new CommandLoader(client);
            return loader.loadAllCommands(dir);
        } catch (error) {
            console.error('❌ Command loader failed, falling back to basic loader:', error.message);
            return loadCommandsFallback(dir);
        }
    } else {
        return loadCommandsFallback(dir);
    }
}

// Fallback command loading function
function loadCommandsFallback(dir, categoryMap = new Map()) {
    let loadedCommands = 0;
    let failedCommands = 0;
    let skippedFiles = 0;

    // Check if commands directory exists
    if (!fs.existsSync(dir)) {
        console.warn(`⚠️ Commands directory not found: ${dir}`);
        console.log('Creating commands directory...');
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (error) {
            console.error('❌ Failed to create commands directory:', error.message);
        }
        return { loaded: 0, failed: 0, skipped: 0 };
    }

    const files = fs.readdirSync(dir, { withFileTypes: true });

    // Get the category name from the directory path
    const category = path.relative(path.join(__dirname, 'commands'), dir).split(path.sep)[0] || 'general';

    if (!categoryMap.has(category)) {
        categoryMap.set(category, { loaded: 0, commands: [] });
    }

    console.log(`\n📂 Scanning category: ${category}`);

    for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
            const subDirStats = loadCommands(fullPath, categoryMap);
            loadedCommands += subDirStats.loaded;
            failedCommands += subDirStats.failed;
            skippedFiles += subDirStats.skipped;
        } else if (file.name.endsWith('.js')) {
            try {
                // Clear require cache to avoid stale modules
                delete require.cache[require.resolve(fullPath)];
                const command = require(fullPath);

                if (command && typeof command === 'object' && 'data' in command && 'execute' in command) {
                    // Validate command data structure
                    if (!command.data.name || !command.data.description) {
                        console.log(`   ⚠️ Skipped: ${fullPath}`);
                        console.log(`      ❗ Reason: Invalid command data structure`);
                        skippedFiles++;
                        continue;
                    }

                    client.commands.set(command.data.name, command);
                    // Also register as prefix command
                    client.prefixCommands.set(command.data.name, command);

                    // Add command to category tracking
                    categoryMap.get(category).loaded++;
                    categoryMap.get(category).commands.push(command.data.name);

                    console.log(`   ✅ Loaded: ${command.data.name}`);
                    console.log(`      📍 Path: ${fullPath}`);
                    console.log(`      📝 Description: ${command.data.description}`);
                    loadedCommands++;
                } else {
                    console.log(`   ⚠️ Skipped: ${fullPath}`);
                    console.log(`      ❗ Reason: Missing required properties (data/execute)`);
                    skippedFiles++;
                }
            } catch (error) {
                console.error(`   ❌ Failed: ${fullPath}`);
                console.error(`      ❗ Error: ${error.message}`);
                failedCommands++;
            }
        }
    }

    // Only show summary for top-level directory
    if (dir.endsWith('commands')) {
        console.log('\n📊 Command Loading Summary:');
        console.log(`   ✅ Successfully loaded: ${loadedCommands} commands`);
        console.log(`   ❌ Failed to load: ${failedCommands} commands`);
        console.log(`   ⚠️ Skipped files: ${skippedFiles}\n`);

        // Show category breakdown
        if (categoryMap.size > 0) {
            console.log('📑 Category Breakdown:');
            for (const [category, stats] of categoryMap) {
                console.log(`   ${category}:`);
                console.log(`      📦 Commands loaded: ${stats.loaded}`);
                console.log(`      🔧 Commands: ${stats.commands.join(', ')}\n`);
            }
        }
    }

    return {
        loaded: loadedCommands,
        failed: failedCommands,
        skipped: skippedFiles
    };
}

// Load all commands
const commandsPath = path.join(__dirname, 'commands');
loadCommands(commandsPath);

// Enhanced ready event
client.once('ready', async () => {
    console.log('='.repeat(60));
    console.log(`🎮 ${client.user.tag} is now online!`);
    console.log(`🏴‍☠️ RPG Treasure Hunt Bot v${config.version || '3.0.0'}`);
    console.log(`🎯 Loaded ${client.commands.size} slash commands`);
    console.log(`🌟 Active in ${client.guilds.cache.size} servers`);
    console.log(`⚔️ Serving ${client.users.cache.size} adventurers`);
    console.log('='.repeat(60));

    // Register slash commands with enhanced syncing
    if (client.commands.size > 0) {
        await registerCommands();
    } else {
        console.warn('⚠️ No commands loaded, skipping command registration');
    }

    // Force command cache refresh
    setTimeout(async () => {
        try {
            if (client.application) {
                await client.application.commands.fetch();
                console.log('🔄 Command cache refreshed');
            }
        } catch (error) {
            console.error('❌ Failed to refresh command cache:', error.message);
        }
    }, 5000);

    // Set bot status with gaming theme
    const activities = [
        { name: 'Epic Treasure Hunts', type: ActivityType.Playing },
        { name: 'RPG Adventures', type: ActivityType.Playing },
        { name: 'for /hunt commands', type: ActivityType.Listening },
        { name: 'Dungeon Raids', type: ActivityType.Competing },
        { name: 'Treasure Maps', type: ActivityType.Watching }
    ];

    let activityIndex = 0;

    // Set initial activity
    client.user.setActivity(activities[activityIndex]);

    // Rotate activities every 30 seconds
    setInterval(() => {
        activityIndex = (activityIndex + 1) % activities.length;
        client.user.setActivity(activities[activityIndex]);
    }, 30000);
});

// Enhanced command registration function
async function registerCommands() {
    const commands = [];
    client.commands.forEach(command => {
        try {
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
            } else {
                console.warn(`⚠️ Command ${command.data?.name || 'unknown'} has invalid data structure`);
            }
        } catch (error) {
            console.error(`❌ Failed to serialize command ${command.data?.name || 'unknown'}:`, error.message);
        }
    });

    if (commands.length === 0) {
        console.warn('⚠️ No valid commands to register');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('🔄 Started refreshing application (/) commands...');
        console.log(`📝 Preparing to register ${commands.length} commands`);

        // Register commands globally (takes up to 1 hour to sync)
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${commands.length} global application (/) commands.`);

        // Also register for each guild for instant updates during development
        const guilds = Array.from(client.guilds.cache.values());
        if (guilds.length > 0) {
            for (const guild of guilds) {
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guild.id),
                        { body: commands },
                    );
                    console.log(`✅ Updated commands for guild: ${guild.name}`);
                } catch (guildError) {
                    console.error(`❌ Failed to update commands for guild ${guild.name}:`, guildError.message);
                }
            }
        }

        console.log('🎉 Command registration complete! Commands should be visible immediately.');
    } catch (error) {
        console.error('❌ Error registering commands:', error.message);

        // Fallback: Try to register for current guild only
        if (client.guilds.cache.size > 0) {
            try {
                const firstGuild = client.guilds.cache.first();
                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, firstGuild.id),
                    { body: commands },
                );
                console.log('✅ Fallback: Registered commands for current guild');
            } catch (fallbackError) {
                console.error('❌ Fallback registration also failed:', fallbackError.message);
            }
        }
    }
}

// Initialize interaction handler with safe loading
const InteractionHandler = safeRequire('./handlers/interactionHandler.js');
let interactionHandler;

if (InteractionHandler) {
    try {
        interactionHandler = new InteractionHandler(client);
    } catch (error) {
        console.error('❌ Failed to initialize InteractionHandler:', error.message);
    }
}

// Handle all interactions
client.on('interactionCreate', async (interaction) => {
    try {
        if (interactionHandler) {
            await interactionHandler.handleInteraction(interaction);
        } else {
            // Fallback interaction handling
            await handleInteractionFallback(interaction);
        }
    } catch (error) {
        console.error('Critical interaction error:', error);
        await handleInteractionError(interaction, error);
    }
});

// Fallback interaction handler
async function handleInteractionFallback(interaction) {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            await interaction.reply({
                content: `❌ Command \`${interaction.commandName}\` not found!`,
                ephemeral: true
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            throw error;
        }
    } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction);
    } else if (interaction.isButton()) {
        await interaction.reply({
            content: '⚠️ Button interactions are not fully implemented yet.',
            ephemeral: true
        });
    }
}

// Enhanced error handling for interactions
async function handleInteractionError(interaction, error) {
    try {
        const errorMessage = {
            content: '❌ An error occurred while processing your request. Please try again.',
            ephemeral: true
        };

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply(errorMessage);
        } else if (interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.followUp(errorMessage);
        }
    } catch (e) {
        console.error('Failed to send error message:', e.message);
    }
}

// Handle select menu interactions
async function handleSelectMenuInteraction(interaction) {
    try {
        if (!interaction.values || interaction.values.length === 0) {
            await interaction.reply({
                content: '❌ No selection made.',
                ephemeral: true
            });
            return;
        }

        const [action, ...args] = interaction.values[0].split('_');

        const commandMap = {
            'help': 'help',
            'shop': 'shop',
            'travel': 'travel',
            'achievements': 'achievements',
            'inventory': 'inventory',
            'spell': 'spell',
            'settings': 'settings',
            'stats': 'stats',
            'house': 'house',
            'guild': 'guild',
            'equip': 'equip',
            'equipment': 'equip',
            'casino': 'lottery',
            'lottery': 'lottery',
            'auction': 'auction',
            'battle': 'battle',
            'build': 'build',
            'calendar': 'calendar',
            'daily': 'daily',
            'dungeon': 'dungeon',
            'enchant': 'enchant',
            'excavate': 'excavate',
            'fish': 'fish',
            'gamble': 'gamble',
            'arena': 'arena'
        };

        const commandName = commandMap[action];
        const command = client.commands.get(commandName);

        if (command && command.handleSelectMenu) {
            await command.handleSelectMenu(interaction, args.join('_'));
        } else if (command && action === 'help' && command.showCategoryHelp) {
            await command.showCategoryHelp(interaction, args[0]);
        } else {
            // Generic fallback response
            await interaction.reply({ 
                content: `✅ Selection processed: ${action}${args.length > 0 ? ` - ${args.join(' ')}` : ''}`, 
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Select menu error:', error);

        // Try to load robust error handler if available
        const RobustErrorHandler = safeRequire('./utils/robustErrorHandler.js');
        if (RobustErrorHandler && RobustErrorHandler.handleSelectMenuError) {
            await RobustErrorHandler.handleSelectMenuError(interaction, error, interaction.values?.[0] || 'unknown');
        } else {
            await interaction.reply({
                content: '❌ An error occurred processing your selection.',
                ephemeral: true
            });
        }
    }
}

// Prefix command handler for v! commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = config.prefix || 'v!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);
    if (!command) {
        return message.reply(`❌ Command not found! Try \`${prefix}help\` to see available commands.`);
    }

    // Create enhanced interaction for prefix commands
    const InteractionFixer = safeRequire('./utils/interactionFixer.js');
    let fakeInteraction;

    if (InteractionFixer && InteractionFixer.createPrefixInteraction) {
        fakeInteraction = InteractionFixer.createPrefixInteraction(message, client, commandName);
    } else {
        // Basic fallback fake interaction
        fakeInteraction = {
            user: message.author,
            channel: message.channel,
            guild: message.guild,
            member: message.member,
            reply: async (options) => {
                if (typeof options === 'string') {
                    return message.reply(options);
                }
                return message.reply(options);
            },
            editReply: async (options) => {
                return message.edit(options);
            },
            followUp: async (options) => {
                return message.channel.send(options);
            },
            options: {
                getString: () => args[0] || null,
                getInteger: () => parseInt(args[0]) || null,
                getUser: () => message.mentions.users.first() || null
            },
            replied: false,
            deferred: false
        };
    }

    try {
        await command.execute(fakeInteraction);
    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error.message);

        const RobustErrorHandler = safeRequire('./utils/robustErrorHandler.js');
        if (RobustErrorHandler && RobustErrorHandler.logError) {
            RobustErrorHandler.logError(error, `Prefix command: ${commandName}`);
        }

        const errorEmbed = new EmbedBuilder()
            .setColor(config.embedColors?.error || 0xFF0000)
            .setTitle('❌ Prefix Command Error')
            .setDescription(`Error executing \`${prefix}${commandName}\`. Try using the slash command version: \`/${commandName}\``)
            .addFields([
                { name: 'Command Used', value: `${prefix}${commandName}`, inline: true },
                { name: 'Alternative', value: `/${commandName}`, inline: true }
            ])
            .setFooter({ text: 'Slash commands are more reliable than prefix commands' });

        try {
            await message.reply({ embeds: [errorEmbed] });
        } catch (replyError) {
            console.error('Failed to send prefix error message:', replyError.message);
            // Final fallback
            try {
                await message.channel.send(`❌ Error executing \`${prefix}${commandName}\`. Try \`/${commandName}\` instead.`);
            } catch (channelError) {
                console.error('Failed to send fallback error message:', channelError.message);
            }
        }
    }
});

// Enhanced error handling
client.on('error', error => {
    console.error('Discord client error:', error.message);
});

client.on('warn', warning => {
    console.warn('Discord client warning:', warning);
});

// Handle rate limiting
client.on('rateLimit', (info) => {
    console.warn('Rate limit hit:', info);
});

// Handle disconnections
client.on('disconnect', () => {
    console.warn('⚠️ Disconnected from Discord');
});

client.on('reconnecting', () => {
    console.log('🔄 Reconnecting to Discord...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    // Give time for cleanup before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
    console.log(`Received ${signal}. Graceful shutdown...`);

    try {
        // Clear any active intervals
        clearInterval();

        // Destroy client connection
        client.destroy();

        console.log('✅ Graceful shutdown completed');
    } catch (error) {
        console.error('Error during shutdown:', error.message);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Login to Discord with enhanced error handling
async function startBot() {
    validateEnvironment(); // Call the validation function before login
    try {
        await client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
        console.error('❌ Failed to login to Discord:', error.message);

        if (error.code === 'TokenInvalid') {
            console.error('❌ Invalid bot token. Please check your DISCORD_BOT_TOKEN environment variable.');
        } else if (error.code === 'DisallowedIntents') {
            console.error('❌ Missing required intents. Please enable them in the Discord Developer Portal.');
        } else {
            console.error('❌ Login failed with error code:', error.code);
        }

        process.exit(1);
    }
}

// Start the bot
startBot();