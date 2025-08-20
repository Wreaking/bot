
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calendar')
        .setDescription('📅 View upcoming events and treasure hunt schedules')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the calendar with all events')
                .addStringOption(option =>
                    option.setName('period')
                        .setDescription('Time period to view')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Today', value: 'today' },
                            { name: 'This Week', value: 'week' },
                            { name: 'This Month', value: 'month' },
                            { name: 'All Upcoming', value: 'all' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remind')
                .setDescription('Set a reminder for an event')
                .addStringOption(option =>
                    option.setName('event')
                        .setDescription('Event to be reminded about')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('minutes')
                        .setDescription('Minutes before event to remind')
                        .setRequired(false)
                        .setMinValue(5)
                        .setMaxValue(1440)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule')
                .setDescription('View your personal schedule')
                .addBooleanOption(option =>
                    option.setName('detailed')
                        .setDescription('Show detailed schedule information')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('events')
                .setDescription('Manage event notifications')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Subscribe to All', value: 'subscribe_all' },
                            { name: 'Unsubscribe All', value: 'unsubscribe_all' },
                            { name: 'Custom Settings', value: 'custom' }
                        ))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        
        try {
            switch (subcommand) {
                case 'view':
                    await this.handleView(interaction, userId);
                    break;
                case 'remind':
                    await this.handleRemind(interaction, userId);
                    break;
                case 'schedule':
                    await this.handleSchedule(interaction, userId);
                    break;
                case 'events':
                    await this.handleEvents(interaction, userId);
                    break;
                default:
                    await this.handleView(interaction, userId);
            }
        } catch (error) {
            console.error('Calendar command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the calendar command.',
                ephemeral: true
            });
        }
    },

    async handleView(interaction, userId) {
        const period = interaction.options?.getString('period') || 'week';
        const now = new Date();
        const userProfile = await db.getUser(userId) || { reminders: [], preferences: {} };

        const upcomingEvents = this.getEventsForPeriod(period, now);
        const dailyActivities = this.getDailyActivities();

        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle(`📅 Treasure Hunter's Calendar - ${this.getPeriodName(period)}`)
            .setDescription('**Stay informed about events and activities!**\n\nPlan your adventures around special events.')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '📅 Current Date', value: now.toDateString(), inline: true },
                { name: '🕐 Server Time', value: now.toTimeString().split(' ')[0], inline: true },
                { name: '🌍 Time Zone', value: 'UTC', inline: true }
            );

        if (upcomingEvents.length > 0) {
            embed.addFields({
                name: '🎉 Upcoming Events',
                value: upcomingEvents.map(event => 
                    `${event.emoji} **${event.name}**\n📅 ${event.date}\n${event.description}\n${event.rewards ? `🎁 ${event.rewards}` : ''}`
                ).join('\n\n'),
                inline: false
            });
        }

        embed.addFields({
            name: '⏰ Daily Schedule',
            value: dailyActivities.map(activity => 
                `**${activity.time}** - ${activity.activity} ${activity.bonus ? `(${activity.bonus})` : ''}`
            ).join('\n'),
            inline: false
        });

        // Add user-specific reminders
        if (userProfile.reminders && userProfile.reminders.length > 0) {
            embed.addFields({
                name: '🔔 Your Reminders',
                value: userProfile.reminders.slice(0, 3).map(reminder => 
                    `• ${reminder.event} - ${reminder.time}`
                ).join('\n'),
                inline: false
            });
        }

        const periodSelect = new StringSelectMenuBuilder()
            .setCustomId('calendar_period')
            .setPlaceholder('📅 Select time period...')
            .addOptions([
                { label: 'Today', value: 'today', emoji: '📍' },
                { label: 'This Week', value: 'week', emoji: '📅' },
                { label: 'This Month', value: 'month', emoji: '🗓️' },
                { label: 'All Upcoming', value: 'all', emoji: '🔮' }
            ]);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('calendar_reminder')
                    .setLabel('Set Reminder')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⏰'),
                new ButtonBuilder()
                    .setCustomId('calendar_schedule')
                    .setLabel('My Schedule')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('calendar_notify')
                    .setLabel('Event Notifications')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔔'),
                new ButtonBuilder()
                    .setCustomId('calendar_export')
                    .setLabel('Export Calendar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📤')
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [
                new ActionRowBuilder().addComponents(periodSelect),
                actionButtons
            ]
        });
    },

    async handleRemind(interaction, userId) {
        const eventName = interaction.options.getString('event');
        const minutes = interaction.options.getInteger('minutes') || 30;
        
        const userProfile = await db.getUser(userId) || { reminders: [] };
        
        const reminder = {
            id: Date.now(),
            event: eventName,
            time: new Date(Date.now() + minutes * 60000).toLocaleString(),
            minutes: minutes,
            created: new Date().toISOString()
        };

        userProfile.reminders = userProfile.reminders || [];
        userProfile.reminders.push(reminder);

        await db.updateUser(userId, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('⏰ Reminder Set Successfully!')
            .setDescription(`You'll be reminded about **${eventName}** in ${minutes} minutes.`)
            .addFields(
                { name: '📅 Event', value: eventName, inline: true },
                { name: '⏰ Reminder Time', value: reminder.time, inline: true },
                { name: '🔔 Status', value: 'Active', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleSchedule(interaction, userId) {
        const detailed = interaction.options.getBoolean('detailed') || false;
        const userProfile = await db.getUser(userId) || {};

        const personalSchedule = this.generatePersonalSchedule(userProfile, detailed);

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('📋 Your Personal Schedule')
            .setDescription('**Customized activity recommendations based on your progress**')
            .setThumbnail(interaction.user.displayAvatarURL());

        personalSchedule.forEach(section => {
            embed.addFields({
                name: section.title,
                value: section.content,
                inline: section.inline || false
            });
        });

        const manageButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('schedule_optimize')
                    .setLabel('Optimize Schedule')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('schedule_reminders')
                    .setLabel('Set Auto-Reminders')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('schedule_customize')
                    .setLabel('Customize')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚙️')
            );

        await interaction.reply({ embeds: [embed], components: [manageButtons] });
    },

    async handleEvents(interaction, userId) {
        const action = interaction.options.getString('action');
        const userProfile = await db.getUser(userId) || { eventSubscriptions: {} };

        let message = '';
        let color = '#3498DB';

        switch (action) {
            case 'subscribe_all':
                userProfile.eventSubscriptions = {
                    doubleXP: true,
                    treasureEvents: true,
                    tournaments: true,
                    merchantVisits: true,
                    seasonalEvents: true,
                    maintenance: true
                };
                message = 'You are now subscribed to all event notifications!';
                color = '#00FF00';
                break;
            case 'unsubscribe_all':
                userProfile.eventSubscriptions = {};
                message = 'You have unsubscribed from all event notifications.';
                color = '#FF6B6B';
                break;
            case 'custom':
                return await this.showCustomEventSettings(interaction, userProfile);
        }

        await db.updateUser(userId, userProfile);

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle('🔔 Event Notification Settings Updated')
            .setDescription(message)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async showCustomEventSettings(interaction, userProfile) {
        const eventTypes = [
            { id: 'doubleXP', name: 'Double XP Events', emoji: '⚡' },
            { id: 'treasureEvents', name: 'Treasure Events', emoji: '💎' },
            { id: 'tournaments', name: 'Tournaments', emoji: '🏆' },
            { id: 'merchantVisits', name: 'Merchant Visits', emoji: '🛒' },
            { id: 'seasonalEvents', name: 'Seasonal Events', emoji: '🎃' },
            { id: 'maintenance', name: 'Maintenance Alerts', emoji: '🔧' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🔔 Custom Event Notification Settings')
            .setDescription('Choose which events you want to be notified about:');

        eventTypes.forEach(event => {
            const isSubscribed = userProfile.eventSubscriptions?.[event.id] || false;
            embed.addFields({
                name: `${event.emoji} ${event.name}`,
                value: `Status: **${isSubscribed ? 'Subscribed' : 'Not Subscribed'}**`,
                inline: true
            });
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('event_toggle')
            .setPlaceholder('Select events to toggle...')
            .setMinValues(1)
            .setMaxValues(eventTypes.length)
            .addOptions(eventTypes.map(event => ({
                label: event.name,
                value: event.id,
                emoji: event.emoji,
                description: `Toggle ${event.name} notifications`
            })));

        await interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(selectMenu)],
            ephemeral: true
        });
    },

    getEventsForPeriod(period, now) {
        const allEvents = [
            {
                name: 'Double XP Weekend',
                date: 'This Saturday-Sunday',
                description: 'Earn 2x experience from all activities!',
                emoji: '⚡',
                rewards: '+100% XP',
                type: 'bonus'
            },
            {
                name: 'Rare Treasure Event',
                date: 'Next Monday',
                description: '+50% chance to find rare items',
                emoji: '💎',
                rewards: 'Rare Items',
                type: 'treasure'
            },
            {
                name: 'Guild Tournament',
                date: 'Next Friday',
                description: 'Compete with your guild for glory!',
                emoji: '🏆',
                rewards: 'Exclusive Titles',
                type: 'competition'
            },
            {
                name: 'Mystery Merchant Visit',
                date: 'Random times',
                description: 'Special merchant with unique items',
                emoji: '🛒',
                rewards: 'Unique Items',
                type: 'merchant'
            },
            {
                name: 'Halloween Special',
                date: 'October 31',
                description: 'Spooky treasures and costume rewards',
                emoji: '🎃',
                rewards: 'Costumes & Candy',
                type: 'seasonal'
            }
        ];

        // Filter events based on period
        return allEvents; // In a real implementation, filter by date
    },

    getDailyActivities() {
        return [
            { time: '00:00', activity: 'Daily rewards reset', bonus: '+50 coins' },
            { time: '06:00', activity: 'Fishing spots refresh', bonus: 'new fish' },
            { time: '12:00', activity: 'Merchant inventory update', bonus: 'rare items' },
            { time: '18:00', activity: 'Arena tournaments begin', bonus: 'double rewards' },
            { time: '22:00', activity: 'Special treasure spawns', bonus: 'legendary chance' }
        ];
    },

    generatePersonalSchedule(userProfile, detailed) {
        const level = userProfile.level || 1;
        const schedule = [];

        schedule.push({
            title: '🌅 Morning Routine (6:00 - 12:00)',
            content: detailed 
                ? `• Claim daily rewards (/daily)\n• Check fishing spots (/fish)\n• Complete guild tasks\n• Recommended: Mining in Crystal Caves`
                : `• Daily rewards\n• Fishing\n• Guild tasks`,
            inline: false
        });

        schedule.push({
            title: '☀️ Afternoon Activities (12:00 - 18:00)',
            content: detailed
                ? `• Merchant shopping (/shop)\n• Craft equipment (/craft)\n• Explore dungeons (/dungeon)\n• Recommended: Level ${level + 1} areas`
                : `• Shopping\n• Crafting\n• Exploration`,
            inline: false
        });

        schedule.push({
            title: '🌙 Evening Gaming (18:00 - 24:00)',
            content: detailed
                ? `• Arena battles (/arena)\n• Guild raids\n• Social activities (/tavern)\n• Recommended: PvP tournaments`
                : `• Arena battles\n• Guild activities\n• Social time`,
            inline: false
        });

        return schedule;
    },

    getPeriodName(period) {
        const names = {
            today: 'Today',
            week: 'This Week',
            month: 'This Month',
            all: 'All Upcoming Events'
        };
        return names[period] || 'This Week';
    }
};
