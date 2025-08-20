
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('⚙️ Customize your bot experience and preferences!')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Choose settings category')
                .setRequired(false)
                .addChoices(
                    { name: '🔔 Notifications', value: 'notifications' },
                    { name: '🎨 Display & Theme', value: 'display' },
                    { name: '🎮 Gameplay', value: 'gameplay' },
                    { name: '🔒 Privacy & Security', value: 'privacy' },
                    { name: '📊 Statistics', value: 'statistics' }
                )),
    
    async execute(interaction) {
        const category = interaction.options?.getString('category');
        
        if (category) {
            await this.showCategorySettings(interaction, category);
        } else {
            await this.showMainSettings(interaction);
        }
    },
    
    async showMainSettings(interaction) {
        const userId = interaction.user.id;
        
        try {
            const userData = await db.getPlayer(userId);
            const settings = userData?.settings || this.getDefaultSettings();
            
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.info || '#3498DB')
                .setTitle('⚙️ Bot Settings & Preferences')
                .setDescription('**Customize your adventure experience!**\nAdjust notifications, display options, and gameplay preferences.')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields([
                    {
                        name: '🔔 Notifications',
                        value: `Daily Reminders: **${settings.notifications.dailyReminder ? '✅ ON' : '❌ OFF'}**\nDM Notifications: **${settings.notifications.dmNotifications ? '✅ ON' : '❌ OFF'}**\nHunt Reminders: **${settings.notifications.huntReminder ? '✅ ON' : '❌ OFF'}**`,
                        inline: true
                    },
                    {
                        name: '🎨 Display & Theme',
                        value: `Theme: **${settings.display.theme}**\nEmbed Colors: **${settings.display.embedColors ? '✅ ON' : '❌ OFF'}**\nDetailed Stats: **${settings.display.detailedStats ? '✅ ON' : '❌ OFF'}**`,
                        inline: true
                    },
                    {
                        name: '🎮 Gameplay',
                        value: `Auto-Claim: **${settings.gameplay.autoClaim ? '✅ ON' : '❌ OFF'}**\nQuick Actions: **${settings.gameplay.quickActions ? '✅ ON' : '❌ OFF'}**\nTutorial: **${settings.gameplay.showTutorial ? '✅ ON' : '❌ OFF'}**`,
                        inline: true
                    },
                    {
                        name: '🔒 Privacy & Security',
                        value: `Profile Visibility: **${settings.privacy.profileVisibility}**\nActivity Tracking: **${settings.privacy.activityTracking ? '✅ ON' : '❌ OFF'}**\nData Sharing: **${settings.privacy.dataSharing ? '✅ ON' : '❌ OFF'}**`,
                        inline: true
                    },
                    {
                        name: '📊 Statistics Tracking',
                        value: `Detailed Logs: **${settings.statistics.detailedLogs ? '✅ ON' : '❌ OFF'}**\nPerformance Metrics: **${settings.statistics.performanceMetrics ? '✅ ON' : '❌ OFF'}**\nProgress History: **${settings.statistics.progressHistory ? '✅ ON' : '❌ OFF'}**`,
                        inline: true
                    },
                    {
                        name: '🌐 Language & Region',
                        value: `Language: **${settings.language || 'English'}**\nTimezone: **${settings.timezone || 'UTC'}**\nDate Format: **${settings.dateFormat || 'MM/DD/YYYY'}**`,
                        inline: true
                    }
                ])
                .setFooter({ text: `⚡ Quick tip: Use the dropdown to access specific categories!` })
                .setTimestamp();
                
            const categorySelect = new StringSelectMenuBuilder()
                .setCustomId('settings_category_select')
                .setPlaceholder('⚙️ Select a settings category...')
                .addOptions([
                    {
                        label: 'Notifications',
                        description: 'Manage alerts and reminders',
                        value: 'notifications',
                        emoji: '🔔'
                    },
                    {
                        label: 'Display & Theme',
                        description: 'Customize appearance and colors',
                        value: 'display',
                        emoji: '🎨'
                    },
                    {
                        label: 'Gameplay Options',
                        description: 'Adjust game behavior and features',
                        value: 'gameplay',
                        emoji: '🎮'
                    },
                    {
                        label: 'Privacy & Security',
                        description: 'Control data and visibility',
                        value: 'privacy',
                        emoji: '🔒'
                    },
                    {
                        label: 'Statistics Tracking',
                        description: 'Manage data collection preferences',
                        value: 'statistics',
                        emoji: '📊'
                    }
                ]);
                
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_reset')
                        .setLabel('🔄 Reset to Default')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('settings_export')
                        .setLabel('📤 Export Settings')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('settings_import')
                        .setLabel('📥 Import Settings')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('settings_help')
                        .setLabel('❓ Help')
                        .setStyle(ButtonStyle.Success)
                );
                
            const components = [
                new ActionRowBuilder().addComponents(categorySelect),
                buttons
            ];
            
            await interaction.reply({ embeds: [embed], components });
            
        } catch (error) {
            console.error('Settings error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading settings. Please try again.',
                ephemeral: true
            });
        }
    },
    
    async showCategorySettings(interaction, category) {
        const userId = interaction.user.id;
        
        try {
            const userData = await db.getPlayer(userId);
            const settings = userData?.settings || this.getDefaultSettings();
            const categoryData = this.getCategoryData(category, settings);
            
            const embed = new EmbedBuilder()
                .setColor(categoryData.color)
                .setTitle(`${categoryData.emoji} ${categoryData.name}`)
                .setDescription(categoryData.description)
                .setThumbnail(interaction.user.displayAvatarURL());
                
            categoryData.settings.forEach(setting => {
                const currentValue = this.getSettingValue(settings, setting.path);
                const status = this.formatSettingValue(currentValue, setting.type);
                
                embed.addFields([{
                    name: `${setting.emoji} ${setting.name}`,
                    value: `📝 ${setting.description}\n🎯 Current: **${status}**\n💡 ${setting.hint || 'No additional info'}`,
                    inline: true
                }]);
            });
            
            const toggleButtons = this.createToggleButtons(category, categoryData.settings);
            const navButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_main')
                        .setLabel('← Back to Settings')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`settings_save_${category}`)
                        .setLabel('💾 Save Changes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`settings_advanced_${category}`)
                        .setLabel('⚙️ Advanced')
                        .setStyle(ButtonStyle.Primary)
                );
                
            const components = toggleButtons ? [toggleButtons, navButtons] : [navButtons];
            
            await interaction.reply({ embeds: [embed], components });
            
        } catch (error) {
            console.error('Category settings error:', error);
            await interaction.reply({
                content: '❌ An error occurred while loading category settings.',
                ephemeral: true
            });
        }
    },
    
    createToggleButtons(category, settings) {
        const buttons = settings.slice(0, 4).map((setting, index) => {
            return new ButtonBuilder()
                .setCustomId(`toggle_${category}_${index}`)
                .setLabel(`${setting.emoji} Toggle ${setting.name}`)
                .setStyle(ButtonStyle.Primary);
        });
        
        if (buttons.length > 0) {
            return new ActionRowBuilder().addComponents(buttons);
        }
        return null;
    },
    
    getCategoryData(category, settings) {
        const categories = {
            notifications: {
                name: 'Notification Settings',
                emoji: '🔔',
                color: 0x3498DB,
                description: '**Manage your notification preferences**\nControl when and how the bot sends you alerts and reminders.',
                settings: [
                    {
                        name: 'Daily Reminders',
                        emoji: '📅',
                        path: 'notifications.dailyReminder',
                        type: 'boolean',
                        description: 'Get reminded to claim your daily rewards',
                        hint: 'Sends a DM reminder if you haven\'t claimed daily rewards'
                    },
                    {
                        name: 'DM Notifications',
                        emoji: '📬',
                        path: 'notifications.dmNotifications',
                        type: 'boolean',
                        description: 'Receive important notifications via direct message',
                        hint: 'Level ups, achievements, and special events'
                    },
                    {
                        name: 'Hunt Reminders',
                        emoji: '🗺️',
                        path: 'notifications.huntReminder',
                        type: 'boolean',
                        description: 'Get notified when hunt cooldowns expire',
                        hint: 'Helps you maximize your treasure hunting efficiency'
                    },
                    {
                        name: 'Guild Notifications',
                        emoji: '🏛️',
                        path: 'notifications.guildNotifications',
                        type: 'boolean',
                        description: 'Receive updates about your guild activities',
                        hint: 'Guild events, member joins, and important announcements'
                    }
                ]
            },
            display: {
                name: 'Display & Theme Settings',
                emoji: '🎨',
                color: 0xE91E63,
                description: '**Customize the visual experience**\nAdjust colors, themes, and information display preferences.',
                settings: [
                    {
                        name: 'Color Theme',
                        emoji: '🌈',
                        path: 'display.theme',
                        type: 'string',
                        description: 'Choose your preferred color scheme',
                        hint: 'Options: Classic, Dark, Colorful, Minimal'
                    },
                    {
                        name: 'Embed Colors',
                        emoji: '🎨',
                        path: 'display.embedColors',
                        type: 'boolean',
                        description: 'Enable colorful embed borders and accents',
                        hint: 'Makes bot responses more visually appealing'
                    },
                    {
                        name: 'Detailed Statistics',
                        emoji: '📊',
                        path: 'display.detailedStats',
                        type: 'boolean',
                        description: 'Show extended statistics in command responses',
                        hint: 'More numbers and progress bars in outputs'
                    },
                    {
                        name: 'Compact Mode',
                        emoji: '📱',
                        path: 'display.compactMode',
                        type: 'boolean',
                        description: 'Use shorter, more compact message formats',
                        hint: 'Better for mobile users and busy channels'
                    }
                ]
            },
            gameplay: {
                name: 'Gameplay Settings',
                emoji: '🎮',
                color: 0x9B59B6,
                description: '**Adjust gameplay behavior**\nCustomize how the bot handles automatic actions and game features.',
                settings: [
                    {
                        name: 'Auto-Claim Rewards',
                        emoji: '🎁',
                        path: 'gameplay.autoClaim',
                        type: 'boolean',
                        description: 'Automatically claim available rewards',
                        hint: 'Daily rewards, achievement rewards, etc.'
                    },
                    {
                        name: 'Quick Actions',
                        emoji: '⚡',
                        path: 'gameplay.quickActions',
                        type: 'boolean',
                        description: 'Enable one-click action buttons',
                        hint: 'Faster gameplay with convenient buttons'
                    },
                    {
                        name: 'Tutorial Messages',
                        emoji: '📖',
                        path: 'gameplay.showTutorial',
                        type: 'boolean',
                        description: 'Show helpful tips and tutorials',
                        hint: 'Disable if you\'re experienced with the bot'
                    },
                    {
                        name: 'Confirmation Prompts',
                        emoji: '❓',
                        path: 'gameplay.confirmActions',
                        type: 'boolean',
                        description: 'Ask for confirmation on important actions',
                        hint: 'Prevents accidental expensive purchases'
                    }
                ]
            },
            privacy: {
                name: 'Privacy & Security',
                emoji: '🔒',
                color: 0x2ECC71,
                description: '**Control your data and privacy**\nManage what information is visible and how your data is used.',
                settings: [
                    {
                        name: 'Profile Visibility',
                        emoji: '👁️',
                        path: 'privacy.profileVisibility',
                        type: 'select',
                        description: 'Who can view your profile and statistics',
                        hint: 'Options: Public, Friends Only, Private'
                    },
                    {
                        name: 'Activity Tracking',
                        emoji: '📈',
                        path: 'privacy.activityTracking',
                        type: 'boolean',
                        description: 'Allow the bot to track your activity patterns',
                        hint: 'Used for personalized recommendations'
                    },
                    {
                        name: 'Data Sharing',
                        emoji: '🔄',
                        path: 'privacy.dataSharing',
                        type: 'boolean',
                        description: 'Share anonymized data for bot improvements',
                        hint: 'Helps developers improve the game'
                    },
                    {
                        name: 'Leaderboard Participation',
                        emoji: '🏆',
                        path: 'privacy.leaderboards',
                        type: 'boolean',
                        description: 'Appear on public leaderboards',
                        hint: 'Your username will be visible in rankings'
                    }
                ]
            },
            statistics: {
                name: 'Statistics & Data',
                emoji: '📊',
                color: 0xF39C12,
                description: '**Manage data collection preferences**\nControl what statistics are tracked and stored.',
                settings: [
                    {
                        name: 'Detailed Logging',
                        emoji: '📝',
                        path: 'statistics.detailedLogs',
                        type: 'boolean',
                        description: 'Keep detailed logs of all your activities',
                        hint: 'Enables advanced statistics and history tracking'
                    },
                    {
                        name: 'Performance Metrics',
                        emoji: '⚡',
                        path: 'statistics.performanceMetrics',
                        type: 'boolean',
                        description: 'Track performance and efficiency metrics',
                        hint: 'Success rates, average times, optimization tips'
                    },
                    {
                        name: 'Progress History',
                        emoji: '📈',
                        path: 'statistics.progressHistory',
                        type: 'boolean',
                        description: 'Maintain a history of your progress over time',
                        hint: 'Charts and graphs of your advancement'
                    },
                    {
                        name: 'Export Data',
                        emoji: '📤',
                        path: 'statistics.exportEnabled',
                        type: 'boolean',
                        description: 'Allow exporting your personal data',
                        hint: 'Download your statistics and game data'
                    }
                ]
            }
        };
        
        return categories[category] || categories.notifications;
    },
    
    getDefaultSettings() {
        return {
            notifications: {
                dailyReminder: true,
                dmNotifications: true,
                huntReminder: true,
                guildNotifications: true
            },
            display: {
                theme: 'Classic',
                embedColors: true,
                detailedStats: true,
                compactMode: false
            },
            gameplay: {
                autoClaim: false,
                quickActions: true,
                showTutorial: true,
                confirmActions: true
            },
            privacy: {
                profileVisibility: 'Public',
                activityTracking: true,
                dataSharing: true,
                leaderboards: true
            },
            statistics: {
                detailedLogs: true,
                performanceMetrics: true,
                progressHistory: true,
                exportEnabled: true
            },
            language: 'English',
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY'
        };
    },
    
    getSettingValue(settings, path) {
        const keys = path.split('.');
        let value = settings;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return this.getDefaultSettingValue(path);
            }
        }
        
        return value;
    },
    
    getDefaultSettingValue(path) {
        const defaults = this.getDefaultSettings();
        const keys = path.split('.');
        let value = defaults;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    },
    
    formatSettingValue(value, type) {
        switch (type) {
            case 'boolean':
                return value ? '✅ ON' : '❌ OFF';
            case 'string':
                return value || 'Not Set';
            case 'select':
                return value || 'Default';
            default:
                return String(value);
        }
    }
};
