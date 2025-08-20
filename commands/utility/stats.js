
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 View comprehensive player statistics and progress!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another player\'s stats')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('View specific stat category')
                .setRequired(false)
                .addChoices(
                    { name: '⚔️ Combat Stats', value: 'combat' },
                    { name: '💰 Economy Stats', value: 'economy' },
                    { name: '🎯 Activity Stats', value: 'activity' },
                    { name: '🏆 Achievements', value: 'achievements' },
                    { name: '📈 Progress', value: 'progress' },
                    { name: '🎮 Gaming Stats', value: 'gaming' }
                )),

    async execute(interaction) {
        const targetUser = interaction.options?.getUser('user') || interaction.user;
        const category = interaction.options?.getString('category');
        const isOwnStats = targetUser.id === interaction.user.id;

        try {
            const userData = await db.getPlayer(targetUser.id);
            if (!userData) {
                return await interaction.reply({
                    content: `❌ ${isOwnStats ? 'You don\'t' : 'This user doesn\'t'} have a treasure hunter profile yet!`,
                    ephemeral: true
                });
            }

            if (category) {
                await this.showCategoryStats(interaction, userData, targetUser, category, isOwnStats);
            } else {
                await this.showOverallStats(interaction, userData, targetUser, isOwnStats);
            }

        } catch (error) {
            console.error('Stats command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading statistics. Please try again.',
                ephemeral: true
            });
        }
    },

    async showOverallStats(interaction, userData, targetUser, isOwnStats) {
        const stats = this.calculateStats(userData);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.stats || '#FFD700')
            .setTitle(`📊 ${isOwnStats ? 'Your' : `${targetUser.displayName}'s`} Adventure Statistics`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setDescription(`**Treasure Hunter Level ${userData.level || 1}** • **${(userData.experience || 0).toLocaleString()} XP**\n${this.createXPProgressBar(userData)}`)
            .addFields([
                {
                    name: '⚔️ Combat Power',
                    value: `**Level:** ${userData.level || 1}\n**Health:** ${userData.health || 100}/${userData.maxHealth || 100}\n**Attack:** ${userData.attack || 10}\n**Defense:** ${userData.defense || 10}\n**Power Score:** ${stats.powerScore}`,
                    inline: true
                },
                {
                    name: '💰 Wealth Status',
                    value: `**Coins:** ${(userData.coins || 0).toLocaleString()}\n**Bank:** ${(userData.bank?.savings || 0).toLocaleString()}\n**Net Worth:** ${stats.netWorth.toLocaleString()}\n**Wealth Rank:** ${stats.wealthRank}\n**Daily Income:** ${stats.dailyIncome.toLocaleString()}`,
                    inline: true
                },
                {
                    name: '🎯 Activity Summary',
                    value: `**Commands Used:** ${stats.commandsUsed.toLocaleString()}\n**Daily Streak:** ${userData.dailyStreak || 0} days\n**Last Active:** ${stats.lastActive}\n**Play Time:** ${stats.playTime}\n**Activity Rank:** ${stats.activityRank}`,
                    inline: true
                },
                {
                    name: '🏆 Achievements',
                    value: `**Unlocked:** ${stats.achievementCount}/100\n**Progress:** ${Math.floor(stats.achievementCount / 100 * 100)}%\n**Points:** ${stats.achievementPoints}\n**Latest:** ${stats.latestAchievement || 'None'}\n**Rare Count:** ${stats.rareAchievements}`,
                    inline: true
                },
                {
                    name: '📈 Skills Progress',
                    value: `**Combat:** Lv.${userData.skills?.combat?.level || 1} (${userData.skills?.combat?.exp || 0} XP)\n**Mining:** Lv.${userData.skills?.mining?.level || 1} (${userData.skills?.mining?.exp || 0} XP)\n**Fishing:** Lv.${userData.skills?.fishing?.level || 1} (${userData.skills?.fishing?.exp || 0} XP)\n**Crafting:** Lv.${userData.skills?.crafting?.level || 1} (${userData.skills?.crafting?.exp || 0} XP)\n**Avg Level:** ${stats.avgSkillLevel}`,
                    inline: true
                },
                {
                    name: '🎒 Inventory & Items',
                    value: `**Items:** ${stats.itemCount}\n**Unique Items:** ${stats.uniqueItems}\n**Equipment:** ${stats.equippedItems}/6\n**Inventory Value:** ${stats.inventoryValue.toLocaleString()}\n**Rarest Item:** ${stats.rarestItem || 'None'}`,
                    inline: true
                },
                {
                    name: '🎮 Gaming Performance',
                    value: `**Hunts Completed:** ${stats.huntsCompleted}\n**Battles Won:** ${stats.battlesWon}/${stats.totalBattles}\n**Win Rate:** ${stats.winRate}%\n**Best Streak:** ${stats.bestStreak}\n**Quests Done:** ${stats.questsCompleted}`,
                    inline: false
                }
            ])
            .setFooter({ 
                text: `Profile created: ${userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'} • Total Score: ${stats.totalScore.toLocaleString()}` 
            })
            .setTimestamp();

        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId(`stats_category_${targetUser.id}`)
            .setPlaceholder('📊 Select a category for detailed stats...')
            .addOptions([
                { label: '⚔️ Combat Stats', value: 'combat', description: 'Detailed combat and battle information' },
                { label: '💰 Economy Stats', value: 'economy', description: 'Wealth, trading, and financial data' },
                { label: '🎯 Activity Stats', value: 'activity', description: 'Usage patterns and engagement metrics' },
                { label: '🏆 Achievements', value: 'achievements', description: 'Unlocked achievements and progress' },
                { label: '📈 Progress', value: 'progress', description: 'Leveling and skill progression details' },
                { label: '🎮 Gaming Stats', value: 'gaming', description: 'Gaming performance and records' }
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`stats_compare_${targetUser.id}`)
                    .setLabel('⚖️ Compare')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!isOwnStats),
                new ButtonBuilder()
                    .setCustomId(`stats_refresh_${targetUser.id}`)
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`stats_export_${targetUser.id}`)
                    .setLabel('📋 Export')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`stats_leaderboard`)
                    .setLabel('🏆 Leaderboard')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(categorySelect),
                buttons
            ]
        });
    },

    async showCategoryStats(interaction, userData, targetUser, category, isOwnStats) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.stats || '#FFD700')
            .setAuthor({ 
                name: `${isOwnStats ? 'Your' : `${targetUser.displayName}'s`} ${this.getCategoryName(category)}`,
                iconURL: targetUser.displayAvatarURL()
            })
            .setTimestamp();

        switch (category) {
            case 'combat':
                this.addCombatStats(embed, userData);
                break;
            case 'economy':
                this.addEconomyStats(embed, userData);
                break;
            case 'activity':
                this.addActivityStats(embed, userData);
                break;
            case 'achievements':
                this.addAchievementStats(embed, userData);
                break;
            case 'progress':
                this.addProgressStats(embed, userData);
                break;
            case 'gaming':
                this.addGamingStats(embed, userData);
                break;
        }

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`stats_back_${targetUser.id}`)
                    .setLabel('← Back to Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`stats_refresh_${targetUser.id}`)
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`stats_detailed_${category}_${targetUser.id}`)
                    .setLabel('📊 Detailed View')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({
            embeds: [embed],
            components: [backButton]
        });
    },

    calculateStats(userData) {
        const inventoryValue = userData.inventory?.items?.reduce((sum, item) => {
            return sum + (item.value || 100);
        }, 0) || 0;

        const skills = userData.skills || {};
        const totalSkillLevels = Object.values(skills).reduce((sum, skill) => sum + (skill?.level || 1), 0);
        const avgSkillLevel = Math.floor(totalSkillLevels / Math.max(Object.keys(skills).length, 1));

        const battlesWon = userData.statistics?.battlesWon || 0;
        const totalBattles = userData.statistics?.totalBattles || Math.max(battlesWon, 1);
        const winRate = Math.floor((battlesWon / totalBattles) * 100);

        const powerScore = (userData.level || 1) * 10 + (userData.attack || 10) + (userData.defense || 10);
        const totalScore = powerScore + (userData.coins || 0) / 100 + (userData.experience || 0) / 10;

        return {
            netWorth: (userData.coins || 0) + (userData.bank?.savings || 0) + inventoryValue,
            wealthRank: this.calculateWealthRank(userData.coins || 0),
            commandsUsed: userData.statistics?.commandsUsed || 0,
            lastActive: this.formatLastActive(userData.lastActive),
            playTime: this.formatPlayTime(userData.statistics?.playTime || 0),
            achievementCount: userData.achievements?.length || 0,
            achievementPoints: (userData.achievements?.length || 0) * 10,
            rareAchievements: userData.achievements?.filter(a => a.rarity === 'rare').length || 0,
            latestAchievement: userData.achievements?.[userData.achievements.length - 1]?.name || 'None',
            itemCount: userData.inventory?.items?.length || 0,
            uniqueItems: new Set(userData.inventory?.items?.map(i => i.id) || []).size,
            equippedItems: userData.equipment ? Object.keys(userData.equipment).length : 0,
            inventoryValue,
            rarestItem: this.findRarestItem(userData.inventory?.items || []),
            avgSkillLevel,
            huntsCompleted: userData.statistics?.huntsCompleted || 0,
            battlesWon,
            totalBattles,
            winRate,
            bestStreak: userData.statistics?.bestStreak || 0,
            questsCompleted: userData.statistics?.questsCompleted || 0,
            powerScore,
            totalScore: Math.floor(totalScore),
            dailyIncome: userData.statistics?.dailyIncome || 0,
            activityRank: this.calculateActivityRank(userData.statistics?.commandsUsed || 0)
        };
    },

    createXPProgressBar(userData) {
        const currentLevel = userData.level || 1;
        const currentXP = userData.experience || 0;
        const xpForNextLevel = currentLevel * 100;
        const xpInCurrentLevel = currentXP % 100;
        
        const progress = Math.floor((xpInCurrentLevel / 100) * 20);
        const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
        
        return `**XP Progress:** ${xpInCurrentLevel}/100 [${bar}] (${xpForNextLevel - xpInCurrentLevel} to next level)`;
    },

    calculateWealthRank(coins) {
        if (coins >= 10000000) return 'Legendary Tycoon 💎';
        if (coins >= 5000000) return 'Diamond Mogul 💠';
        if (coins >= 1000000) return 'Millionaire 💰';
        if (coins >= 500000) return 'Wealthy Elite 🏆';
        if (coins >= 100000) return 'Rich Merchant 💴';
        if (coins >= 50000) return 'Comfortable 💵';
        if (coins >= 10000) return 'Stable 🪙';
        return 'Starting Out 🌱';
    },

    calculateActivityRank(commandsUsed) {
        if (commandsUsed >= 10000) return 'Master Explorer 🌟';
        if (commandsUsed >= 5000) return 'Veteran Adventurer 🗡️';
        if (commandsUsed >= 1000) return 'Active Hunter 🎯';
        if (commandsUsed >= 500) return 'Regular Player 🎮';
        if (commandsUsed >= 100) return 'Casual Explorer 🚶';
        return 'Newcomer 👋';
    },

    findRarestItem(items) {
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        const rarest = items.reduce((prev, current) => {
            const prevRarity = rarityOrder[prev?.rarity] || 0;
            const currentRarity = rarityOrder[current?.rarity] || 0;
            return currentRarity > prevRarity ? current : prev;
        }, null);
        
        return rarest?.name || 'None';
    },

    formatLastActive(timestamp) {
        if (!timestamp) return 'Unknown';
        const diff = Date.now() - timestamp;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours} hours ago`;
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    },

    formatPlayTime(seconds) {
        if (!seconds) return '0 hours';
        const hours = Math.floor(seconds / 3600);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} days, ${hours % 24} hours`;
        return `${hours} hours`;
    },

    getCategoryName(category) {
        const names = {
            combat: '⚔️ Combat Analytics',
            economy: '💰 Economic Report',
            activity: '🎯 Activity Analysis',
            achievements: '🏆 Achievement Gallery',
            progress: '📈 Progress Dashboard',
            gaming: '🎮 Gaming Performance'
        };
        return names[category] || 'Statistics';
    },

    addCombatStats(embed, userData) {
        const combatLevel = userData.skills?.combat?.level || 1;
        const combatXP = userData.skills?.combat?.exp || 0;
        const nextLevelXP = combatLevel * 100;
        
        embed.addFields([
            {
                name: '⚔️ Combat Level & Experience',
                value: `**Level:** ${combatLevel}\n**Experience:** ${combatXP.toLocaleString()}\n**Next Level:** ${nextLevelXP - combatXP} XP\n**Progress:** ${Math.floor((combatXP % 100) / 100 * 100)}%`,
                inline: true
            },
            {
                name: '💪 Combat Attributes',
                value: `**Attack Power:** ${userData.attack || 10}\n**Defense:** ${userData.defense || 10}\n**Critical Rate:** ${userData.criticalRate || 5}%\n**Combat Rating:** ${(userData.attack || 10) + (userData.defense || 10)}`,
                inline: true
            },
            {
                name: '❤️ Health & Vitality',
                value: `**Current HP:** ${userData.health || 100}\n**Max HP:** ${userData.maxHealth || 100}\n**Regeneration:** +${userData.regen || 1}/min\n**Endurance:** ${userData.endurance || 100}`,
                inline: true
            },
            {
                name: '🏆 Battle Statistics',
                value: `**Battles Won:** ${userData.statistics?.battlesWon || 0}\n**Battles Lost:** ${userData.statistics?.battlesLost || 0}\n**Win Rate:** ${this.calculateStats(userData).winRate}%\n**Best Streak:** ${userData.statistics?.bestStreak || 0}`,
                inline: true
            },
            {
                name: '🎯 Combat Efficiency',
                value: `**Damage Dealt:** ${(userData.statistics?.damageDealt || 0).toLocaleString()}\n**Damage Taken:** ${(userData.statistics?.damageTaken || 0).toLocaleString()}\n**Enemies Defeated:** ${userData.statistics?.enemiesDefeated || 0}\n**Bosses Killed:** ${userData.statistics?.bossesKilled || 0}`,
                inline: true
            },
            {
                name: '⚡ Special Abilities',
                value: `**Skills Unlocked:** ${userData.combatSkills?.length || 0}/20\n**Combo Attacks:** ${userData.statistics?.comboAttacks || 0}\n**Perfect Blocks:** ${userData.statistics?.perfectBlocks || 0}\n**Counter Attacks:** ${userData.statistics?.counterAttacks || 0}`,
                inline: true
            }
        ]);
    },

    addEconomyStats(embed, userData) {
        const netWorth = (userData.coins || 0) + (userData.bank?.savings || 0);
        const dailyIncome = userData.statistics?.dailyIncome || 0;
        
        embed.addFields([
            {
                name: '💰 Current Wealth Portfolio',
                value: `**Wallet:** ${(userData.coins || 0).toLocaleString()}\n**Bank Savings:** ${(userData.bank?.savings || 0).toLocaleString()}\n**Investments:** ${(userData.investments?.total || 0).toLocaleString()}\n**Net Worth:** ${netWorth.toLocaleString()}`,
                inline: true
            },
            {
                name: '📈 Income & Earnings',
                value: `**Daily Income:** ${dailyIncome.toLocaleString()}\n**Weekly Average:** ${(dailyIncome * 7).toLocaleString()}\n**Total Earned:** ${(userData.statistics?.totalEarned || 0).toLocaleString()}\n**Passive Income:** ${(userData.statistics?.passiveIncome || 0).toLocaleString()}`,
                inline: true
            },
            {
                name: '🛍️ Trading Activity',
                value: `**Items Sold:** ${userData.statistics?.itemsSold || 0}\n**Items Bought:** ${userData.statistics?.itemsBought || 0}\n**Trading Profit:** ${(userData.statistics?.tradingProfit || 0).toLocaleString()}\n**Market Reputation:** ${userData.marketReputation || 'Neutral'}`,
                inline: true
            },
            {
                name: '💎 Valuable Assets',
                value: `**Rare Items:** ${userData.inventory?.items?.filter(i => i.rarity === 'rare').length || 0}\n**Epic Items:** ${userData.inventory?.items?.filter(i => i.rarity === 'epic').length || 0}\n**Legendary Items:** ${userData.inventory?.items?.filter(i => i.rarity === 'legendary').length || 0}\n**Collection Value:** ${(userData.statistics?.collectionValue || 0).toLocaleString()}`,
                inline: true
            },
            {
                name: '🏦 Banking & Finance',
                value: `**Bank Interest:** ${userData.bank?.interestRate || 2}%\n**Loan Status:** ${userData.loan ? 'Active' : 'None'}\n**Credit Score:** ${userData.creditScore || 100}\n**Investment ROI:** ${userData.investments?.roi || 0}%`,
                inline: true
            },
            {
                name: '📊 Economic Performance',
                value: `**Wealth Rank:** ${this.calculateStats(userData).wealthRank}\n**Economic Growth:** +${userData.statistics?.weeklyGrowth || 0}%\n**Best Day Earnings:** ${(userData.statistics?.bestDayEarnings || 0).toLocaleString()}\n**Spending Efficiency:** ${userData.statistics?.spendingEfficiency || 75}%`,
                inline: true
            }
        ]);
    },

    addActivityStats(embed, userData) {
        const stats = this.calculateStats(userData);
        
        embed.addFields([
            {
                name: '📊 Usage Analytics',
                value: `**Commands Used:** ${stats.commandsUsed.toLocaleString()}\n**Sessions:** ${userData.statistics?.sessions || 0}\n**Average Session:** ${userData.statistics?.avgSession || 0} min\n**Activity Score:** ${userData.statistics?.activityScore || 0}`,
                inline: true
            },
            {
                name: '🔥 Engagement Metrics',
                value: `**Daily Streak:** ${userData.dailyStreak || 0} days\n**Longest Streak:** ${userData.statistics?.longestStreak || 0} days\n**Days Active:** ${userData.statistics?.daysActive || 0}\n**Consistency Rate:** ${userData.statistics?.consistencyRate || 0}%`,
                inline: true
            },
            {
                name: '⏱️ Time Analytics',
                value: `**Total Playtime:** ${stats.playTime}\n**Average Daily:** ${Math.floor((userData.statistics?.playTime || 0) / Math.max(userData.statistics?.daysActive || 1, 1) / 60)} min\n**Peak Activity:** ${userData.statistics?.peakHour || 'Unknown'}\n**Last Session:** ${userData.statistics?.lastSession || 'N/A'}`,
                inline: true
            },
            {
                name: '🎮 Activity Breakdown',
                value: `**Hunts:** ${userData.statistics?.huntsCompleted || 0}\n**Battles:** ${userData.statistics?.totalBattles || 0}\n**Trades:** ${userData.statistics?.tradesCompleted || 0}\n**Social Interactions:** ${userData.statistics?.socialInteractions || 0}`,
                inline: true
            },
            {
                name: '📈 Growth Patterns',
                value: `**Weekly Growth:** +${userData.statistics?.weeklyActivity || 0}%\n**Monthly Trend:** ${userData.statistics?.monthlyTrend || 'Stable'}\n**Peak Performance:** ${userData.statistics?.peakPerformance || 'N/A'}\n**Activity Rank:** ${stats.activityRank}`,
                inline: true
            },
            {
                name: '🎯 Engagement Quality',
                value: `**Feature Usage:** ${userData.statistics?.featuresUsed || 0}/50\n**Help Requests:** ${userData.statistics?.helpRequests || 0}\n**Feedback Given:** ${userData.statistics?.feedbackGiven || 0}\n**Community Score:** ${userData.statistics?.communityScore || 0}`,
                inline: true
            }
        ]);
    },

    addAchievementStats(embed, userData) {
        const achievements = userData.achievements || [];
        const totalAchievements = 100;
        const rareCount = achievements.filter(a => a.rarity === 'rare').length;
        const epicCount = achievements.filter(a => a.rarity === 'epic').length;
        
        embed.addFields([
            {
                name: '🏆 Achievement Overview',
                value: `**Total Unlocked:** ${achievements.length}/${totalAchievements}\n**Completion Rate:** ${Math.floor(achievements.length / totalAchievements * 100)}%\n**Achievement Points:** ${achievements.length * 10}\n**Global Rank:** ${userData.achievementRank || 'Unranked'}`,
                inline: true
            },
            {
                name: '⭐ Achievement Rarity',
                value: `**Common:** ${achievements.filter(a => !a.rarity || a.rarity === 'common').length}\n**Rare:** ${rareCount}\n**Epic:** ${epicCount}\n**Legendary:** ${achievements.filter(a => a.rarity === 'legendary').length}`,
                inline: true
            },
            {
                name: '📈 Recent Progress',
                value: `**This Week:** ${userData.statistics?.achievementsThisWeek || 0}\n**This Month:** ${userData.statistics?.achievementsThisMonth || 0}\n**Latest:** ${achievements[achievements.length - 1]?.name || 'None'}\n**Streak:** ${userData.statistics?.achievementStreak || 0}`,
                inline: true
            },
            {
                name: '🎯 Category Progress',
                value: `**Combat:** ${achievements.filter(a => a.category === 'combat').length}/25\n**Economy:** ${achievements.filter(a => a.category === 'economy').length}/25\n**Social:** ${achievements.filter(a => a.category === 'social').length}/20\n**Exploration:** ${achievements.filter(a => a.category === 'exploration').length}/30`,
                inline: true
            },
            {
                name: '🌟 Special Achievements',
                value: `**Hidden Unlocked:** ${achievements.filter(a => a.hidden).length}\n**Seasonal:** ${achievements.filter(a => a.seasonal).length}\n**Event Exclusive:** ${achievements.filter(a => a.event).length}\n**Perfect Scores:** ${achievements.filter(a => a.perfect).length}`,
                inline: true
            },
            {
                name: '🎖️ Milestone Rewards',
                value: `**Coins Earned:** ${(achievements.length * 100).toLocaleString()}\n**XP Bonus:** ${(achievements.length * 50).toLocaleString()}\n**Special Items:** ${achievements.filter(a => a.itemReward).length}\n**Titles Unlocked:** ${achievements.filter(a => a.titleReward).length}`,
                inline: true
            }
        ]);
    },

    addProgressStats(embed, userData) {
        const stats = this.calculateStats(userData);
        const skills = userData.skills || {};
        
        embed.addFields([
            {
                name: '📈 Character Level Progression',
                value: `**Current Level:** ${userData.level || 1}\n**Total XP:** ${(userData.experience || 0).toLocaleString()}\n**XP to Next:** ${((userData.level || 1) * 100) - (userData.experience || 0)}\n**XP Rate:** ${userData.statistics?.xpPerHour || 0}/hour`,
                inline: true
            },
            {
                name: '🛠️ Skill Development',
                value: `**Average Level:** ${stats.avgSkillLevel}\n**Total Skill XP:** ${Object.values(skills).reduce((sum, skill) => sum + (skill?.exp || 0), 0).toLocaleString()}\n**Skills Mastered:** ${Object.values(skills).filter(skill => (skill?.level || 1) >= 20).length}\n**Skill Points:** ${userData.skillPoints || 0}`,
                inline: true
            },
            {
                name: '⚡ Growth Metrics',
                value: `**XP This Week:** ${(userData.statistics?.weeklyXP || 0).toLocaleString()}\n**Levels Gained:** ${userData.statistics?.levelsGained || 0}\n**Skill Levels Up:** ${userData.statistics?.skillLevelsGained || 0}\n**Growth Rate:** +${userData.statistics?.growthRate || 0}%`,
                inline: true
            },
            {
                name: '🎯 Efficiency Tracking',
                value: `**XP per Command:** ${Math.floor((userData.experience || 0) / Math.max(stats.commandsUsed, 1))}\n**Time to Level:** ${userData.statistics?.timeToLevel || 'N/A'}\n**Efficiency Score:** ${userData.statistics?.efficiencyScore || 0}\n**Optimization:** ${userData.statistics?.optimization || 75}%`,
                inline: true
            },
            {
                name: '🏆 Milestone Progress',
                value: `**Level 10:** ${userData.level >= 10 ? '✅' : '❌'}\n**Level 25:** ${userData.level >= 25 ? '✅' : '❌'}\n**Level 50:** ${userData.level >= 50 ? '✅' : '❌'}\n**Level 100:** ${userData.level >= 100 ? '✅' : '❌'}`,
                inline: true
            },
            {
                name: '📊 Progression Forecast',
                value: `**Next Milestone:** Level ${Math.ceil((userData.level || 1) / 5) * 5}\n**ETA:** ${userData.statistics?.nextMilestoneETA || 'Unknown'}\n**Progress Velocity:** ${userData.statistics?.progressVelocity || 'Steady'}\n**Potential:** ${userData.statistics?.potential || 'High'}`,
                inline: true
            }
        ]);
    },

    addGamingStats(embed, userData) {
        const stats = this.calculateStats(userData);
        
        embed.addFields([
            {
                name: '🎮 Gaming Performance',
                value: `**Win Rate:** ${stats.winRate}%\n**Best Streak:** ${stats.bestStreak}\n**Perfect Games:** ${userData.statistics?.perfectGames || 0}\n**Performance Score:** ${userData.statistics?.performanceScore || 0}`,
                inline: true
            },
            {
                name: '🏆 Competitive Stats',
                value: `**Ranked Matches:** ${userData.statistics?.rankedMatches || 0}\n**Tournament Wins:** ${userData.statistics?.tournamentWins || 0}\n**Leaderboard Rank:** ${userData.leaderboardRank || 'Unranked'}\n**Competitive Rating:** ${userData.competitiveRating || 1000}`,
                inline: true
            },
            {
                name: '🎯 Game Mode Stats',
                value: `**Hunts:** ${stats.huntsCompleted}\n**Battles:** ${stats.totalBattles}\n**Quests:** ${stats.questsCompleted}\n**Mini-games:** ${userData.statistics?.minigamesPlayed || 0}`,
                inline: true
            },
            {
                name: '⭐ High Scores',
                value: `**Best Hunt:** ${userData.statistics?.bestHuntScore || 0}\n**Highest Combo:** ${userData.statistics?.highestCombo || 0}\n**Max Damage:** ${userData.statistics?.maxDamage || 0}\n**Best Time:** ${userData.statistics?.bestTime || 'N/A'}`,
                inline: true
            },
            {
                name: '🎪 Fun Stats',
                value: `**Lucky Wins:** ${userData.statistics?.luckyWins || 0}\n**Close Calls:** ${userData.statistics?.closeCalls || 0}\n**Comeback Wins:** ${userData.statistics?.comebackWins || 0}\n**Flawless Victories:** ${userData.statistics?.flawlessVictories || 0}`,
                inline: true
            },
            {
                name: '📈 Improvement Tracking',
                value: `**Personal Bests:** ${userData.statistics?.personalBests || 0}\n**Records Broken:** ${userData.statistics?.recordsBroken || 0}\n**Skill Ceiling:** ${userData.statistics?.skillCeiling || 'Growing'}\n**Consistency:** ${userData.statistics?.consistencyRating || 75}%`,
                inline: true
            }
        ]);
    }
};
