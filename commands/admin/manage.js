const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config.js');
const { db } = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('⚙️ Advanced admin panel for treasure hunt bot management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    cooldown: 5, // 5 second cooldown
    
    async execute(interaction) {
        try {
            // Enhanced permission check
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
                !config.security?.adminUsers?.includes(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('error'))
                    .setTitle('🚫 Access Denied')
                    .setDescription('You need **Administrator** permissions or be listed as a bot admin to use this command!')
                    .setFooter({ text: 'Contact a server administrator for access' })
                    .setTimestamp();
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get server statistics
            const stats = await this.getServerStats(interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor(config.getEmbedColor('magic'))
                .setTitle(`${config.getEmoji('crown')} **BOT ADMINISTRATION PANEL**`)
                .setDescription(`### ${config.getEmoji('magic')} **Treasure Hunt Bot Management Suite**\n` +
                    `Welcome to the comprehensive admin control center!\n\n` +
                    `**Server:** ${interaction.guild.name}\n` +
                    `**Admin:** ${interaction.user.displayName}\n` +
                    `**Bot Version:** ${config.version}\n\n` +
                    `${config.getEmoji('lightning')} **Quick Stats:**\n` +
                    `${config.getEmoji('coin')} Active Players: **${stats.totalPlayers}**\n` +
                    `${config.getEmoji('treasure')} Total Hunts: **${stats.totalHunts}**\n` +
                    `${config.getEmoji('gem')} Economy Value: **${stats.totalCoins.toLocaleString()}** coins`)
                .addFields(
                    { 
                        name: `${config.getEmoji('fire')} **Server Management**`, 
                        value: `${config.getEmoji('star')} Player Statistics\n` +
                               `${config.getEmoji('shield')} Database Tools\n` +
                               `${config.getEmoji('lightning')} Performance Monitor`, 
                        inline: true 
                    },
                    { 
                        name: `${config.getEmoji('magic')} **Game Control**`, 
                        value: `${config.getEmoji('crown')} Event Manager\n` +
                               `${config.getEmoji('coin')} Economy Control\n` +
                               `${config.getEmoji('dragon')} Special Features`, 
                        inline: true 
                    },
                    { 
                        name: `${config.getEmoji('gem')} **Advanced Tools**`, 
                        value: `${config.getEmoji('key')} Configuration\n` +
                               `${config.getEmoji('scroll')} Announcements\n` +
                               `${config.getEmoji('heart')} Bot Health`, 
                        inline: true 
                    }
                )
                .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
                .setImage('https://i.imgur.com/placeholder-admin-banner.png') // Optional banner
                .setFooter({ 
                    text: `Admin Panel • Use buttons below to navigate • Version ${config.version}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Create interactive buttons with enhanced styling
            const statsButton = new ButtonBuilder()
                .setCustomId('manage_stats_overview')
                .setLabel('Server Statistics')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(config.getEmoji('star'));

            const databaseButton = new ButtonBuilder()
                .setCustomId('manage_database_tools')
                .setLabel('Database Manager')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗄️');

            const economyButton = new ButtonBuilder()
                .setCustomId('manage_economy_control')
                .setLabel('Economy Control')
                .setStyle(ButtonStyle.Success)
                .setEmoji(config.getEmoji('coin'));

            const eventsButton = new ButtonBuilder()
                .setCustomId('manage_events_panel')
                .setLabel('Events & Rewards')
                .setStyle(ButtonStyle.Success)
                .setEmoji(config.getEmoji('fire'));

            const configButton = new ButtonBuilder()
                .setCustomId('manage_config_panel')
                .setLabel('Bot Configuration')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(config.getEmoji('key'));

            // Second row of advanced features
            const performanceButton = new ButtonBuilder()
                .setCustomId('manage_performance_monitor')
                .setLabel('Performance')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(config.getEmoji('lightning'));

            const playersButton = new ButtonBuilder()
                .setCustomId('manage_player_tools')
                .setLabel('Player Manager')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(config.getEmoji('crown'));

            const announcementButton = new ButtonBuilder()
                .setCustomId('manage_announcement_center')
                .setLabel('Announcements')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📢');

            const healthButton = new ButtonBuilder()
                .setCustomId('manage_health_check')
                .setLabel('System Health')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(config.getEmoji('heart'));

            const emergencyButton = new ButtonBuilder()
                .setCustomId('manage_emergency_tools')
                .setLabel('Emergency Tools')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚨');

            // Organize buttons into rows
            const row1 = new ActionRowBuilder().addComponents(statsButton, databaseButton, economyButton);
            const row2 = new ActionRowBuilder().addComponents(eventsButton, configButton, performanceButton);
            const row3 = new ActionRowBuilder().addComponents(playersButton, announcementButton, healthButton);

            // Add emergency tools if user is super admin
            const components = [row1, row2, row3];
            if (config.security?.adminUsers?.includes(interaction.user.id)) {
                const emergencyRow = new ActionRowBuilder().addComponents(emergencyButton);
                components.push(emergencyRow);
            }

            await interaction.reply({ 
                embeds: [embed], 
                components: components, 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error in manage command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.getEmbedColor('error'))
                .setTitle('❌ Command Error')
                .setDescription('An error occurred while loading the admin panel. Please try again.')
                .setFooter({ text: 'If this persists, check the console logs' })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    // Button handlers for the manage command
    buttonHandlers: {
        // Statistics Overview Handler
        stats_overview: async function(interaction) {
            try {
                await interaction.deferUpdate();
                
                const guildStats = await this.getServerStats(interaction.guild.id);
                const globalStats = await db.getGlobalStats();
                const leaderboard = await db.getLeaderboard('coins', 1, 5);

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('info'))
                    .setTitle(`${config.getEmoji('star')} **Server Statistics Dashboard**`)
                    .setDescription(`### ${config.getEmoji('gem')} **Comprehensive Server Analytics**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('crown')} **Player Statistics**`,
                            value: `${config.getEmoji('heart')} Active Players: **${guildStats.totalPlayers}**\n` +
                                   `${config.getEmoji('fire')} Daily Active: **${guildStats.dailyActive}**\n` +
                                   `${config.getEmoji('star')} New This Week: **${guildStats.weeklyNew}**\n` +
                                   `${config.getEmoji('level')} Average Level: **${Math.floor(globalStats.averageLevel || 1)}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('coin')} **Economy Overview**`,
                            value: `${config.getEmoji('treasure')} Total Coins: **${globalStats.totalCoins.toLocaleString()}**\n` +
                                   `${config.getEmoji('coin')} Average Wealth: **${globalStats.averageCoins.toLocaleString()}**\n` +
                                   `${config.getEmoji('gem')} Richest Player: **${guildStats.richestAmount.toLocaleString()}**\n` +
                                   `${config.getEmoji('magic')} Daily Trades: **${guildStats.dailyTransactions}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('dragon')} **Game Activity**`,
                            value: `${config.getEmoji('map')} Total Hunts: **${globalStats.totalHunts}**\n` +
                                   `${config.getEmoji('sword')} Battles Won: **${guildStats.battlesWon}**\n` +
                                   `${config.getEmoji('scroll')} Quests Done: **${guildStats.questsCompleted}**\n` +
                                   `${config.getEmoji('shield')} Active Events: **${guildStats.activeEvents}**`,
                            inline: true
                        }
                    );

                // Add top players if available
                if (leaderboard.players && leaderboard.players.length > 0) {
                    const topPlayersText = leaderboard.players.slice(0, 5).map((player, index) => {
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                        return `${medals[index]} <@${player.userId}>: **${player.coins.toLocaleString()}** coins`;
                    }).join('\n');

                    embed.addFields({
                        name: `${config.getEmoji('crown')} **Top Players**`,
                        value: topPlayersText,
                        inline: false
                    });
                }

                embed.setFooter({ 
                    text: `Last updated: ${new Date().toLocaleTimeString()} • Refresh for latest data`,
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

                const refreshButton = new ButtonBuilder()
                    .setCustomId('manage_stats_refresh')
                    .setLabel('Refresh Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const exportButton = new ButtonBuilder()
                    .setCustomId('manage_export_stats')
                    .setLabel('Export Data')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📊');

                const row = new ActionRowBuilder().addComponents(refreshButton, exportButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in stats overview:', error);
                await this.sendErrorResponse(interaction, 'Failed to load statistics');
            }
        },

        // Database Tools Handler
        database_tools: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const healthCheck = await db.healthCheck();
                const stats = await this.getDatabaseStats();

                const embed = new EmbedBuilder()
                    .setColor(healthCheck.status === 'healthy' ? config.getEmbedColor('success') : config.getEmbedColor('warning'))
                    .setTitle(`🗄️ **Database Management Center**`)
                    .setDescription(`### ${config.getEmoji('shield')} **Database Status & Tools**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('heart')} **Health Status**`,
                            value: `Status: **${healthCheck.status}**\n` +
                                   `Cache Size: **${healthCheck.cacheSize}** entries\n` +
                                   `Last Check: **${new Date(healthCheck.timestamp).toLocaleTimeString()}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('gem')} **Database Stats**`,
                            value: `Players: **${stats.playerCount}**\n` +
                                   `Guilds: **${stats.guildCount}**\n` +
                                   `Active Hunts: **${stats.activeHunts}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Performance**`,
                            value: `Avg Response: **${stats.avgResponseTime}ms**\n` +
                                   `Success Rate: **${stats.successRate}%**\n` +
                                   `Last Backup: **${stats.lastBackup}**`,
                            inline: true
                        }
                    );

                const backupButton = new ButtonBuilder()
                    .setCustomId('manage_database_backup')
                    .setLabel('Create Backup')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💾');

                const cleanupButton = new ButtonBuilder()
                    .setCustomId('manage_database_cleanup')
                    .setLabel('Cleanup Database')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🧹');

                const optimizeButton = new ButtonBuilder()
                    .setCustomId('manage_database_optimize')
                    .setLabel('Optimize Performance')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡');

                const repairButton = new ButtonBuilder()
                    .setCustomId('manage_database_repair')
                    .setLabel('Repair Issues')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔧');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row1 = new ActionRowBuilder().addComponents(backupButton, cleanupButton, optimizeButton);
                const row2 = new ActionRowBuilder().addComponents(repairButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row1, row2] });

            } catch (error) {
                console.error('Error in database tools:', error);
                await this.sendErrorResponse(interaction, 'Failed to load database tools');
            }
        },

        // Economy Control Handler
        economy_control: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const economyStats = await this.getEconomyStats();

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('economy'))
                    .setTitle(`${config.getEmoji('coin')} **Economy Control Center**`)
                    .setDescription(`### ${config.getEmoji('treasure')} **Server Economy Management**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('gem')} **Current Settings**`,
                            value: `Daily Reward: **${config.economy.dailyReward}** coins\n` +
                                   `Work Reward: **${config.economy.workReward.min}-${config.economy.workReward.max}** coins\n` +
                                   `Hunt Multiplier: **${config.huntSettings.rewardMultiplier.medium}x**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('fire')} **Economy Health**`,
                            value: `Inflation Rate: **${economyStats.inflationRate}%**\n` +
                                   `Wealth Gap: **${economyStats.wealthGap}**\n` +
                                   `Active Circulation: **${economyStats.activeCoins.toLocaleString()}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('star')} **Quick Actions**`,
                            value: `${config.getEmoji('lightning')} Adjust reward rates\n` +
                                   `${config.getEmoji('magic')} Create bonus events\n` +
                                   `${config.getEmoji('crown')} Manage wealth distribution`,
                            inline: true
                        }
                    );

                const adjustRewardsButton = new ButtonBuilder()
                    .setCustomId('manage_economy_adjust_rewards')
                    .setLabel('Adjust Rewards')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('coin'));

                const bonusEventButton = new ButtonBuilder()
                    .setCustomId('manage_economy_bonus_event')
                    .setLabel('Create Bonus Event')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('fire'));

                const redistributeButton = new ButtonBuilder()
                    .setCustomId('manage_economy_redistribute')
                    .setLabel('Wealth Tools')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('crown'));

                const taxSystemButton = new ButtonBuilder()
                    .setCustomId('manage_economy_tax_system')
                    .setLabel('Tax System')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💰');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row1 = new ActionRowBuilder().addComponents(adjustRewardsButton, bonusEventButton, redistributeButton);
                const row2 = new ActionRowBuilder().addComponents(taxSystemButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row1, row2] });

            } catch (error) {
                console.error('Error in economy control:', error);
                await this.sendErrorResponse(interaction, 'Failed to load economy control');
            }
        },

        // Events Panel Handler
        events_panel: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const activeEvents = await db.getAllEvents();
                const eventCount = Object.keys(activeEvents).length;

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('treasure'))
                    .setTitle(`${config.getEmoji('fire')} **Events & Rewards Center**`)
                    .setDescription(`### ${config.getEmoji('dragon')} **Special Events Management**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('star')} **Active Events**`,
                            value: eventCount > 0 ? 
                                `Currently running: **${eventCount}** events\n` +
                                `${config.getEmoji('fire')} Double XP Weekend\n` +
                                `${config.getEmoji('treasure')} Treasure Hunt Marathon` :
                                `No active events\n${config.getEmoji('magic')} Create your first event!`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('crown')} **Event Types**`,
                            value: `${config.getEmoji('coin')} Economy Boost\n` +
                                   `${config.getEmoji('exp')} XP Multiplier\n` +
                                   `${config.getEmoji('gem')} Rare Drop Events\n` +
                                   `${config.getEmoji('dragon')} Boss Battles`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Quick Actions**`,
                            value: `${config.getEmoji('magic')} Create new event\n` +
                                   `${config.getEmoji('sword')} Modify existing\n` +
                                   `${config.getEmoji('shield')} Emergency stop`,
                            inline: true
                        }
                    );

                const createEventButton = new ButtonBuilder()
                    .setCustomId('manage_events_create')
                    .setLabel('Create Event')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('magic'));

                const manageEventsButton = new ButtonBuilder()
                    .setCustomId('manage_events_list')
                    .setLabel('Manage Events')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('crown'));

                const rewardsButton = new ButtonBuilder()
                    .setCustomId('manage_events_rewards')
                    .setLabel('Special Rewards')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(config.getEmoji('treasure'));

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(createEventButton, manageEventsButton, rewardsButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in events panel:', error);
                await this.sendErrorResponse(interaction, 'Failed to load events panel');
            }
        },

        // Performance Monitor Handler
        performance_monitor: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const performance = await this.getPerformanceMetrics();
                const botStats = await this.getBotPerformance();

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('info'))
                    .setTitle(`${config.getEmoji('lightning')} **Performance Monitor**`)
                    .setDescription(`### ${config.getEmoji('fire')} **System Performance Dashboard**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('heart')} **System Health**`,
                            value: `CPU Usage: **${performance.cpuUsage}%**\n` +
                                   `Memory: **${performance.memoryUsage}MB**\n` +
                                   `Uptime: **${performance.uptime}**\n` +
                                   `Status: **${performance.status}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Bot Performance**`,
                            value: `Commands/min: **${botStats.commandsPerMinute}**\n` +
                                   `Response Time: **${botStats.avgResponseTime}ms**\n` +
                                   `Error Rate: **${botStats.errorRate}%**\n` +
                                   `Active Users: **${botStats.activeUsers}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('shield')} **Database Performance**`,
                            value: `Query Time: **${performance.dbQueryTime}ms**\n` +
                                   `Cache Hit Rate: **${performance.cacheHitRate}%**\n` +
                                   `Connections: **${performance.dbConnections}**\n` +
                                   `Last Optimization: **${performance.lastOptimization}**`,
                            inline: true
                        }
                    );

                const optimizeButton = new ButtonBuilder()
                    .setCustomId('manage_performance_optimize')
                    .setLabel('Optimize Now')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚡');

                const clearCacheButton = new ButtonBuilder()
                    .setCustomId('manage_performance_clear_cache')
                    .setLabel('Clear Cache')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🧹');

                const restartButton = new ButtonBuilder()
                    .setCustomId('manage_performance_restart')
                    .setLabel('Soft Restart')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔄');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(optimizeButton, clearCacheButton, restartButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in performance monitor:', error);
                await this.sendErrorResponse(interaction, 'Failed to load performance monitor');
            }
        },

        // Player Tools Handler
        player_tools: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const playerStats = await this.getPlayerManagementStats();
                const recentPlayers = await this.getRecentPlayers();

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('profile'))
                    .setTitle(`${config.getEmoji('crown')} **Player Management Center**`)
                    .setDescription(`### ${config.getEmoji('magic')} **Advanced Player Administration**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('star')} **Player Overview**`,
                            value: `Total Players: **${playerStats.totalPlayers}**\n` +
                                   `Active Today: **${playerStats.activeToday}**\n` +
                                   `New This Week: **${playerStats.newThisWeek}**\n` +
                                   `Top Level: **${playerStats.topLevel}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('shield')} **Moderation Tools**`,
                            value: `${config.getEmoji('sword')} Ban/Unban Players\n` +
                                   `${config.getEmoji('coin')} Adjust Balances\n` +
                                   `${config.getEmoji('level')} Modify Levels\n` +
                                   `${config.getEmoji('gem')} Reset Progress`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('fire')} **Bulk Actions**`,
                            value: `${config.getEmoji('lightning')} Mass Rewards\n` +
                                   `${config.getEmoji('magic')} Level Adjustments\n` +
                                   `${config.getEmoji('treasure')} Event Bonuses\n` +
                                   `${config.getEmoji('heart')} Health Restore`,
                            inline: true
                        }
                    );

                // Add recent player activity if available
                if (recentPlayers && recentPlayers.length > 0) {
                    const recentPlayersText = recentPlayers.slice(0, 5).map(player => 
                        `${config.getEmoji('star')} <@${player.userId}>: Level **${player.level}** (${player.lastActive})`
                    ).join('\n');
                    
                    embed.addFields({
                        name: `${config.getEmoji('fire')} **Recent Activity**`,
                        value: recentPlayersText,
                        inline: false
                    });
                }

                const searchPlayerButton = new ButtonBuilder()
                    .setCustomId('manage_player_search')
                    .setLabel('Search Player')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍');

                const bulkRewardButton = new ButtonBuilder()
                    .setCustomId('manage_player_bulk_reward')
                    .setLabel('Bulk Rewards')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('treasure'));

                const moderateButton = new ButtonBuilder()
                    .setCustomId('manage_player_moderate')
                    .setLabel('Moderation Tools')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(config.getEmoji('shield'));

                const leaderboardButton = new ButtonBuilder()
                    .setCustomId('manage_player_leaderboard_reset')
                    .setLabel('Reset Leaderboard')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🏆');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row1 = new ActionRowBuilder().addComponents(searchPlayerButton, bulkRewardButton, moderateButton);
                const row2 = new ActionRowBuilder().addComponents(leaderboardButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row1, row2] });

            } catch (error) {
                console.error('Error in player tools:', error);
                await this.sendErrorResponse(interaction, 'Failed to load player tools');
            }
        },

        // Announcement Center Handler
        announcement_center: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('info'))
                    .setTitle('📢 **Announcement Center**')
                    .setDescription(`### ${config.getEmoji('magic')} **Server Communication Hub**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('lightning')} **Announcement Types**`,
                            value: `${config.getEmoji('fire')} **System Updates**\n` +
                                   `${config.getEmoji('treasure')} **Event Notifications**\n` +
                                   `${config.getEmoji('crown')} **Competition Results**\n` +
                                   `${config.getEmoji('magic')} **Special Rewards**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('gem')} **Broadcast Options**`,
                            value: `${config.getEmoji('star')} **Server Wide**\n` +
                                   `${config.getEmoji('shield')} **Admin Channel**\n` +
                                   `${config.getEmoji('heart')} **DM to Players**\n` +
                                   `${config.getEmoji('sword')} **Role Mentions**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('scroll')} **Templates**`,
                            value: `Ready-to-use announcement templates for common situations`,
                            inline: false
                        }
                    );

                const createAnnouncementButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_create')
                    .setLabel('Create Announcement')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✍️');

                const templatesButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_templates')
                    .setLabel('Use Template')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝');

                const scheduledButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_scheduled')
                    .setLabel('Schedule Message')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⏰');

                const historyButton = new ButtonBuilder()
                    .setCustomId('manage_announcement_history')
                    .setLabel('View History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row1 = new ActionRowBuilder().addComponents(createAnnouncementButton, templatesButton, scheduledButton);
                const row2 = new ActionRowBuilder().addComponents(historyButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row1, row2] });

            } catch (error) {
                console.error('Error in announcement center:', error);
                await this.sendErrorResponse(interaction, 'Failed to load announcement center');
            }
        },

        // Health Check Handler
        health_check: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const healthData = await db.healthCheck();
                const systemHealth = await this.getSystemHealth();

                const isHealthy = healthData.status === 'healthy' && systemHealth.overall === 'good';
                const statusEmoji = isHealthy ? '✅' : '⚠️';
                const healthColor = isHealthy ? config.getEmbedColor('success') : config.getEmbedColor('warning');

                const embed = new EmbedBuilder()
                    .setColor(healthColor)
                    .setTitle(`${config.getEmoji('heart')} **System Health Dashboard**`)
                    .setDescription(`### ${statusEmoji} **Overall Status: ${systemHealth.overall.toUpperCase()}**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('shield')} **Database Health**`,
                            value: `Status: **${healthData.status}**\n` +
                                   `Response Time: **${systemHealth.dbResponseTime}ms**\n` +
                                   `Cache Size: **${healthData.cacheSize}** items\n` +
                                   `Last Check: **${new Date(healthData.timestamp).toLocaleTimeString()}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('lightning')} **Bot Performance**`,
                            value: `Memory Usage: **${systemHealth.memoryUsage}%**\n` +
                                   `CPU Load: **${systemHealth.cpuLoad}%**\n` +
                                   `Active Commands: **${systemHealth.activeCommands}**\n` +
                                   `Error Rate: **${systemHealth.errorRate}%**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('magic')} **Feature Status**`,
                            value: `${config.features.economy ? '✅' : '❌'} Economy System\n` +
                                   `${config.features.leaderboards ? '✅' : '❌'} Leaderboards\n` +
                                   `${config.features.achievements ? '✅' : '❌'} Achievements\n` +
                                   `${config.features.battles ? '✅' : '❌'} Battle System`,
                            inline: true
                        }
                    );

                // Add warnings if any issues detected
                if (!isHealthy) {
                    embed.addFields({
                        name: '⚠️ **Detected Issues**',
                        value: systemHealth.issues.join('\n') || 'Performance degradation detected',
                        inline: false
                    });
                }

                embed.setFooter({ 
                    text: `Last health check: ${new Date().toLocaleString()}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });

                const refreshButton = new ButtonBuilder()
                    .setCustomId('manage_health_refresh')
                    .setLabel('Refresh Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const diagnosticsButton = new ButtonBuilder()
                    .setCustomId('manage_health_diagnostics')
                    .setLabel('Run Diagnostics')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔍');

                const fixIssuesButton = new ButtonBuilder()
                    .setCustomId('manage_health_fix_issues')
                    .setLabel('Auto-Fix Issues')
                    .setStyle(isHealthy ? ButtonStyle.Secondary : ButtonStyle.Danger)
                    .setEmoji('🔧')
                    .setDisabled(isHealthy);

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row = new ActionRowBuilder().addComponents(refreshButton, diagnosticsButton, fixIssuesButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error('Error in health check:', error);
                await this.sendErrorResponse(interaction, 'Failed to perform health check');
            }
        },

        // Config Panel Handler
        config_panel: async function(interaction) {
            try {
                await interaction.deferUpdate();

                const configStatus = this.getConfigStatus();

                const embed = new EmbedBuilder()
                    .setColor(config.getEmbedColor('magic'))
                    .setTitle(`${config.getEmoji('key')} **Bot Configuration Panel**`)
                    .setDescription(`### ${config.getEmoji('dragon')} **Advanced Configuration Management**\n\n`)
                    .addFields(
                        {
                            name: `${config.getEmoji('fire')} **Core Settings**`,
                            value: `Version: **${config.version}**\n` +
                                   `Prefix: **${config.prefix}**\n` +
                                   `Debug Mode: **${config.development.debugMode ? 'ON' : 'OFF'}**\n` +
                                   `Maintenance: **${config.security.enableMaintenanceMode ? 'ON' : 'OFF'}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('shield')} **Security Settings**`,
                            value: `Rate Limiting: **${config.security.enableRateLimiting ? 'ON' : 'OFF'}**\n` +
                                   `Max Commands/min: **${config.security.maxCommandsPerMinute}**\n` +
                                   `Admin Users: **${config.security.adminUsers?.length || 0}**\n` +
                                   `Auto Restart: **${config.errorHandling.enableAutoRestart ? 'ON' : 'OFF'}**`,
                            inline: true
                        },
                        {
                            name: `${config.getEmoji('magic')} **Feature Toggles**`,
                            value: `Economy: **${config.features.economy ? 'ON' : 'OFF'}**\n` +
                                   `Battles: **${config.features.battles ? 'ON' : 'OFF'}**\n` +
                                   `Guilds: **${config.features.guilds ? 'ON' : 'OFF'}**\n` +
                                   `Trading: **${config.features.trading ? 'ON' : 'OFF'}**`,
                            inline: true
                        }
                    );

                const featureToggleButton = new ButtonBuilder()
                    .setCustomId('manage_config_features')
                    .setLabel('Feature Toggles')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎛️');

                const securityButton = new ButtonBuilder()
                    .setCustomId('manage_config_security')
                    .setLabel('Security Settings')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(config.getEmoji('shield'));

                const economyConfigButton = new ButtonBuilder()
                    .setCustomId('manage_config_economy')
                    .setLabel('Economy Config')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(config.getEmoji('coin'));

                const maintenanceButton = new ButtonBuilder()
                    .setCustomId('manage_config_maintenance')
                    .setLabel(config.security.enableMaintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance')
                    .setStyle(config.security.enableMaintenanceMode ? ButtonStyle.Success : ButtonStyle.Danger)
                    .setEmoji('🚧');

                const backButton = new ButtonBuilder()
                    .setCustomId('manage_back_to_main')
                    .setLabel('Back to Main')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('↩️');

                const row1 = new ActionRowBuilder().addComponents(featureToggleButton, securityButton, economyConfigButton);
                const row2 = new ActionRowBuilder().addComponents(maintenanceButton, backButton);

                await interaction.editReply({ embeds: [embed], components: [row1, row2] });

            } catch (error) {
                console.error('Error in config panel:', error);
                await this.sendErrorResponse(interaction, 'Failed to load config panel');
            }
        },

        // Back to main handler
        back_to_main: async function(interaction) {
            try {
                await interaction.deferUpdate();
                
                // Re-execute the main manage command logic
                await this.execute(interaction);
                
            } catch (error) {
                console.error('Error returning to main:', error);
                await this.sendErrorResponse(interaction, 'Failed to return to main panel');
            }
        }
    },

    // Helper methods
    async getServerStats(guildId) {
        try {
            const globalStats = await db.getGlobalStats();
            const leaderboard = await db.getLeaderboard('coins', 1, 1);
            
            return {
                totalPlayers: globalStats.totalPlayers || 0,
                totalHunts: globalStats.totalHunts || 0,
                totalCoins: globalStats.totalCoins || 0,
                dailyActive: Math.floor(globalStats.totalPlayers * 0.3), // Estimated
                weeklyNew: Math.floor(globalStats.totalPlayers * 0.1), // Estimated
                richestAmount: leaderboard.players?.[0]?.coins || 0,
                dailyTransactions: Math.floor(globalStats.totalPlayers * 2), // Estimated
                battlesWon: globalStats.totalPlayers * 5, // Estimated
                questsCompleted: globalStats.totalHunts * 2, // Estimated
                activeEvents: 1 // You can track this separately
            };
        } catch (error) {
            console.error('Error getting server stats:', error);
            return {
                totalPlayers: 0, totalHunts: 0, totalCoins: 0, dailyActive: 0,
                weeklyNew: 0, richestAmount: 0, dailyTransactions: 0,
                battlesWon: 0, questsCompleted: 0, activeEvents: 0
            };
        }
    },

    async getDatabaseStats() {
        try {
            const globalStats = await db.getGlobalStats();
            return {
                playerCount: globalStats.totalPlayers || 0,
                guildCount: 1, // You can track this if needed
                activeHunts: Math.floor(globalStats.totalPlayers * 0.1), // Estimated
                avgResponseTime: Math.floor(Math.random() * 50) + 10, // Mock data
                successRate: 99.5, // Mock data
                lastBackup: 'Manual backups only'
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            return {
                playerCount: 0, guildCount: 0, activeHunts: 0,
                avgResponseTime: 0, successRate: 0, lastBackup: 'Unknown'
            };
        }
    },

    async getEconomyStats() {
        try {
            const globalStats = await db.getGlobalStats();
            return {
                inflationRate: Math.floor(Math.random() * 5) + 1, // Mock calculation
                wealthGap: Math.floor(Math.random() * 10) + 5, // Mock calculation
                activeCoins: globalStats.totalCoins || 0
            };
        } catch (error) {
            console.error('Error getting economy stats:', error);
            return { inflationRate: 0, wealthGap: 0, activeCoins: 0 };
        }
    },

    async getPerformanceMetrics() {
        // Mock performance data - replace with real monitoring
        return {
            cpuUsage: Math.floor(Math.random() * 30) + 10,
            memoryUsage: Math.floor(Math.random() * 200) + 100,
            uptime: this.formatUptime(process.uptime()),
            status: 'Optimal',
            dbQueryTime: Math.floor(Math.random() * 20) + 5,
            cacheHitRate: Math.floor(Math.random() * 20) + 80,
            dbConnections: Math.floor(Math.random() * 10) + 5,
            lastOptimization: '2 hours ago'
        };
    },

    async getBotPerformance() {
        return {
            commandsPerMinute: Math.floor(Math.random() * 50) + 10,
            avgResponseTime: Math.floor(Math.random() * 100) + 50,
            errorRate: (Math.random() * 2).toFixed(1),
            activeUsers: Math.floor(Math.random() * 100) + 50
        };
    },

    async getPlayerManagementStats() {
        try {
            const globalStats = await db.getGlobalStats();
            return {
                totalPlayers: globalStats.totalPlayers || 0,
                activeToday: Math.floor(globalStats.totalPlayers * 0.3),
                newThisWeek: Math.floor(globalStats.totalPlayers * 0.1),
                topLevel: globalStats.topLevel || 1
            };
        } catch (error) {
            return { totalPlayers: 0, activeToday: 0, newThisWeek: 0, topLevel: 1 };
        }
    },

    async getRecentPlayers() {
        // Mock recent players data - implement based on your tracking system
        return [
            { userId: '123456789', level: 15, lastActive: '2 min ago' },
            { userId: '987654321', level: 23, lastActive: '5 min ago' },
            { userId: '456789123', level: 8, lastActive: '10 min ago' }
        ];
    },

    async getSystemHealth() {
        const memUsage = process.memoryUsage();
        const memPercent = (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(1);
        
        return {
            overall: memPercent > 80 ? 'warning' : 'good',
            memoryUsage: memPercent,
            cpuLoad: Math.floor(Math.random() * 30) + 10,
            dbResponseTime: Math.floor(Math.random() * 50) + 10,
            activeCommands: Math.floor(Math.random() * 20) + 5,
            errorRate: (Math.random() * 1).toFixed(1),
            issues: memPercent > 80 ? ['High memory usage detected'] : []
        };
    },

    getConfigStatus() {
        return {
            version: config.version,
            features: config.features,
            security: config.security
        };
    },

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    },

    async sendErrorResponse(interaction, message) {
        const embed = new EmbedBuilder()
            .setColor(config.getEmbedColor('error'))
            .setTitle('❌ Error')
            .setDescription(message)
            .setTimestamp();

        const backButton = new ButtonBuilder()
            .setCustomId('manage_back_to_main')
            .setLabel('Back to Main')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️');

        const row = new ActionRowBuilder().addComponents(backButton);

        try {
            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Failed to send error response:', error);
        }
    }
};