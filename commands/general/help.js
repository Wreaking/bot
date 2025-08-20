const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const commandCategories = {
    general: { name: 'General', emoji: '📜', description: 'Basic and utility commands', color: '#7289DA' },
    admin: { name: 'Admin', emoji: '⚙️', description: 'Server management commands', color: '#34495E' },
    alchemy: { name: 'Alchemy', emoji: '🧪', description: 'Potion brewing and transmutation', color: '#9B59B6' },
    bank: { name: 'Banking', emoji: '🏦', description: 'Financial management and loans', color: '#F39C12' },
    blacksmith: { name: 'Blacksmith', emoji: '⚒️', description: 'Weapon and armor crafting', color: '#8E44AD' },
    combat: { name: 'Combat', emoji: '⚔️', description: 'Battle monsters and other players', color: '#E74C3C' },
    crafting: { name: 'Crafting', emoji: '🔨', description: 'Create items and equipment', color: '#8E44AD' },
    economy: { name: 'Economy', emoji: '💰', description: 'Manage your wealth and trade items', color: '#F1C40F' },
    exploration: { name: 'Exploration', emoji: '🗺️', description: 'Explore dungeons and find treasures', color: '#27AE60' },
    farming: { name: 'Farming', emoji: '🌾', description: 'Grow crops and manage resources', color: '#2ECC71' },
    fishing: { name: 'Fishing', emoji: '🎣', description: 'Catch fish and aquatic treasures', color: '#3498DB' },
    gambling: { name: 'Gambling', emoji: '🎲', description: 'Games of chance and luck', color: '#E67E22' },
    games: { name: 'Games', emoji: '🎮', description: 'Entertainment and minigames', color: '#E67E22' },
    housing: { name: 'Housing', emoji: '🏠', description: 'Build and decorate your home', color: '#95A5A6' },
    magic: { name: 'Magic', emoji: '✨', description: 'Cast spells and use magical abilities', color: '#9B59B6' },
    merchant: { name: 'Merchant', emoji: '🏪', description: 'Trading and commerce activities', color: '#F39C12' },
    mining: { name: 'Mining', emoji: '⛏️', description: 'Extract valuable resources', color: '#95A5A6' },
    pets: { name: 'Pets', emoji: '🐕', description: 'Manage and train your companions', color: '#E91E63' },
    quests: { name: 'Quests', emoji: '📜', description: 'Adventure missions and objectives', color: '#3F51B5' },
    rpg: { name: 'RPG', emoji: '🎯', description: 'Core RPG mechanics and battles', color: '#E74C3C' },
    skills: { name: 'Skills', emoji: '📈', description: 'Character progression and mastery', color: '#FF9800' },
    social: { name: 'Social', emoji: '👥', description: 'Interact with other players', color: '#3498DB' },
    tavern: { name: 'Tavern', emoji: '🍺', description: 'Social hub and rest area', color: '#D35400' },
    transportation: { name: 'Transportation', emoji: '🚂', description: 'Travel and movement systems', color: '#607D8B' },
    utility: { name: 'Utility', emoji: '🛠️', description: 'Various helpful commands', color: '#95A5A6' },
    weather: { name: 'Weather', emoji: '🌤️', description: 'Weather system and alerts', color: '#00BCD4' }
};

// Updated commands based on your screenshots
const actualCommands = {
    general: ['backup', 'help', 'hunt', 'invite', 'leaderboard', 'ping', 'riddle', 'solve', 'status', 'treasure', 'work'],
    admin: ['manage'],
    alchemy: ['brew', 'potion', 'transmute'],
    bank: ['bank', 'loan', 'transfer'],
    blacksmith: ['forge', 'repair', 'upgrade'],
    combat: ['arena', 'tournament'],
    crafting: ['craft', 'recipes', 'specialize', 'workbench'],
    economy: ['auction', 'daily', 'inventory', 'invest', 'profile', 'shop'],
    exploration: ['dungeon', 'fish', 'forage', 'mine', 'scout'],
    farming: ['farm', 'garden', 'harvest', 'plant', 'water'],
    fishing: ['market', 'fishing', 'spots', 'tackle'],
    gambling: ['gamble', 'roulette', 'slots'],
    games: ['lottery', 'slots'],
    housing: ['build', 'decorate', 'house', 'room'],
    magic: ['enchant', 'research', 'spell', 'spellcraft'],
    merchant: ['bazaar', 'caravan', 'market', 'merchant'],
    mining: ['excavate', 'tunnel'],
    pets: ['pet', 'stable', 'train'],
    quests: ['adventure', 'quest'],
    rpg: ['battle', 'dungeon'],
    skills: ['mastery', 'profession', 'train'],
    social: ['achievements', 'guild', 'rankings'],
    tavern: ['inn', 'tavern'],
    transportation: ['mount', 'travel'],
    utility: ['calendar', 'convert', 'info', 'map', 'settings', 'stats', 'tips', 'vote'],
    weather: ['alert', 'weather']
};

