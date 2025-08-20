const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 View the top adventurers and your ranking!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Choose leaderboard category')
                .setRequired(false)
                .addChoices(
                    { name: '💰 Richest Players', value: 'coins' },
                    { name: '⭐ Highest Level', value: 'level' },
                    { name: '🗺️ Most Hunts', value: 'hunts' },
                    { name: '⚔️ Battle Champions', value: 'battles' },
                    { name: '🏰 Dungeon Masters', value: 'dungeons' },
                    { name: '🔮 Magic Masters', value: 'magic' },
                    { name: '💎 Total Earnings', value: 'earnings' }
                )),
    
    async execute(interaction) {
        const category = interaction.options?.getString('category') || 'coins';
        const userId = interaction.user.id;
        
        // Get all users data
        const allUsers = await db.getAllUsers() || [];
        
        if (allUsers.length === 0) {
            return interaction.reply({
                content: '❌ No player data found! Start playing to appear on leaderboards.',
                ephemeral: true
            });
        }
        
        await this.showLeaderboard(interaction, category, allUsers, userId);
    },
    
    async showLeaderboard(interaction, category, allUsers, userId) {
        // Sort users based on category
        let sortedUsers = [];
        let categoryName = '';
        let categoryEmoji = '';
        let valueField = '';
        
        switch (category) {
            case 'coins':
                categoryName = 'Richest Adventurers';
                categoryEmoji = '💰';
                valueField = 'coins';
                sortedUsers = allUsers.sort((a, b) => (b.inventory?.coins || 0) - (a.inventory?.coins || 0));
                break;
            case 'level':
                categoryName = 'Highest Level Players';
                categoryEmoji = '⭐';
                valueField = 'level';
                sortedUsers = allUsers.sort((a, b) => (b.stats?.level || 1) - (a.stats?.level || 1));
                break;
            case 'hunts':
                categoryName = 'Treasure Hunt Masters';
                categoryEmoji = '🗺️';
                valueField = 'hunts';
                sortedUsers = allUsers.sort((a, b) => (b.stats?.huntsCompleted || 0) - (a.stats?.huntsCompleted || 0));
                break;
            case 'battles':
                categoryName = 'Battle Champions';
                categoryEmoji = '⚔️';
                valueField = 'battles';
                sortedUsers = allUsers.sort((a, b) => (b.stats?.battlesWon || 0) - (a.stats?.battlesWon || 0));
                break;
            case 'dungeons':
                categoryName = 'Dungeon Conquerors';
                categoryEmoji = '🏰';
                valueField = 'dungeons';
                sortedUsers = allUsers.sort((a, b) => (b.stats?.dungeonClears || 0) - (a.stats?.dungeonClears || 0));
                break;
            case 'magic':
                categoryName = 'Arcane Masters';
                categoryEmoji = '🔮';
                valueField = 'magic';
                sortedUsers = allUsers.sort((a, b) => (b.magic?.level || 1) - (a.magic?.level || 1));
                break;
            case 'earnings':
                categoryName = 'Lifetime Earners';
                categoryEmoji = '💎';
                valueField = 'earnings';
                sortedUsers = allUsers.sort((a, b) => (b.stats?.totalEarned || 0) - (a.stats?.totalEarned || 0));
                break;
        }
        
        // Find user's rank
        const userRank = sortedUsers.findIndex(user => user.id === userId) + 1;
        const userData = sortedUsers.find(user => user.id === userId);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.leaderboard)
            .setTitle(`🏆 ${categoryName} Leaderboard`)
            .setDescription(`**Top adventurers ranked by ${categoryName.toLowerCase()}**`)
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
        
        // Add top 10 players
        const topPlayers = sortedUsers.slice(0, 10);
        const leaderboardText = topPlayers.map((user, index) => {
            const rank = index + 1;
            const value = this.getUserValue(user, category);
            const medalEmoji = this.getRankEmoji(rank);
            const username = user.username || `User ${user.id.slice(-4)}`;
            
            return `${medalEmoji} **${rank}.** ${username}\n   ${categoryEmoji} ${value}`;
        }).join('\n\n');
        
        embed.addFields([
            {
                name: `${categoryEmoji} Top 10 ${categoryName}`,
                value: leaderboardText || 'No data available',
                inline: false
            }
        ]);
        
        // Add user's ranking
        if (userRank > 0) {
            const userValue = this.getUserValue(userData, category);
            let rankText = '';
            
            if (userRank <= 10) {
                rankText = `You're in the top 10! 🎉`;
            } else if (userRank <= 50) {
                rankText = `You're in the top 50! 👏`;
            } else if (userRank <= 100) {
                rankText = `You're in the top 100! 💪`;
            } else {
                rankText = `Keep climbing the ranks! 📈`;
            }
            
            embed.addFields([
                {
                    name: '📊 Your Ranking',
                    value: `**Rank #${userRank}** out of ${sortedUsers.length} players\n${categoryEmoji} Your ${this.getCategoryLabel(category)}: **${userValue}**\n${rankText}`,
                    inline: false
                }
            ]);
        } else {
            embed.addFields([
                {
                    name: '📊 Your Ranking',
                    value: `You haven't started your adventure yet!\nUse \`/hunt\` or \`/daily\` to begin earning your place on the leaderboard.`,
                    inline: false
                }
            ]);
        }
        
        // Add statistics
        const totalPlayers = allUsers.length;
        const activePlayers = allUsers.filter(user => (user.stats?.lastHunt || 0) > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
        
        embed.addFields([
            {
                name: '📈 Server Statistics',
                value: `👥 Total Players: **${totalPlayers}**\n🎮 Active (7 days): **${activePlayers}**\n🏆 Competition Level: **${this.getCompetitionLevel(totalPlayers)}**`,
                inline: true
            },
            {
                name: '🎯 Leaderboard Tips',
                value: '• Complete daily hunts\n• Battle other players\n• Explore dungeons\n• Level up your skills',
                inline: true
            }
        ]);
        
        // Create category selection menu
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('leaderboard_category_select')
            .setPlaceholder('📊 Switch leaderboard category...')
            .addOptions([
                {
                    label: 'Richest Players',
                    description: 'Players with the most coins',
                    value: 'leaderboard_coins',
                    emoji: '💰'
                },
                {
                    label: 'Highest Level',
                    description: 'Players with the highest level',
                    value: 'leaderboard_level',
                    emoji: '⭐'
                },
                {
                    label: 'Treasure Hunt Masters',
                    description: 'Most treasure hunts completed',
                    value: 'leaderboard_hunts',
                    emoji: '🗺️'
                },
                {
                    label: 'Battle Champions',
                    description: 'Most battles won',
                    value: 'leaderboard_battles',
                    emoji: '⚔️'
                },
                {
                    label: 'Dungeon Conquerors',
                    description: 'Most dungeons cleared',
                    value: 'leaderboard_dungeons',
                    emoji: '🏰'
                },
                {
                    label: 'Arcane Masters',
                    description: 'Highest magic level',
                    value: 'leaderboard_magic',
                    emoji: '🔮'
                },
                {
                    label: 'Lifetime Earners',
                    description: 'Total coins earned all-time',
                    value: 'leaderboard_earnings',
                    emoji: '💎'
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('leaderboard_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('profile_compare')
                    .setLabel('📊 Compare Stats')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('leaderboard_detailed')
                    .setLabel('📋 Detailed View')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('achievements_view')
                    .setLabel('🏅 Achievements')
                    .setStyle(ButtonStyle.Success)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            buttons
        ];
        
        embed.setFooter({ 
            text: `Updated ${new Date().toLocaleTimeString()} • Showing ${categoryName}` 
        });
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    getUserValue(user, category) {
        switch (category) {
            case 'coins':
                return `${user.inventory?.coins || 0} coins`;
            case 'level':
                return `Level ${user.stats?.level || 1}`;
            case 'hunts':
                return `${user.stats?.huntsCompleted || 0} hunts`;
            case 'battles':
                return `${user.stats?.battlesWon || 0} wins`;
            case 'dungeons':
                return `${user.stats?.dungeonClears || 0} clears`;
            case 'magic':
                return `Magic Lvl ${user.magic?.level || 1}`;
            case 'earnings':
                return `${user.stats?.totalEarned || 0} total coins`;
            default:
                return '0';
        }
    },
    
    getCategoryLabel(category) {
        const labels = {
            coins: 'coins',
            level: 'level',
            hunts: 'hunts completed',
            battles: 'battles won',
            dungeons: 'dungeons cleared',
            magic: 'magic level',
            earnings: 'total earned'
        };
        return labels[category] || 'score';
    },
    
    getRankEmoji(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            case 4:
            case 5: return '🏅';
            default: return '🔸';
        }
    },
    
    getCompetitionLevel(playerCount) {
        if (playerCount >= 100) return 'Fierce';
        if (playerCount >= 50) return 'High';
        if (playerCount >= 20) return 'Moderate';
        if (playerCount >= 10) return 'Growing';
        return 'Casual';
    }
};