const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const { db } = require('../../database.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 View various leaderboards and rankings')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select leaderboard category')
                .addChoices(
                    { name: 'Coins', value: 'coins' },
                    { name: 'Level', value: 'level' },
                    { name: 'Mining', value: 'mining' },
                    { name: 'Fishing', value: 'fishing' },
                    { name: 'Combat', value: 'combat' }
                )
        ),

    async execute(interaction) {
        try {
            const category = interaction.options.getString('category') || 'coins';

            await this.showLeaderboard(interaction, category);
        } catch (error) {
            console.error('Leaderboard command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching the leaderboard.',
                ephemeral: true
            });
        }
    },

    async showLeaderboard(interaction, category) {
        // Get all users from database
        const allUsers = await this.getAllUsers(interaction); // Pass interaction for context

        // Handle case where no users are found
        if (!allUsers || allUsers.length === 0) {
            return interaction.reply({
                content: '❌ No player data found! Start playing to appear on leaderboards.',
                ephemeral: true
            });
        }

        // Sort based on category
        let sortedUsers = [];
        switch (category) {
            case 'coins':
                sortedUsers = allUsers.sort((a, b) => (b.coins || 0) - (a.coins || 0));
                break;
            case 'level':
                sortedUsers = allUsers.sort((a, b) => (b.level || 1) - (a.level || 1));
                break;
            case 'mining':
                sortedUsers = allUsers.sort((a, b) => (b.skills?.mining || 1) - (a.skills?.mining || 1));
                break;
            case 'fishing':
                sortedUsers = allUsers.sort((a, b) => (b.skills?.fishing || 1) - (a.skills?.fishing || 1));
                break;
            case 'combat':
                sortedUsers = allUsers.sort((a, b) => (b.skills?.combat || 1) - (a.skills?.combat || 1));
                break;
            default: // Default to coins if category is invalid
                sortedUsers = allUsers.sort((a, b) => (b.coins || 0) - (a.coins || 0));
                category = 'coins'; // Ensure category is updated
                break;
        }

        const top10 = sortedUsers.slice(0, 10);
        const userRank = sortedUsers.findIndex(user => user.id === interaction.user.id) + 1;

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.gold || '#FFD700')
            .setTitle(`🏆 ${category.charAt(0).toUpperCase() + category.slice(1)} Leaderboard`)
            .setDescription(this.formatLeaderboard(top10, category))
            .addFields([
                {
                    name: '📊 Your Rank',
                    value: userRank > 0 ? `#${userRank}` : 'Not ranked',
                    inline: true
                },
                {
                    name: '👥 Total Players',
                    value: `${allUsers.length}`,
                    inline: true
                }
            ])
            .setTimestamp()
            .setFooter({ text: 'Rankings update in real-time!' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`leaderboard_${interaction.user.id}`)
            .setPlaceholder('Select a different leaderboard')
            .addOptions([
                {
                    label: '💰 Coins',
                    description: 'Richest treasure hunters',
                    value: 'coins',
                    emoji: '💰'
                },
                {
                    label: '⭐ Level',
                    description: 'Highest level players',
                    value: 'level',
                    emoji: '⭐'
                },
                {
                    label: '⛏️ Mining',
                    description: 'Master miners',
                    value: 'mining',
                    emoji: '⛏️'
                },
                {
                    label: '🎣 Fishing',
                    description: 'Expert anglers',
                    value: 'fishing',
                    emoji: '🎣'
                },
                {
                    label: '⚔️ Combat',
                    description: 'Legendary warriors',
                    value: 'combat',
                    emoji: '⚔️'
                }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`leaderboard_refresh_${interaction.user.id}`)
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`leaderboard_myrank_${interaction.user.id}`)
                    .setLabel('📊 My Details')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`leaderboard_global_${interaction.user.id}`)
                    .setLabel('🌐 Global Stats')
                    .setStyle(ButtonStyle.Success)
            );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const response = { embeds: [embed], components: [selectRow, buttons] };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(response);
        } else {
            await interaction.reply(response);
        }
    },

    formatLeaderboard(users, category) {
        if (users.length === 0) {
            return '```\nNo players found!\n```';
        }

        let description = '```\n';
        users.forEach((user, index) => {
            const rank = index + 1;
            const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : '🔸';
            const userName = user.username || `User${user.id.slice(0, 4)}`;

            let value;
            switch (category) {
                case 'coins':
                    value = `${user.coins || 0} coins`;
                    break;
                case 'level':
                    value = `Level ${user.level || 1}`;
                    break;
                case 'mining':
                    value = `Level ${user.skills?.mining || 1}`;
                    break;
                case 'fishing':
                    value = `Level ${user.skills?.fishing || 1}`;
                    break;
                case 'combat':
                    value = `Level ${user.skills?.combat || 1}`;
                    break;
                default: // Fallback for unknown categories
                    value = 'N/A';
                    break;
            }

            description += `${medal} #${rank.toString().padStart(2)} ${userName.padEnd(12)} ${value}\n`;
        });
        description += '```';

        return description;
    },

    async getAllUsers(interaction) { // Added interaction parameter
        try {
            // This is a placeholder - in a real implementation, you'd fetch from your database
            // For demonstration, we'll use sample data and try to fetch the current user.
            const sampleUsers = [
                { id: '1', username: 'TreasureHunter1', coins: 5000, level: 25, skills: { mining: 15, fishing: 12, combat: 20 }},
                { id: '2', username: 'GoldSeeker', coins: 4500, level: 22, skills: { mining: 18, fishing: 10, combat: 15 }},
                { id: '3', username: 'AdventureQuest', coins: 4000, level: 20, skills: { mining: 12, fishing: 15, combat: 18 }},
                { id: '4', username: 'LootMaster', coins: 3500, level: 18, skills: { mining: 14, fishing: 13, combat: 16 }},
                { id: '5', username: 'ExplorePro', coins: 3000, level: 16, skills: { mining: 11, fishing: 16, combat: 14 }}
            ];

            // Attempt to fetch the current user from the database
            let currentUserData = null;
            if (interaction && interaction.user && interaction.user.id) {
                try {
                    // Assuming db.getPlayer returns a promise that resolves with user data or null
                    currentUserData = await db.getPlayer(interaction.user.id);
                } catch (dbError) {
                    console.error(`Error fetching player ${interaction.user.id} from DB:`, dbError);
                    // Continue with sample data if DB fetch fails
                }
            }

            // Combine sample users with fetched current user data if available and not already in samples
            const finalUsers = [...sampleUsers];
            if (currentUserData && !finalUsers.some(u => u.id === currentUserData.id)) {
                // Ensure username is set if it's missing from db data
                if (!currentUserData.username) {
                    currentUserData.username = 'You'; // Set a default if needed
                }
                finalUsers.push(currentUserData);
            } else if (currentUserData && finalUsers.some(u => u.id === currentUserData.id)) {
                // If user is already in samples, update their data if necessary, e.g., add 'You'
                const existingUserIndex = finalUsers.findIndex(u => u.id === currentUserData.id);
                if (existingUserIndex !== -1) {
                    // Optionally update existing user's data, or just ensure username is 'You'
                    finalUsers[existingUserIndex].username = 'You';
                }
            } else if (!interaction || !interaction.user || !interaction.user.id) {
                console.warn("Interaction or user ID not available, cannot fetch current user data.");
            }


            // If no users were fetched and no samples provided, return empty array
            if (finalUsers.length === 0) {
                return [];
            }

            return finalUsers;

        } catch (error) {
            console.error('Error in getAllUsers:', error);
            return []; // Return empty array on error
        }
    },

    // Button handlers
    buttonHandlers: {
        refresh: async function(interaction) {
            // Determine the current category from the interaction message, or default to coins
            const currentEmbed = interaction.message.embeds[0];
            let category = 'coins'; // Default category
            if (currentEmbed && currentEmbed.title) {
                const titleMatch = currentEmbed.title.match(/🏆 (.*) Leaderboard/);
                if (titleMatch && titleMatch[1]) {
                    category = titleMatch[1].toLowerCase().replace(' ', ''); // e.g., "Richest Players" -> "richestplayers" -> needs mapping
                    // Simple mapping for example, actual mapping might be needed
                    if (category.includes('coins')) category = 'coins';
                    else if (category.includes('level')) category = 'level';
                    else if (category.includes('mining')) category = 'mining';
                    else if (category.includes('fishing')) category = 'fishing';
                    else if (category.includes('combat')) category = 'combat';
                }
            }
            await this.showLeaderboard(interaction, category);
        },

        myrank: async function(interaction) {
            try {
                // Assuming db.getPlayer returns user data, including skills
                const userData = await db.getPlayer(interaction.user.id);

                if (!userData) {
                    return interaction.update({
                        content: '❌ Could not retrieve your profile data. Please try again later.',
                        components: [],
                        embeds: []
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor(config.embedColors?.info || '#0099ff')
                    .setTitle('📊 Your Profile Stats')
                    .setDescription('Here are your current statistics:')
                    .addFields([
                        { name: '💰 Coins', value: `${userData.coins || 0}`, inline: true },
                        { name: '⭐ Level', value: `${userData.level || 1}`, inline: true },
                        { name: '✨ Experience', value: `${userData.experience || 0}`, inline: true },
                        { name: '⛏️ Mining', value: `Level ${userData.skills?.mining || 1}`, inline: true },
                        { name: '🎣 Fishing', value: `Level ${userData.skills?.fishing || 1}`, inline: true },
                        { name: '⚔️ Combat', value: `Level ${userData.skills?.combat || 1}`, inline: true }
                    ])
                    .setTimestamp()
                    .setFooter({ text: 'Keep playing to improve your rankings!' });

                await interaction.update({ embeds: [embed], components: [] });
            } catch (error) {
                console.error('Error showing user rank:', error);
                await interaction.update({
                    content: '❌ An error occurred while fetching your stats.',
                    components: [],
                    embeds: []
                });
            }
        },

        global: async function(interaction) {
            // Placeholder for global stats. In a real scenario, these would be fetched or stored.
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.success || '#00ff00')
                .setTitle('🌐 Global Server Statistics')
                .addFields([
                    { name: '👥 Total Players', value: '1,337', inline: true }, // Example value
                    { name: '💰 Total Coins', value: '2,500,000', inline: true }, // Example value
                    { name: '🏆 Achievements Earned', value: '8,456', inline: true }, // Example value
                    { name: '⛏️ Ores Mined', value: '45,678', inline: true }, // Example value
                    { name: '🎣 Fish Caught', value: '23,456', inline: true }, // Example value
                    { name: '⚔️ Battles Won', value: '12,789', inline: true } // Example value
                ])
                .setTimestamp()
                .setFooter({ text: 'Statistics updated daily' });

            await interaction.update({ embeds: [embed], components: [] });
        }
    },

    // Select menu handler
    selectMenuHandlers: {
        default: async function(interaction) {
            const selectedCategory = interaction.values[0]; // The value of the selected option
            await this.showLeaderboard(interaction, selectedCategory);
        }
    }
};