// Enhanced command descriptions
const commandDescriptions = {
    // General
    backup: 'Create a backup of your game data and progress',
    help: 'Get comprehensive help with all available commands',
    hunt: 'Hunt for treasures and rare items in various locations',
    invite: 'Invite the bot to other servers or get server invite links',
    leaderboard: 'View top players and server rankings',
    ping: 'Check bot response time and connection status',
    riddle: 'Solve challenging riddles for rewards and experience',
    solve: 'Solve puzzles and brain teasers',
    status: 'Check your current character status and active effects',
    treasure: 'Search for hidden treasures in your current location',
    work: 'Perform jobs and tasks to earn coins and experience',
    
    // Admin
    manage: 'Access server management and configuration tools',
    
    // Economy
    auction: 'Participate in item auctions and bidding wars',
    daily: 'Claim your daily rewards including coins, items, and bonuses',
    inventory: 'Manage your items, equipment, and materials',
    invest: 'Invest coins in various opportunities for returns',
    profile: 'View your character stats, achievements, and progress',
    shop: 'Browse and purchase items, equipment, and upgrades',
    
    // Combat & RPG
    arena: 'Engage in player vs player combat and tournaments',
    battle: 'Fight against monsters and enemies',
    tournament: 'Join competitive tournaments and events',
    dungeon: 'Explore dangerous dungeons for epic rewards',
    
    // Crafting & Skills
    craft: 'Create powerful items using materials and recipes',
    recipes: 'Browse available crafting recipes and requirements',
    specialize: 'Choose specializations for your crafting skills',
    workbench: 'Access advanced crafting stations and tools',
    forge: 'Smith weapons and armor at the blacksmith',
    repair: 'Fix damaged equipment and restore durability',
    upgrade: 'Enhance your equipment with better stats',
    brew: 'Create potions and alchemical items',
    potion: 'Manage and use your potion collection',
    transmute: 'Transform materials into different resources',
    
    // Social & Guild
    guild: 'Join guilds, manage guild activities, and earn bonuses',
    achievements: 'Track your accomplishments and unlock rewards',
    rankings: 'View player rankings in various categories',
    
    // Exploration & Activities
    explore: 'Discover new areas and hidden secrets',
    scout: 'Gather information about areas before exploring',
    forage: 'Search for natural resources and materials',
    farm: 'Tend to your crops and agricultural activities',
    garden: 'Manage your personal garden and plants',
    harvest: 'Collect mature crops and garden produce',
    plant: 'Sow seeds and start new crops',
    water: 'Water your plants to help them grow',
    
    // Banking & Finance
    bank: 'Store money safely and earn interest over time',
    loan: 'Apply for loans or manage existing debt',
    transfer: 'Send money to other players securely',
    
    // Pets & Companions
    pet: 'Manage your pet companions and their abilities',
    stable: 'House and care for your animal companions',
    train: 'Improve your skills or train your pets',
    
    // Utility & Info
    calendar: 'View upcoming events and scheduled activities',
    convert: 'Convert between different currencies and units',
    info: 'Get detailed information about game mechanics',
    map: 'View maps and navigate the game world',
    settings: 'Customize your game preferences and options',
    stats: 'View detailed statistics about your gameplay',
    tips: 'Get helpful tips and strategies for playing',
    vote: 'Vote for the bot and receive special rewards',
    
    // Weather & Environment
    alert: 'Set up alerts for weather and game events',
    weather: 'Check current weather conditions and forecasts'
};

