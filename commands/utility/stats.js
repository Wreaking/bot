const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const { db } = require('../../database.js');

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
                    { name: '📈 Progress', value: 'progress' }
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
            .setDescription(`**Treasure Hunter Level ${userData.level || 1}** • **${userData.experience || 0} XP**`)
            .addFields([
                {
                    name: '⚔️ Combat Power',
                    value: `**Level:** ${userData.level || 1}\n**Health:** ${userData.health || 100}/${userData.maxHealth || 100}\n**Strength:** ${userData.strength || 10}\n**Defense:** ${userData.defense || 10}`,
                    inline: true
                },
                {
                    name: '💰 Wealth Status',
                    value: `**Coins:** ${(userData.coins || 0).toLocaleString()}\n**Bank:** ${(userData.bank?.savings || 0).toLocaleString()}\n**Net Worth:** ${stats.netWorth.toLocaleString()}\n**Rank:** ${stats.wealthRank}`,
                    inline: true
                },
                {
                    name: '🎯 Activity Summary',
                    value: `**Commands Used:** ${stats.commandsUsed}\n**Daily Streak:** ${userData.dailyStreak || 0} days\n**Last Active:** ${stats.lastActive}\n**Play Time:** ${stats.playTime}`,
                    inline: true
                },
                {
                    name: '🏆 Achievements',
                    value: `**Unlocked:** ${stats.achievementCount}/50\n**Progress:** ${Math.floor(stats.achievementCount / 50 * 100)}%\n**Latest:** ${stats.latestAchievement || 'None'}`,
                    inline: true
                },
                {
                    name: '📈 Skills Progress',
                    value: `**Mining:** Lv.${userData.skills?.mining || 1}\n**Fishing:** Lv.${userData.skills?.fishing || 1}\n**Combat:** Lv.${userData.skills?.combat || 1}\n**Crafting:** Lv.${userData.skills?.crafting || 1}`,
                    inline: true
                },
                {
                    name: '🎒 Inventory Stats',
                    value: `**Items:** ${stats.itemCount}\n**Unique Items:** ${stats.uniqueItems}\n**Equipment:** ${stats.equippedItems}/5\n**Bag Value:** ${stats.inventoryValue.toLocaleString()}`,
                    inline: true
                }
            ])
            .setFooter({ 
                text: `Profile created: ${userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}` 
            })
            .setTimestamp();

        // Create interactive components
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId(`stats_category_${targetUser.id}`)
            .setPlaceholder('📊 Select a category for detailed stats...')
            .addOptions([
                { label: '⚔️ Combat Stats', value: 'combat', description: 'Detailed combat and skill information' },
                { label: '💰 Economy Stats', value: 'economy', description: 'Wealth, trading, and financial data' },
                { label: '🎯 Activity Stats', value: 'activity', description: 'Usage patterns and engagement' },
                { label: '🏆 Achievements', value: 'achievements', description: 'Unlocked achievements and progress' },
                { label: '📈 Progress', value: 'progress', description: 'Leveling and skill progression' }
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
            });

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
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [backButton]
        });
    },

    // Button handlers
    buttonHandlers: {
        async compare(interaction) {
            await interaction.reply({
                content: '⚖️ **Player Comparison** feature coming soon!\nCompare your stats with friends and server members.',
                ephemeral: true
            });
        },

        async refresh(interaction) {
            const targetUserId = interaction.customId.split('_')[2];
            const targetUser = await interaction.client.users.fetch(targetUserId);

            const newInteraction = {
                ...interaction,
                options: {
                    getUser: (name) => name === 'user' ? targetUser : interaction.user,
                    getString: () => null
                }
            };

            await module.exports.execute(newInteraction);
        },

        async export(interaction) {
            const targetUserId = interaction.customId.split('_')[2];
            const userData = await db.getPlayer(targetUserId);
            const stats = this.calculateStats(userData);

            const exportData = {
                player: interaction.user.username,
                level: userData.level || 1,
                experience: userData.experience || 0,
                coins: userData.coins || 0,
                netWorth: stats.netWorth,
                achievements: stats.achievementCount,
                playTime: stats.playTime,
                exported: new Date().toISOString()
            };

            await interaction.reply({
                content: `📋 **Stats Export**\n\`\`\`json\n${JSON.stringify(exportData, null, 2)}\`\`\``,
                ephemeral: true
            });
        },

        async leaderboard(interaction) {
            // This would integrate with the leaderboard command
            await interaction.reply({
                content: '🏆 Use `/leaderboard` to view server rankings and compete with other treasure hunters!',
                ephemeral: true
            });
        },

        async back(interaction) {
            const targetUserId = interaction.customId.split('_')[2];
            const targetUser = await interaction.client.users.fetch(targetUserId);

            const newInteraction = {
                ...interaction,
                options: {
                    getUser: (name) => name === 'user' ? targetUser : interaction.user,
                    getString: () => null
                }
            };

            await module.exports.showOverallStats(newInteraction, await db.getPlayer(targetUserId), targetUser, targetUserId === interaction.user.id);
        }
    },

    // Select menu handlers
    selectMenuHandlers: {
        async category(interaction) {
            const category = interaction.values[0];
            const targetUserId = interaction.customId.split('_')[2];
            const targetUser = await interaction.client.users.fetch(targetUserId);
            const userData = await db.getPlayer(targetUserId);

            await this.showCategoryStats(interaction, userData, targetUser, category, targetUserId === interaction.user.id);
        }
    },

    // Helper methods
    calculateStats(userData) {
        const inventoryValue = userData.inventory?.items?.reduce((sum, item) => {
            // This would calculate based on item prices
            return sum + 100; // Placeholder
        }, 0) || 0;

        return {
            netWorth: (userData.coins || 0) + (userData.bank?.savings || 0) + inventoryValue,
            wealthRank: this.calculateWealthRank(userData.coins || 0),
            commandsUsed: userData.statistics?.commandsUsed || 0,
            lastActive: this.formatLastActive(userData.lastActive),
            playTime: this.formatPlayTime(userData.playTime),
            achievementCount: userData.achievements?.length || 0,
            latestAchievement: userData.achievements?.[userData.achievements.length - 1]?.name || 'None',
            itemCount: userData.inventory?.items?.length || 0,
            uniqueItems: new Set(userData.inventory?.items?.map(i => i.id) || []).size,
            equippedItems: userData.equipment ? Object.keys(userData.equipment).length : 0,
            inventoryValue
        };
    },

    calculateWealthRank(coins) {
        if (coins >= 1000000) return 'Tycoon 💎';
        if (coins >= 500000) return 'Wealthy 💰';
        if (coins >= 100000) return 'Rich 🏆';
        if (coins >= 50000) return 'Comfortable 💴';
        if (coins >= 10000) return 'Stable 💵';
        return 'Starting Out 🪙';
    },

    formatLastActive(timestamp) {
        if (!timestamp) return 'Unknown';
        const diff = Date.now() - timestamp;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    },

    formatPlayTime(seconds) {
        if (!seconds) return '0 hours';
        const hours = Math.floor(seconds / 3600);
        return `${hours} hours`;
    },

    getCategoryName(category) {
        const names = {
            combat: '⚔️ Combat Statistics',
            economy: '💰 Economic Overview',
            activity: '🎯 Activity Report',
            achievements: '🏆 Achievement Progress',
            progress: '📈 Character Progression'
        };
        return names[category] || 'Statistics';
    },

    addCombatStats(embed, userData) {
        embed.addFields([
            {
                name: '⚔️ Combat Level',
                value: `**Level:** ${userData.level || 1}\n**Experience:** ${userData.experience || 0}\n**Next Level:** ${((userData.level || 1) * 100) - (userData.experience || 0)} XP`,
                inline: true
            },
            {
                name: '💪 Attributes',
                value: `**Strength:** ${userData.strength || 10}\n**Defense:** ${userData.defense || 10}\n**Agility:** ${userData.agility || 10}\n**Intelligence:** ${userData.intelligence || 10}`,
                inline: true
            },
            {
                name: '❤️ Health & Mana',
                value: `**Health:** ${userData.health || 100}/${userData.maxHealth || 100}\n**Mana:** ${userData.mana || 100}/${userData.maxMana || 100}\n**Regeneration:** +${userData.regen || 1}/min`,
                inline: true
            }
        ]);
    },

    addEconomyStats(embed, userData) {
        const netWorth = (userData.coins || 0) + (userData.bank?.savings || 0);
        embed.addFields([
            {
                name: '💰 Current Wealth',
                value: `**Wallet:** ${(userData.coins || 0).toLocaleString()}\n**Bank:** ${(userData.bank?.savings || 0).toLocaleString()}\n**Net Worth:** ${netWorth.toLocaleString()}`,
                inline: true
            },
            {
                name: '📈 Trading Stats',
                value: `**Items Sold:** ${userData.statistics?.itemsSold || 0}\n**Items Bought:** ${userData.statistics?.itemsBought || 0}\n**Profit Made:** ${(userData.statistics?.profit || 0).toLocaleString()}`,
                inline: true
            },
            {
                name: '🎯 Income Sources',
                value: `**Daily Claims:** ${userData.statistics?.dailyClaims || 0}\n**Work Sessions:** ${userData.statistics?.workSessions || 0}\n**Treasure Found:** ${userData.statistics?.treasureFound || 0}`,
                inline: true
            }
        ]);
    },

    addActivityStats(embed, userData) {
        embed.addFields([
            {
                name: '📊 Usage Statistics',
                value: `**Commands Used:** ${userData.statistics?.commandsUsed || 0}\n**Sessions:** ${userData.statistics?.sessions || 0}\n**Average Session:** ${userData.statistics?.avgSession || 0} min`,
                inline: true
            },
            {
                name: '🔥 Streaks & Consistency',
                value: `**Daily Streak:** ${userData.dailyStreak || 0} days\n**Longest Streak:** ${userData.statistics?.longestStreak || 0} days\n**Days Active:** ${userData.statistics?.daysActive || 0}`,
                inline: true
            },
            {
                name: '🎮 Game Activities',
                value: `**Hunts Completed:** ${userData.statistics?.huntsCompleted || 0}\n**Battles Won:** ${userData.statistics?.battlesWon || 0}\n**Quests Finished:** ${userData.statistics?.questsCompleted || 0}`,
                inline: true
            }
        ]);
    },

    addAchievementStats(embed, userData) {
        const achievements = userData.achievements || [];
        const totalAchievements = 50; // This would be dynamically calculated

        embed.addFields([
            {
                name: '🏆 Achievement Progress',
                value: `**Unlocked:** ${achievements.length}/${totalAchievements}\n**Completion:** ${Math.floor(achievements.length / totalAchievements * 100)}%\n**Points:** ${achievements.length * 10}`,
                inline: true
            },
            {
                name: '⭐ Recent Achievements',
                value: achievements.slice(-3).map(a => `• ${a.name}`).join('\n') || 'No achievements yet',
                inline: true
            },
            {
                name: '🎯 Categories',
                value: '**Combat:** 2/10\n**Economy:** 3/10\n**Social:** 1/5\n**Exploration:** 4/15',
                inline: true
            }
        ]);
    },

    addProgressStats(embed, userData) {
        embed.addFields([
            {
                name: '📈 Level Progression',
                value: `**Current Level:** ${userData.level || 1}\n**Total XP:** ${userData.experience || 0}\n**XP to Next:** ${((userData.level || 1) * 100) - (userData.experience || 0)}`,
                inline: true
            },
            {
                name: '🛠️ Skill Levels',
                value: `**Mining:** ${userData.skills?.mining || 1}\n**Fishing:** ${userData.skills?.fishing || 1}\n**Combat:** ${userData.skills?.combat || 1}\n**Crafting:** ${userData.skills?.crafting || 1}`,
                inline: true
            },
            {
                name: '📊 Growth Rate',
                value: `**XP/Day:** ${userData.statistics?.xpPerDay || 0}\n**Level Gains:** ${userData.statistics?.levelsGained || 0}\n**Skill Points:** ${userData.statistics?.skillPoints || 0}`,
                inline: true
            }
        ]);
    }
};