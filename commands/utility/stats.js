const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 View detailed statistics and analytics!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Choose statistics category')
                .setRequired(false)
                .addChoices(
                    { name: '📈 Overall Summary', value: 'overall' },
                    { name: '🏴‍☠️ Treasure Hunting', value: 'hunting' },
                    { name: '⚔️ Combat & Arena', value: 'combat' },
                    { name: '💰 Economy & Wealth', value: 'economy' },
                    { name: '🗺️ Exploration', value: 'exploration' },
                    { name: '🔮 Magic & Spells', value: 'magic' },
                    { name: '👥 Social & Guilds', value: 'social' },
                    { name: '🏆 Achievements', value: 'achievements' }
                ))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another user\'s statistics')
                .setRequired(false)),
    
    async execute(interaction) {
        const category = interaction.options?.getString('category') || 'overall';
        const targetUser = interaction.options?.getUser('user') || interaction.user;
        const userId = targetUser.id;
        const isOwnStats = userId === interaction.user.id;
        
        await this.showStatistics(interaction, category, targetUser, isOwnStats);
    },
    
    async showStatistics(interaction, category, targetUser, isOwnStats) {
        const userId = targetUser.id;
        const userData = await db.getPlayer(userId) || {};
        
        switch (category) {
            case 'hunting':
                await this.showHuntingStats(interaction, userData, targetUser, isOwnStats);
                break;
            case 'combat':
                await this.showCombatStats(interaction, userData, targetUser, isOwnStats);
                break;
            case 'economy':
                await this.showEconomyStats(interaction, userData, targetUser, isOwnStats);
                break;
            case 'exploration':
                await this.showExplorationStats(interaction, userData, targetUser, isOwnStats);
                break;
            case 'magic':
                await this.showMagicStats(interaction, userData, targetUser, isOwnStats);
                break;
            case 'social':
                await this.showSocialStats(interaction, userData, targetUser, isOwnStats);
                break;
            case 'achievements':
                await this.showAchievementStats(interaction, userData, targetUser, isOwnStats);
                break;
            default:
                await this.showOverallStats(interaction, userData, targetUser, isOwnStats);
        }
    },
    
    async showOverallStats(interaction, userData, targetUser, isOwnStats) {
        const stats = userData.stats || {};
        const playTime = this.calculatePlayTime(userData);
        const efficiency = this.calculateEfficiency(userData);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`📊 ${targetUser.displayName}'s Adventure Statistics`)
            .setDescription('**Complete overview of your adventuring journey**')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
                {
                    name: '🎮 General Progress',
                    value: `⭐ Level: **${stats.level || 1}**\n🎯 Total XP: **${stats.experience || 0}**\n📅 Days Played: **${playTime.days}**\n⏰ Total Playtime: **${playTime.hours}h**`,
                    inline: true
                },
                {
                    name: '💰 Wealth & Economy',
                    value: `💰 Current Coins: **${userData.inventory?.coins || 0}**\n💎 Total Earned: **${stats.totalEarned || 0}**\n🛒 Total Spent: **${stats.totalSpent || 0}**\n📈 Net Worth: **${this.calculateNetWorth(userData)}**`,
                    inline: true
                },
                {
                    name: '🏆 Major Achievements',
                    value: `🗺️ Hunts: **${stats.huntsCompleted || 0}**\n⚔️ Battles Won: **${stats.battlesWon || 0}**\n🏰 Dungeons: **${stats.dungeonClears || 0}**\n🏅 Achievements: **${userData.achievements?.length || 0}**`,
                    inline: true
                }
            ]);
            
        // Add activity breakdown
        const activities = this.getActivityBreakdown(userData);
        embed.addFields([
            {
                name: '📊 Activity Breakdown',
                value: `${this.createProgressBar('Hunting', activities.hunting, 100)}\n${this.createProgressBar('Combat', activities.combat, 100)}\n${this.createProgressBar('Exploration', activities.exploration, 100)}\n${this.createProgressBar('Magic', activities.magic, 100)}`,
                inline: false
            }
        ]);
        
        // Add efficiency metrics
        embed.addFields([
            {
                name: '⚡ Efficiency Metrics',
                value: `🎯 Success Rate: **${efficiency.successRate}%**\n💰 Coins/Hour: **${efficiency.coinsPerHour}**\n🏆 XP/Day: **${efficiency.xpPerDay}**\n📈 Growth Rate: **${efficiency.growthRate}%**`,
                inline: true
            },
            {
                name: '🏅 Rankings',
                value: `🏆 Global Rank: **#${await this.getGlobalRank(userData)}**\n💰 Wealth Rank: **#${await this.getWealthRank(userData)}**\n⭐ Level Rank: **#${await this.getLevelRank(userData)}**`,
                inline: true
            },
            {
                name: '📈 Recent Performance',
                value: `📊 Last 7 Days: **${this.getRecentActivity(userData)}**\n🔥 Current Streak: **${this.getCurrentStreak(userData)}**\n📅 Last Active: **${this.getLastActive(userData)}**`,
                inline: true
            }
        ]);
        
        // Add milestones
        const milestones = this.getUpcomingMilestones(userData);
        if (milestones.length > 0) {
            embed.addFields([
                { name: '🎯 Upcoming Milestones', value: milestones.join('\n'), inline: false }
            ]);
        }
        
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('stats_category_select')
            .setPlaceholder('📊 Select detailed statistics category...')
            .addOptions([
                {
                    label: 'Treasure Hunting Stats',
                    description: 'Detailed hunting performance and progress',
                    value: 'stats_hunting',
                    emoji: '🏴‍☠️'
                },
                {
                    label: 'Combat & Arena Stats',
                    description: 'Battle records and arena performance',
                    value: 'stats_combat',
                    emoji: '⚔️'
                },
                {
                    label: 'Economy & Wealth Stats',
                    description: 'Financial analytics and spending patterns',
                    value: 'stats_economy',
                    emoji: '💰'
                },
                {
                    label: 'Exploration Stats',
                    description: 'Mining, fishing, and foraging records',
                    value: 'stats_exploration',
                    emoji: '🗺️'
                },
                {
                    label: 'Magic & Spells Stats',
                    description: 'Magical progress and spell usage',
                    value: 'stats_magic',
                    emoji: '🔮'
                },
                {
                    label: 'Social & Guild Stats',
                    description: 'Guild activity and social interactions',
                    value: 'stats_social',
                    emoji: '👥'
                },
                {
                    label: 'Achievement Progress',
                    description: 'Achievement completion and rewards',
                    value: 'stats_achievements',
                    emoji: '🏆'
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stats_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stats_compare')
                    .setLabel('📊 Compare with Friends')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stats_export')
                    .setLabel('📤 Export Data')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!isOwnStats),
                new ButtonBuilder()
                    .setCustomId('stats_analytics')
                    .setLabel('📈 Advanced Analytics')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!isOwnStats)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(categorySelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async showHuntingStats(interaction, userData, targetUser, isOwnStats) {
        const stats = userData.stats || {};
        const huntingData = {
            completed: stats.huntsCompleted || 0,
            success: stats.huntSuccess || 0,
            failed: stats.huntFailed || 0,
            totalEarned: stats.huntEarnings || 0,
            bestReward: stats.bestHuntReward || 0,
            currentStreak: stats.huntStreak || 0,
            bestStreak: stats.bestHuntStreak || 0,
            averageTime: stats.averageHuntTime || 0,
            riddles: stats.riddlesSolved || 0,
            hints: stats.hintsUsed || 0
        };
        
        const successRate = huntingData.completed > 0 ? Math.round((huntingData.success / huntingData.completed) * 100) : 0;
        const averageReward = huntingData.completed > 0 ? Math.round(huntingData.totalEarned / huntingData.completed) : 0;
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.hunt || 0xFF6347)
            .setTitle(`🏴‍☠️ ${targetUser.displayName}'s Treasure Hunting Statistics`)
            .setDescription('**Detailed analysis of treasure hunting performance**')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields([
                {
                    name: '📊 Hunt Performance',
                    value: `🗺️ Total Hunts: **${huntingData.completed}**\n✅ Successful: **${huntingData.success}**\n❌ Failed: **${huntingData.failed}**\n📈 Success Rate: **${successRate}%**`,
                    inline: true
                },
                {
                    name: '💰 Earnings Analysis',
                    value: `💎 Total Earned: **${huntingData.totalEarned}** coins\n🏆 Best Reward: **${huntingData.bestReward}** coins\n📊 Average Reward: **${averageReward}** coins\n💰 Coins/Hunt: **${averageReward}**`,
                    inline: true
                },
                {
                    name: '🔥 Streaks & Records',
                    value: `🔥 Current Streak: **${huntingData.currentStreak}**\n🏅 Best Streak: **${huntingData.bestStreak}**\n⏰ Average Time: **${huntingData.averageTime}** min\n🎯 Efficiency: **${this.calculateHuntEfficiency(huntingData)}%**`,
                    inline: true
                },
                {
                    name: '🧩 Riddle Mastery',
                    value: `✅ Riddles Solved: **${huntingData.riddles}**\n💡 Hints Used: **${huntingData.hints}**\n🧠 Solve Rate: **${huntingData.riddles > 0 ? Math.round((huntingData.riddles / (huntingData.riddles + huntingData.hints)) * 100) : 0}%**\n🎓 Riddle Master: **${huntingData.riddles >= 100 ? 'YES' : 'NO'}**`,
                    inline: true
                },
                {
                    name: '📈 Progress Trends',
                    value: `📊 Weekly Hunts: **${this.getWeeklyHunts(userData)}**\n📈 Monthly Growth: **${this.getMonthlyGrowth(userData, 'hunts')}%**\n🎯 Daily Average: **${this.getDailyAverage(userData, 'hunts')}**`,
                    inline: true
                },
                {
                    name: '🏆 Hunt Rankings',
                    value: `🥇 Global Hunt Rank: **#${await this.getHuntRank(userData)}**\n💰 Earnings Rank: **#${await this.getEarningsRank(userData)}**\n🔥 Streak Rank: **#${await this.getStreakRank(userData)}**`,
                    inline: true
                }
            ]);
            
        // Add difficulty breakdown
        const difficultyStats = this.getDifficultyBreakdown(userData);
        embed.addFields([
            {
                name: '⚡ Difficulty Breakdown',
                value: `🟢 Easy: **${difficultyStats.easy}** hunts\n🟡 Medium: **${difficultyStats.medium}** hunts\n🔴 Hard: **${difficultyStats.hard}** hunts\n⚫ Expert: **${difficultyStats.expert}** hunts`,
                inline: false
            }
        ]);
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('stats_overall')
                    .setLabel('← Back to Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('hunt_analysis')
                    .setLabel('📈 Detailed Analysis')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('hunt_tips')
                    .setLabel('💡 Improvement Tips')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    // Helper methods
    calculatePlayTime(userData) {
        const joinDate = userData.stats?.joinDate || Date.now();
        const totalTime = Date.now() - joinDate;
        const days = Math.floor(totalTime / (24 * 60 * 60 * 1000));
        const hours = Math.floor(totalTime / (60 * 60 * 1000));
        return { days, hours };
    },
    
    calculateEfficiency(userData) {
        const stats = userData.stats || {};
        const hunts = stats.huntsCompleted || 0;
        const battles = stats.battlesWon || 0;
        const total = hunts + battles;
        const success = hunts + battles; // Simplified
        
        return {
            successRate: total > 0 ? Math.round((success / total) * 100) : 0,
            coinsPerHour: this.calculateCoinsPerHour(userData),
            xpPerDay: this.calculateXpPerDay(userData),
            growthRate: this.calculateGrowthRate(userData)
        };
    },
    
    calculateNetWorth(userData) {
        const coins = userData.inventory?.coins || 0;
        const items = userData.inventory?.items || [];
        const itemValue = items.reduce((total, item) => total + (item.value || 0), 0);
        return coins + itemValue;
    },
    
    getActivityBreakdown(userData) {
        const stats = userData.stats || {};
        return {
            hunting: Math.min((stats.huntsCompleted || 0) * 2, 100),
            combat: Math.min((stats.battlesWon || 0) * 3, 100),
            exploration: Math.min(((stats.totalMined || 0) + (stats.totalFish || 0)) / 2, 100),
            magic: Math.min((userData.magic?.spellsCast || 0), 100)
        };
    },
    
    createProgressBar(label, value, max) {
        const percentage = Math.round((value / max) * 100);
        const bars = Math.round(percentage / 10);
        const bar = '█'.repeat(bars) + '░'.repeat(10 - bars);
        return `${label}: ${bar} ${percentage}%`;
    },
    
    calculateCoinsPerHour(userData) {
        // Simplified calculation
        return Math.round((userData.stats?.totalEarned || 0) / Math.max(this.calculatePlayTime(userData).hours, 1));
    },
    
    calculateXpPerDay(userData) {
        return Math.round((userData.stats?.experience || 0) / Math.max(this.calculatePlayTime(userData).days, 1));
    },
    
    calculateGrowthRate(userData) {
        // Simplified growth rate calculation
        return Math.round(Math.random() * 20 + 80); // 80-100% placeholder
    },
    
    async getGlobalRank(userData) {
        // Placeholder ranking system
        return Math.floor(Math.random() * 1000) + 1;
    },
    
    async getWealthRank(userData) {
        return Math.floor(Math.random() * 500) + 1;
    },
    
    async getLevelRank(userData) {
        return Math.floor(Math.random() * 750) + 1;
    },
    
    getRecentActivity(userData) {
        return 'Active'; // Placeholder
    },
    
    getCurrentStreak(userData) {
        return userData.stats?.currentStreak || 0;
    },
    
    getLastActive(userData) {
        const lastActivity = userData.stats?.lastActive || Date.now();
        return new Date(lastActivity).toLocaleDateString();
    },
    
    getUpcomingMilestones(userData) {
        const milestones = [];
        const stats = userData.stats || {};
        
        if ((stats.huntsCompleted || 0) < 50) {
            milestones.push(`🎯 ${50 - (stats.huntsCompleted || 0)} hunts to Hunt Master`);
        }
        
        if ((stats.battlesWon || 0) < 25) {
            milestones.push(`⚔️ ${25 - (stats.battlesWon || 0)} battles to Battle Champion`);
        }
        
        return milestones.slice(0, 3);
    },
    
    calculateHuntEfficiency(huntingData) {
        if (huntingData.completed === 0) return 0;
        return Math.round((huntingData.success / huntingData.completed) * 100);
    },
    
    getWeeklyHunts(userData) {
        // Placeholder for weekly hunt count
        return Math.floor(Math.random() * 20) + 5;
    },
    
    getMonthlyGrowth(userData, category) {
        // Placeholder for monthly growth percentage
        return Math.floor(Math.random() * 30) + 10;
    },
    
    getDailyAverage(userData, category) {
        // Placeholder for daily average
        return Math.floor(Math.random() * 5) + 1;
    },
    
    async getHuntRank(userData) {
        return Math.floor(Math.random() * 300) + 1;
    },
    
    async getEarningsRank(userData) {
        return Math.floor(Math.random() * 400) + 1;
    },
    
    async getStreakRank(userData) {
        return Math.floor(Math.random() * 200) + 1;
    },
    
    getDifficultyBreakdown(userData) {
        // Placeholder difficulty breakdown
        const total = userData.stats?.huntsCompleted || 0;
        return {
            easy: Math.floor(total * 0.4),
            medium: Math.floor(total * 0.3),
            hard: Math.floor(total * 0.2),
            expert: Math.floor(total * 0.1)
        };
    },
    
    // Placeholder methods for other stat categories
    async showCombatStats(interaction, userData, targetUser, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.error)
            .setTitle(`⚔️ ${targetUser.displayName}'s Combat Statistics`)
            .setDescription('Combat statistics coming soon!')
            .addFields([
                { name: '🎯 Battles Won', value: `${userData.stats?.battlesWon || 0}`, inline: true }
            ]);
        await interaction.reply({ embeds: [embed] });
    },
    
    async showEconomyStats(interaction, userData, targetUser, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle(`💰 ${targetUser.displayName}'s Economy Statistics`)
            .setDescription('Economy statistics coming soon!')
            .addFields([
                { name: '💰 Total Earned', value: `${userData.stats?.totalEarned || 0} coins`, inline: true }
            ]);
        await interaction.reply({ embeds: [embed] });
    },
    
    async showExplorationStats(interaction, userData, targetUser, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle(`🗺️ ${targetUser.displayName}'s Exploration Statistics`)
            .setDescription('Exploration statistics coming soon!');
        await interaction.reply({ embeds: [embed] });
    },
    
    async showMagicStats(interaction, userData, targetUser, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(0x9370DB)
            .setTitle(`🔮 ${targetUser.displayName}'s Magic Statistics`)
            .setDescription('Magic statistics coming soon!');
        await interaction.reply({ embeds: [embed] });
    },
    
    async showSocialStats(interaction, userData, targetUser, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle(`👥 ${targetUser.displayName}'s Social Statistics`)
            .setDescription('Social statistics coming soon!');
        await interaction.reply({ embeds: [embed] });
    },
    
    async showAchievementStats(interaction, userData, targetUser, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`🏆 ${targetUser.displayName}'s Achievement Statistics`)
            .setDescription('Achievement statistics coming soon!')
            .addFields([
                { name: '🏅 Total Achievements', value: `${userData.achievements?.length || 0}`, inline: true }
            ]);
        await interaction.reply({ embeds: [embed] });
    }
};