const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calendar')
        .setDescription('📅 View upcoming events and treasure hunt schedules'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const now = new Date();
        
        const upcomingEvents = [
            {
                name: 'Double XP Weekend',
                date: 'This Saturday-Sunday',
                description: 'Earn 2x experience from all activities!',
                emoji: '⚡'
            },
            {
                name: 'Rare Treasure Event',
                date: 'Next Monday',
                description: '+50% chance to find rare items',
                emoji: '💎'
            },
            {
                name: 'Guild Tournament',
                date: 'Next Friday',
                description: 'Compete with your guild for glory!',
                emoji: '🏆'
            },
            {
                name: 'Mystery Merchant Visit',
                date: 'Random times',
                description: 'Special merchant with unique items',
                emoji: '🛒'
            }
        ];

        const dailyActivities = [
            { time: '00:00', activity: 'Daily rewards reset' },
            { time: '06:00', activity: 'Fishing spots refresh' },
            { time: '12:00', activity: 'Merchant inventory update' },
            { time: '18:00', activity: 'Arena tournaments begin' },
            { time: '22:00', activity: 'Special treasure spawns' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#9370DB')
            .setTitle('📅 Treasure Hunter\'s Calendar')
            .setDescription('**Stay informed about events and activities!**\n\nPlan your adventures around special events.')
            .addFields(
                { name: '📅 Current Date', value: now.toDateString(), inline: true },
                { name: '🕐 Server Time', value: now.toTimeString().split(' ')[0], inline: true },
                { name: '🌍 Time Zone', value: 'UTC', inline: true }
            );

        embed.addFields({
            name: '🎉 Upcoming Events',
            value: upcomingEvents.map(event => 
                `${event.emoji} **${event.name}**\n📅 ${event.date}\n${event.description}`
            ).join('\n\n'),
            inline: false
        });

        embed.addFields({
            name: '⏰ Daily Schedule',
            value: dailyActivities.map(activity => 
                `**${activity.time}** - ${activity.activity}`
            ).join('\n'),
            inline: false
        });

        const reminderButton = new ButtonBuilder()
            .setCustomId('calendar_reminder')
            .setLabel('Set Reminder')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⏰');

        const scheduleButton = new ButtonBuilder()
            .setCustomId('calendar_schedule')
            .setLabel('My Schedule')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📋');

        const notifyButton = new ButtonBuilder()
            .setCustomId('calendar_notify')
            .setLabel('Event Notifications')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🔔');

        const row = new ActionRowBuilder().addComponents(reminderButton, scheduleButton, notifyButton);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};