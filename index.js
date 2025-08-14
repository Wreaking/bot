require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('./utils/dbInit');

// Create the Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel]
});

// Initialize collections
client.commands = new Collection();

// Load commands function
async function loadCommands(dirPath) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            await loadCommands(fullPath);
            continue;
        }
        
        if (!file.endsWith('.js')) continue;
        
        try {
            const command = require(fullPath);
            if (command.name) {
                client.commands.set(command.name.toLowerCase(), command);
                console.log(`Loaded command: ${command.name}`);
            }
        } catch (error) {
            console.error(`Failed to load command ${file}:`, error);
        }
    }
}

// Load all commands
(async () => {
    try {
        await loadCommands(path.join(__dirname, 'commands'));
        console.log(`📁 Commands loaded: ${client.commands.size}`);
    } catch (error) {
        console.error('Failed to load commands:', error);
    }
})();

// When the bot is ready
client.once('ready', async () => {
    try {
        await initializeDatabase();
        console.log('='.repeat(40));
        console.log(`✅ Bot is online as ${client.user.tag}`);
        console.log(`📁 Commands: ${client.commands.size}`);
        console.log(`🎯 Active in ${client.guilds.cache.size} servers`);
        console.log('='.repeat(40));
        console.log('\n');
    } catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
});

// Message command handler (v! prefix)
client.on('messageCreate', async message => {
    if (!message.content.startsWith('v!') || message.author.bot) return;

    const args = message.content.slice(2).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(`Error executing command ${commandName}:`, error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Command Error')
            .setDescription('There was an error while executing this command.')
            .setFooter({ text: 'Please try again later or contact support if the issue persists.' });

        await message.reply({ embeds: [errorEmbed] }).catch(console.error);
    }
});

// Error handling
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login
client.login(process.env.TOKEN);