// Active collectors to prevent memory leaks
const activeCollectors = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 Get comprehensive help with treasure hunting commands')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Specific command category to view')
                .setRequired(false)
                .addChoices(
                    ...Object.entries(commandCategories).map(([key, cat]) => ({
                        name: `${cat.emoji} ${cat.name}`,
                        value: key
                    }))))
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed help for a specific command')
                .setRequired(false)),

    cooldown: 3, // 3 seconds cooldown for help command

    async execute(interaction) {
        try {
            // Defer the reply since help command might take time to generate
            await interaction.deferReply();

            // Clean up any existing collector for this user
            this.cleanupCollector(interaction.user.id);
            
            const category = interaction.options?.getString('category');
            const specificCommand = interaction.options?.getString('command');

            // Validate category if provided
            if (category && !commandCategories[category]) {
                return await interaction.editReply({
                    content: '❌ Invalid category selected. Please use the autocomplete menu to select a valid category.',
                    ephemeral: true
                });
            }
            
            if (specificCommand) {
                return await this.showSpecificCommandHelp(interaction, specificCommand);
            }
            
            if (category) {
                return await this.showCategoryHelp(interaction, category);
            }

            // Show main help menu
            await this.showMainHelp(interaction);

        } catch (error) {
            console.error('Error in help command:', error);
            await this.handleCommandError(interaction, error);
        }
    },

    async showSpecificCommandHelp(interaction, commandName) {
        try {
            let foundCategory = null;
            let commandExists = false;

            // Find command in categories
            for (const [category, commands] of Object.entries(actualCommands)) {
                if (commands.includes(commandName.toLowerCase())) {
                    foundCategory = category;
                    commandExists = true;
                    break;
                }
            }

            if (!commandExists) {
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('❌ Command Not Found')
                    .setDescription(`╔════════════════════════════════════╗\n║        **Command Not Found**       ║\n╚════════════════════════════════════╝\n\nThe command \`/${commandName}\` doesn't exist in our system.`)
                    .addFields(
                        { 
                            name: '🔍 **Did you mean?**', 
                            value: this.getSuggestions(commandName),
                            inline: false
                        },
                        { 
                            name: '💡 **Quick Actions**', 
                            value: '• Use the dropdown below to browse categories\n• Try `/help` to see all commands\n• Check your spelling',
                            inline: false
                        }
                    )
                    .setFooter({ text: '💎 Use the navigation below to explore commands' })
                    .setTimestamp();
                
                const components = this.createNavigationComponents('main');
                await interaction.editReply({ embeds: [embed], components });
                await this.setupCollector(interaction);
                return;
            }

            const categoryInfo = commandCategories[foundCategory];
            const description = commandDescriptions[commandName] || `A ${categoryInfo.name.toLowerCase()} command for ${categoryInfo.description.toLowerCase()}.`;
            
            const embed = new EmbedBuilder()
                .setColor(categoryInfo.color)
                .setTitle(`📖 Command Guide: /${commandName}`)
                .setDescription(`╔════════════════════════════════════╗\n║     **${commandName.charAt(0).toUpperCase() + commandName.slice(1)} Command Details**     ║\n╚════════════════════════════════════╝`)
                .addFields(
                    {
                        name: '📂 **Category**',
                        value: `${categoryInfo.emoji} **${categoryInfo.name}**`,
                        inline: true
                    },
                    {
                        name: '🎯 **Usage**',
                        value: `\`\`\`fix\n/${commandName}\n\`\`\``,
                        inline: true
                    },
                    {
                        name: '⭐ **Command Type**',
                        value: this.getCommandType(foundCategory),
                        inline: true
                    },
                    {
                        name: '📝 **Description**',
                        value: `${description}`,
                        inline: false
                    },
                    {
                        name: '🔗 **Related Commands**',
                        value: this.getRelatedCommands(foundCategory, commandName),
                        inline: false
                    }
                )
                .setFooter({ text: `💎 Part of ${categoryInfo.name} • Use navigation below to explore more` })
                .setTimestamp();

            const components = this.createNavigationComponents('command', foundCategory);
            await interaction.editReply({ embeds: [embed], components });
            await this.setupCollector(interaction);

        } catch (error) {
            console.error('Error showing specific command help:', error);
            await this.handleCommandError(interaction, error);
        }
    },

    async showMainHelp(interaction) {
        try {
            const totalCommands = Object.values(actualCommands).flat().length;
            const activeCategories = Object.entries(actualCommands).filter(([_, commands]) => commands.length > 0).length;
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏴‍☠️ Treasure Hunter\'s Command Center')
                .setDescription('╔══════════════════════════════════════╗\n║    **Ultimate RPG Adventure Bot**   ║\n║        *Interactive Command Hub*     ║\n╚══════════════════════════════════════╝\n\n🌟 *Embark on epic quests with powerful commands!*')
                .addFields(
                    {
                        name: '🚀 **Quick Start Adventures**',
                        value: '```ansi\n\u001b[0;33m/daily\u001b[0m     → Claim daily treasures\n\u001b[0;32m/hunt\u001b[0m      → Begin treasure hunting\n\u001b[0;34m/shop\u001b[0m      → Purchase epic equipment\n\u001b[0;35m/guild\u001b[0m     → Join fellow adventurers```',
                        inline: false
                    },
                    {
                        name: '📊 **Command Statistics**',
                        value: `🎯 **${totalCommands}** Total Commands\n📂 **${activeCategories}** Active Categories\n🟢 **Online** Bot Status\n⚡ **Interactive** Menus`,
                        inline: true
                    },
                    {
                        name: '🔥 **Popular Commands**',
                        value: '🥇 `/daily` - *Daily rewards*\n🥈 `/hunt` - *Treasure hunting*\n🥉 `/shop` - *Equipment store*\n🏆 `/profile` - *Your stats*\n🌟 `/leaderboard` - *Top players*',
                        inline: true
                    },
                    {
                        name: '💡 **Pro Tips**',
                        value: '• 📱 Use dropdown menus for easy navigation\n• 🔍 Search specific commands with `/help command:`\n• ⚡ Bookmark frequently used commands\n• 🎮 Try interactive command combinations',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: '💎 Select a category below to explore commands • Interactive menus expire in 5 minutes'
                })
                .setTimestamp();

            // Add animated category showcase
            embed.addFields(this.createAnimatedCategoryShowcase());

            const components = this.createNavigationComponents('main');
            await interaction.editReply({ embeds: [embed], components });
            await this.setupCollector(interaction);

        } catch (error) {
            console.error('Error showing main help:', error);
            await this.handleCommandError(interaction, error);
        }
    },

    createAnimatedCategoryShowcase() {
        const showcaseFields = [];
        const categories = Object.entries(commandCategories).filter(([key]) => 
            actualCommands[key] && actualCommands[key].length > 0
        );
        
        // Create animated grid layout
        for (let i = 0; i < categories.length; i += 3) {
            const row = categories.slice(i, i + 3);
            
            row.forEach(([key, category]) => {
                const count = actualCommands[key]?.length || 0;
                const intensity = count > 10 ? '🔥' : count > 5 ? '⚡' : '✨';
                
                showcaseFields.push({
                    name: `${category.emoji} **${category.name}** ${intensity}`,
                    value: `*${category.description}*\n\`${count} commands\``,
                    inline: true
                });
            });
            
            // Add spacer for better formatting
            if (row.length === 3 && i + 3 < categories.length) {
                showcaseFields.push({
                    name: '\u200B',
                    value: '━━━━━━━━━━━━━━━━',
                    inline: false
                });
            }
        }
        
        return showcaseFields;
    },

    async showCategoryHelp(interaction, category) {
        try {
            const categoryInfo = commandCategories[category];
            if (!categoryInfo) {
                await this.handleCategoryError(interaction, category);
                return;
            }

            const commands = actualCommands[category] || [];
            const commandCount = commands.length;
            
            const embed = new EmbedBuilder()
                .setColor(categoryInfo.color)
                .setTitle(`${categoryInfo.emoji} ${categoryInfo.name} Command Center`)
                .setDescription(`╔═══════════════════════════════════════╗\n║       **${categoryInfo.description}**       ║\n╚═══════════════════════════════════════╝\n\n🎯 *Specialized tools for ${categoryInfo.name.toLowerCase()} activities*`)
                .setTimestamp();

            if (commandCount === 0) {
                embed.addFields({
                    name: '🚧 **Coming Soon**',
                    value: `The ${categoryInfo.name} category is currently under development.\n\n🔔 **Get notified:** New commands will be added soon!\n📈 **Status:** Planning & Development Phase`,
                    inline: false
                });
            } else {
                // Create visual command grid
                const commandChunks = this.chunkArray(commands, 8);
                
                commandChunks.forEach((chunk, index) => {
                    const commandList = chunk.map((cmd) => {
                        const emoji = this.getCommandEmoji(cmd, categoryInfo.emoji);
                        return `${emoji} \`/${cmd}\``;
                    }).join(' • ');
                    
                    embed.addFields({
                        name: index === 0 ? '📋 **Available Commands**' : '\u200B',
                        value: commandList,
                        inline: false
                    });
                });

                // Add category statistics and tips
                embed.addFields(
                    {
                        name: '📈 **Category Statistics**',
                        value: `🎯 **${commandCount}** commands available\n${categoryInfo.emoji} **${categoryInfo.name}** category\n⭐ **Difficulty:** ${this.getCategoryDifficulty(category)}`,
                        inline: true
                    },
                    {
                        name: '💡 **Usage Tips**',
                        value: this.getCategoryTips(category),
                        inline: true
                    },
                    {
                        name: '🔗 **Quick Access**',
                        value: 'Use the command dropdown below to get detailed information about any command in this category.',
                        inline: false
                    }
                );
            }

            const components = this.createNavigationComponents('category', category);
            await interaction.editReply({ embeds: [embed], components });
            await this.setupCollector(interaction);

        } catch (error) {
            console.error('Error in showCategoryHelp:', error);
            await this.handleCommandError(interaction, error);
        }
    },

    async showGettingStarted(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🔰 Adventure Beginner\'s Guide')
            .setDescription('╔══════════════════════════════════════╗\n║      **Welcome, New Adventurer!**   ║\n║       *Your Journey Starts Here*    ║\n╚══════════════════════════════════════╝\n\n🌟 Follow this step-by-step guide to become a legendary treasure hunter!')
            .addFields(
                { 
                    name: '🎯 **Step 1: Daily Foundation**', 
                    value: '```ansi\n\u001b[0;33m/daily\u001b[0m\n```\n🌅 Start each day by claiming **free coins**, **experience**, and **bonus items**!\n💰 *Builds your initial wealth foundation*', 
                    inline: false 
                },
                { 
                    name: '🛡️ **Step 2: Equipment Setup**', 
                    value: '```ansi\n\u001b[0;34m/shop\u001b[0m → \u001b[0;36m/inventory\u001b[0m\n```\n⚔️ Buy your **first tools** and **equipment** to boost success rates!\n📦 *Essential for effective treasure hunting*', 
                    inline: false 
                },
                { 
                    name: '🗺️ **Step 3: Begin Adventures**', 
                    value: '```ansi\n\u001b[0;32m/hunt\u001b[0m • \u001b[0;35m/explore\u001b[0m • \u001b[0;31m/scout\u001b[0m\n```\n💎 Start **hunting treasures**, **exploring areas**, and **discovering secrets**!\n🎲 *Each adventure brings unique rewards*', 
                    inline: false 
                },
                { 
                    name: '👥 **Step 4: Social Connection**', 
                    value: '```ansi\n\u001b[0;35m/guild\u001b[0m → \u001b[0;33m/leaderboard\u001b[0m\n```\n🤝 **Join a guild** for bonuses and make friends with fellow adventurers!\n🏆 *Competition drives improvement*', 
                    inline: false 
                },
                { 
                    name: '📊 **Step 5: Progress Tracking**', 
                    value: '```ansi\n\u001b[0;34m/profile\u001b[0m • \u001b[0;32m/stats\u001b[0m • \u001b[0;35m/achievements\u001b[0m\n```\n📈 **Monitor your growth**, **track achievements**, and **plan next steps**!\n🎯 *Knowledge is power*', 
                    inline: false 
                }
            )
            .addFields(
                {
                    name: '🚀 **Advanced Tips**',
                    value: '🔥 Combine commands for **combo effects**\n⚡ Time your activities for **bonus periods**\n💡 Join **community events** for rare rewards\n🎮 Experiment with different **command strategies**',
                    inline: true
                },
                {
                    name: '⚠️ **Common Mistakes**',
                    value: '❌ Forgetting daily rewards\n❌ Ignoring equipment upgrades\n❌ Playing solo without guild benefits\n❌ Not checking quest requirements',
                    inline: true
                }
            )
            .setFooter({ text: '💎 Ready to become a legendary treasure hunter? Start with /daily!' })
            .setTimestamp();

        const components = this.createNavigationComponents('guide');
        await interaction.editReply({ embeds: [embed], components });
        await this.setupCollector(interaction);
    },

    async showCommandsList(interaction) {
        try {
            const totalCommands = Object.values(actualCommands).flat().length;
            const embed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('📜 Complete Command Directory')
                .setDescription('╔═══════════════════════════════════════╗\n║        **All Available Commands**     ║\n║      *Organized by functionality*     ║\n╚═══════════════════════════════════════╝\n\n🎯 *Browse through all available commands organized by category*')
                .setTimestamp();

            // Create organized command listing with better formatting
            Object.entries(actualCommands).forEach(([category, commands]) => {
                const categoryInfo = commandCategories[category];
                if (commands.length > 0) {
                    // Create visually appealing command list
                    const commandDisplay = commands.map((cmd) => {
                        const emoji = this.getCommandEmoji(cmd, categoryInfo.emoji);
                        return `${emoji}\`/${cmd}\``;
                    }).join(' • ');
                    
                    const intensity = commands.length > 10 ? ' 🔥' : commands.length > 5 ? ' ⚡' : ' ✨';
                    
                    embed.addFields({
                        name: `${categoryInfo.emoji} **${categoryInfo.name}**${intensity} (${commands.length} commands)`,
                        value: `${commandDisplay}${commands.length > 15 ? `\n*+${commands.length - 15} more commands available in category*` : ''}`,
                        inline: false
                    });
                }
            });

            embed.addFields({
                name: '📊 **Directory Statistics**',
                value: `🎯 **${totalCommands}** total commands\n📂 **${Object.keys(actualCommands).length}** categories\n⚡ **Interactive** help system\n🔍 **Smart search** available`,
                inline: false
            });

            const components = this.createNavigationComponents('directory');
            await interaction.editReply({ embeds: [embed], components });
            await this.setupCollector(interaction);

        } catch (error) {
            console.error('Error in showCommandsList:', error);
            await this.handleCommandError(interaction, error);
        }
    },

    async showQuickReference(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#DDA0DD')
            .setTitle('⚡ Quick Reference Cheat Sheet')
            .setDescription('╔═══════════════════════════════════════╗\n║     **Essential Commands Hub**        ║\n║        *Your Go-To Reference*         ║\n╚═══════════════════════════════════════╝\n\n🚀 *Master these commands for optimal gameplay*')
            .addFields(
                { 
                    name: '💰 **Economy & Wealth**', 
                    value: '```ansi\n\u001b[0;33m/daily\u001b[0m      → Daily treasure chest\n\u001b[0;34m/shop\u001b[0m       → Equipment marketplace\n\u001b[0;36m/inventory\u001b[0m  → Item management\n\u001b[0;32m/bank\u001b[0m       → Wealth storage```', 
                    inline: true 
                },
                { 
                    name: '⚔️ **Adventure & Combat**', 
                    value: '```ansi\n\u001b[0;32m/hunt\u001b[0m       → Treasure hunting\n\u001b[0;35m/dungeon\u001b[0m    → Dungeon exploration\n\u001b[0;31m/battle\u001b[0m     → Monster combat\n\u001b[0;33m/arena\u001b[0m      → PvP battles```', 
                    inline: true 
                },
                { 
                    name: '👥 **Social & Progress**', 
                    value: '```ansi\n\u001b[0;35m/guild\u001b[0m      → Guild management\n\u001b[0;34m/profile\u001b[0m    → Character stats\n\u001b[0;33m/leaderboard\u001b[0m→ Player rankings\n\u001b[0;32m/achievements\u001b[0m→ Progress tracking```', 
                    inline: true 
                },
                { 
                    name: '⚒️ **Crafting & Skills**', 
                    value: '```ansi\n\u001b[0;36m/craft\u001b[0m      → Item creation\n\u001b[0;31m/forge\u001b[0m      → Weapon smithing\n\u001b[0;35m/brew\u001b[0m       → Potion making\n\u001b[0;34m/train\u001b[0m      → Skill improvement```', 
                    inline: true 
                },
                { 
                    name: '🎮 **Games & Entertainment**', 
                    value: '```ansi\n\u001b[0;33m/slots\u001b[0m      → Casino games\n\u001b[0;32m/lottery\u001b[0m    → Lucky draws\n\u001b[0;36m/fishing\u001b[0m    → Fishing activity\n\u001b[0;35m/riddle\u001b[0m     → Brain puzzles```', 
                    inline: true 
                },
                { 
                    name: '🛠️ **Utility & Support**', 
                    value: '```ansi\n\u001b[0;34m/help\u001b[0m       → This guide\n\u001b[0;32m/info\u001b[0m       → Bot information\n\u001b[0;33m/ping\u001b[0m       → Response time\n\u001b[0;35m/status\u001b[0m     → System health```', 
                    inline: true 
                }
            )
            .addFields(
                {
                    name: '🔥 **Most Popular Commands**',
                    value: '🥇 `/daily` *- Essential daily rewards*\n🥈 `/hunt` *- Core treasure hunting*\n🥉 `/shop` *- Equipment upgrades*\n🏅 `/profile` *- Progress tracking*\n⭐ `/guild` *- Social benefits*',
                    inline: true
                },
                {
                    name: '⚡ **Power User Tips**',
                    value: '💡 Chain commands for **combo effects**\n🔄 Set up **daily routines** for efficiency\n🎯 Focus on **high-value activities**\n📈 Track **performance metrics**',
                    inline: true
                }
            )
            .setFooter({ text: '💎 Pro Tip: Use /help [command] for detailed information about any command' })
            .setTimestamp();

        const components = this.createNavigationComponents('reference');
        await interaction.editReply({ embeds: [embed], components });
        await this.setupCollector(interaction);
    },

    createNavigationComponents(context, category = null) {
        const components = [];

        // Main category dropdown (always present)
        const categoryOptions = Object.entries(commandCategories)
            .filter(([key]) => actualCommands[key] && actualCommands[key].length > 0)
            .slice(0, 25) // Discord limit for select menu options
            .map(([key, categoryInfo]) => {
                const count = actualCommands[key].length;
                return {
                    label: `${categoryInfo.name} (${count})`,
                    value: `category_${key}`,
                    description: `${categoryInfo.description} • ${count} commands`,
                    emoji: categoryInfo.emoji
                };
            });

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('help_category_select')
            .setPlaceholder('🎯 Browse command categories...')
            .addOptions(categoryOptions);

        components.push(new ActionRowBuilder().addComponents(categorySelect));

        // Command-specific dropdown for category pages
        if (context === 'category' && category && actualCommands[category]) {
            const commands = actualCommands[category];
            if (commands.length > 0) {
                const commandOptions = commands.slice(0, 25).map(cmd => {
                    const desc = commandDescriptions[cmd] || `${commandCategories[category].name} command`;
                    return {
                        label: `/${cmd}`,
                        value: `command_${cmd}`,
                        description: this.truncateText(desc, 100)
                    };
                });

                const commandSelect = new StringSelectMenuBuilder()
                    .setCustomId('help_command_select')
                    .setPlaceholder(`🔍 Select a ${commandCategories[category].name.toLowerCase()} command...`)
                    .addOptions(commandOptions);

                components.push(new ActionRowBuilder().addComponents(commandSelect));
            }
        }

        // Navigation buttons
        const navigationButtons = new ActionRowBuilder();

        // Context-specific buttons
        if (context === 'main') {
            navigationButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('help_getting_started')
                    .setLabel('Getting Started')
                    .setEmoji('🔰')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('help_commands_list')
                    .setLabel('All Commands')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('help_quick_reference')
                    .setLabel('Quick Reference')
                    .setEmoji('⚡')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else {
            // Back to main button for all other contexts
            navigationButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('help_main_menu')
                    .setLabel('Main Menu')
                    .setEmoji('🏠')
                    .setStyle(ButtonStyle.Secondary)
            );

            // Context-specific additional buttons
            if (context === 'command' && category) {
                navigationButtons.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`help_category_${category}`)
                        .setLabel(`${commandCategories[category].name} Commands`)
                        .setEmoji(commandCategories[category].emoji)
                        .setStyle(ButtonStyle.Primary)
                );
            }

            if (context !== 'reference') {
                navigationButtons.addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_quick_reference')
                        .setLabel('Quick Ref')
                        .setEmoji('⚡')
                        .setStyle(ButtonStyle.Secondary)
                );
            }
        }

        components.push(navigationButtons);
        return components;
    },

    async setupCollector(interaction) {
        try {
            // Clean up any existing collector for this user
            this.cleanupCollector(interaction.user.id);

            const message = await interaction.fetchReply();
            const filter = i => i.user.id === interaction.user.id;
            
            const collector = message.createMessageComponentCollector({
                filter,
                time: 300000, // 5 minutes
                dispose: true
            });

            // Store collector for cleanup
            activeCollectors.set(interaction.user.id, collector);

            collector.on('collect', async componentInteraction => {
                try {
                    // Prevent double processing
                    if (componentInteraction.replied || componentInteraction.deferred) {
                        return;
                    }

                    await componentInteraction.deferUpdate();

                    // Handle different interaction types
                    const customId = componentInteraction.customId;
                    const values = componentInteraction.values;

                    if (customId === 'help_main_menu') {
                        await this.showMainHelp(interaction);
                    } 
                    else if (customId === 'help_getting_started') {
                        await this.showGettingStarted(interaction);
                    } 
                    else if (customId === 'help_commands_list') {
                        await this.showCommandsList(interaction);
                    } 
                    else if (customId === 'help_quick_reference') {
                        await this.showQuickReference(interaction);
                    }
                    else if (customId === 'help_category_select' && values && values.length > 0) {
                        const selectedCategory = values[0].replace('category_', '');
                        await this.showCategoryHelp(interaction, selectedCategory);
                    }
                    else if (customId === 'help_command_select' && values && values.length > 0) {
                        const commandName = values[0].replace('command_', '');
                        await this.showSpecificCommandHelp(interaction, commandName);
                    }
                    else if (customId.startsWith('help_category_')) {
                        const category = customId.replace('help_category_', '');
                        await this.showCategoryHelp(interaction, category);
                    }

                } catch (error) {
                    console.error('Error handling component interaction:', error);
                    // Try to send error message only if interaction hasn't been handled
                    if (!componentInteraction.replied && !componentInteraction.deferred) {
                        try {
                            await componentInteraction.reply({
                                content: '❌ An error occurred while processing your request. Please try again.',
                                ephemeral: true
                            });
                        } catch (replyError) {
                            console.error('Failed to send error reply:', replyError);
                        }
                    }
                }
            });

            collector.on('end', async (collected, reason) => {
                try {
                    // Clean up
                    activeCollectors.delete(interaction.user.id);

                    if (reason === 'time') {
                        await this.handleTimeout(interaction);
                    }
                } catch (error) {
                    console.error('Error handling collector end:', error);
                }
            });

        } catch (error) {
            console.error('Error setting up collector:', error);
        }
    },

    cleanupCollector(userId) {
        const existingCollector = activeCollectors.get(userId);
        if (existingCollector && !existingCollector.ended) {
            existingCollector.stop('cleanup');
        }
        activeCollectors.delete(userId);
    },

    async handleTimeout(interaction) {
        try {
            const timeoutEmbed = new EmbedBuilder()
                .setColor('#6C757D')
                .setTitle('⏰ Help Menu Expired')
                .setDescription('╔══════════════════════════════════════╗\n║        **Session Timeout**          ║\n╚══════════════════════════════════════╝\n\nThis help menu has expired due to inactivity.')
                .addFields({
                    name: '🔄 **Need Help Again?**',
                    value: 'Simply run `/help` to open a fresh interactive menu with all the latest features.',
                    inline: false
                })
                .setFooter({ text: '💡 Tip: Menus stay active for 5 minutes to keep things responsive' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
        } catch (error) {
            console.error('Error handling timeout:', error);
        }
    },

    async handleCategoryError(interaction, category) {
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('❌ Category Not Found')
            .setDescription('╔════════════════════════════════════╗\n║       **Invalid Category**        ║\n╚════════════════════════════════════╝\n\nThe requested category could not be found.')
            .addFields({
                name: '💡 **Available Categories**',
                value: Object.entries(commandCategories)
                    .filter(([key]) => actualCommands[key] && actualCommands[key].length > 0)
                    .map(([_, cat]) => `${cat.emoji} **${cat.name}**`)
                    .join('\n'),
                inline: false
            })
            .setTimestamp();

        const components = this.createNavigationComponents('main');
        await interaction.editReply({ embeds: [embed], components });
        await this.setupCollector(interaction);
    },

    async handleCommandError(interaction, error) {
        console.error('Command error details:', error);
        
        try {
            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🚫 Help System Error')
                .setDescription('╔══════════════════════════════════════╗\n║          **System Error**           ║\n╚══════════════════════════════════════╝\n\nThe help system encountered an unexpected error.')
                .addFields({
                    name: '🔧 **Troubleshooting Steps**',
                    value: '• Try using `/help` again\n• Use `/help category:general` for basic commands\n• Check bot permissions and status\n• Contact support if the issue persists',
                    inline: false
                })
                .setFooter({ text: '🛠️ If this error persists, please report it to the administrators' })
                .setTimestamp();

            const retryButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_main_menu')
                        .setLabel('Try Again')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Primary)
                );

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    embeds: [errorEmbed],
                    components: [retryButton],
                    ephemeral: true
                });
            } else {
                await interaction.editReply({ 
                    embeds: [errorEmbed],
                    components: [retryButton]
                });
            }
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    },

    // Utility functions
    getSuggestions(commandName) {
        const allCommands = Object.values(actualCommands).flat();
        const suggestions = allCommands
            .filter(cmd => cmd.includes(commandName.toLowerCase()) || commandName.toLowerCase().includes(cmd))
            .slice(0, 5);
        
        if (suggestions.length > 0) {
            return suggestions.map(cmd => `\`/${cmd}\``).join(' • ');
        }
        
        // Fallback to popular commands
        return '`/daily` • `/hunt` • `/shop` • `/profile`';
    },

    getRelatedCommands(category, currentCommand) {
        const categoryCommands = actualCommands[category] || [];
        const related = categoryCommands
            .filter(cmd => cmd !== currentCommand)
            .slice(0, 4);
        
        if (related.length > 0) {
            return related.map(cmd => `\`/${cmd}\``).join(' • ');
        }
        
        return 'No related commands in this category.';
    },

    getCommandType(category) {
        const types = {
            general: '🔧 Utility',
            admin: '⚙️ Management',
            alchemy: '🧪 Mystical',
            bank: '🏦 Financial',
            blacksmith: '⚒️ Crafting',
            combat: '⚔️ Action',
            crafting: '🔨 Creation',
            economy: '💎 Economy',
            exploration: '🗺️ Adventure',
            farming: '🌾 Agriculture',
            fishing: '🎣 Recreation',
            gambling: '🎲 Games',
            games: '🎮 Entertainment',
            housing: '🏠 Building',
            magic: '✨ Mystical',
            merchant: '🏪 Commerce',
            mining: '⛏️ Extraction',
            pets: '🐕 Companion',
            quests: '📜 Adventure',
            rpg: '🎯 Role-Play',
            skills: '📈 Progression',
            social: '👥 Social',
            tavern: '🍺 Social',
            transportation: '🚂 Travel',
            utility: '🛠️ Tool',
            weather: '🌤️ Environment'
        };
        return types[category] || '📝 Command';
    },

    getCommandEmoji(commandName, categoryEmoji) {
        const emojiMap = {
            // General
            backup: '💾', help: '❓', hunt: '🔍', invite: '📨', leaderboard: '🏆',
            ping: '🏓', riddle: '🧩', solve: '🧠', status: '📊', treasure: '💎', work: '⚒️',
            
            // Economy
            auction: '🔨', daily: '🌅', inventory: '🎒', invest: '📈', profile: '👤', shop: '🏪',
            
            // Combat & RPG
            arena: '🏟️', tournament: '🏆', battle: '⚔️', dungeon: '🏰',
            
            // Crafting & Skills
            craft: '🔨', recipes: '📋', specialize: '⭐', workbench: '🛠️',
            forge: '🔥', repair: '🔧', upgrade: '⬆️',
            brew: '🧪', potion: '🍶', transmute: '⚗️',
            mastery: '🎯', profession: '👔', train: '📚',
            
            // Social
            guild: '🏛️', achievements: '🏅', rankings: '📊',
            
            // Exploration & Activities
            scout: '🔭', forage: '🌿', mine: '⛏️', excavate: '🗿', tunnel: '🕳️',
            farm: '🚜', garden: '🌻', harvest: '🌾', plant: '🌱', water: '💧',
            
            // Fishing & Games
            fishing: '🎣', market: '🏪', spots: '📍', tackle: '🪝',
            gamble: '🎰', roulette: '🎡', slots: '🎰', lottery: '🎫',
            
            // Banking & Finance
            bank: '🏦', loan: '💰', transfer: '💸',
            
            // Pets & Companions
            pet: '🐕', stable: '🏠', inn: '🏨', tavern: '🍺',
            
            // Utility & Info
            calendar: '📅', convert: '🔄', info: 'ℹ️', map: '🗺️',
            settings: '⚙️', stats: '📊', tips: '💡', vote: '🗳️',
            
            // Weather & Environment
            alert: '🚨', weather: '🌤️',
            
            // Admin
            manage: '⚙️'
        };
        return emojiMap[commandName] || categoryEmoji;
    },

    getCategoryDifficulty(category) {
        const difficulty = {
            general: 'Beginner',
            admin: 'Expert',
            alchemy: 'Advanced',
            bank: 'Easy',
            blacksmith: 'Intermediate',
            combat: 'Intermediate',
            crafting: 'Intermediate',
            economy: 'Easy',
            exploration: 'Easy',
            farming: 'Easy',
            fishing: 'Easy',
            gambling: 'Easy',
            games: 'Easy',
            housing: 'Intermediate',
            magic: 'Advanced',
            merchant: 'Intermediate',
            mining: 'Easy',
            pets: 'Easy',
            quests: 'Intermediate',
            rpg: 'Intermediate',
            skills: 'Intermediate',
            social: 'Easy',
            tavern: 'Easy',
            transportation: 'Easy',
            utility: 'Beginner',
            weather: 'Beginner'
        };
        return difficulty[category] || 'Intermediate';
    },

    getCategoryTips(category) {
        const tips = {
            general: 'Start here for basic commands',
            admin: 'Moderator permissions required',
            alchemy: 'Collect rare ingredients first',
            bank: 'Regular deposits earn interest',
            blacksmith: 'Quality materials = better items',
            combat: 'Upgrade equipment before battles',
            crafting: 'Learn recipes to unlock items',
            economy: 'Daily rewards are essential',
            exploration: 'Higher risk, higher rewards',
            farming: 'Patience yields better crops',
            fishing: 'Different spots have unique fish',
            gambling: 'Set limits to avoid losses',
            games: 'Great for quick rewards',
            housing: 'Customize for bonuses',
            magic: 'Requires special training',
            merchant: 'Buy low, sell high',
            mining: 'Deeper levels have rare ores',
            pets: 'Train regularly for best results',
            quests: 'Read objectives carefully',
            rpg: 'Strategy beats pure power',
            skills: 'Focus on complementary abilities',
            social: 'Join guilds for bonuses',
            tavern: 'Great for meeting players',
            transportation: 'Fast travel saves time',
            utility: 'Helpful for organization',
            weather: 'Plan activities around weather'
        };
        return tips[category] || 'Experiment and have fun!';
    },

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    truncateText(text, maxLength) {
        if (!text) return 'No description available';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
};