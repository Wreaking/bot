const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tips')
        .setDescription('💡 Get helpful tips for treasure hunting success'),
    
    async execute(interaction) {
        const treasureHuntingTips = [
            {
                category: 'Beginner Tips',
                emoji: '🌱',
                tips: [
                    'Start with easy locations like Village Pond and Peaceful Meadow',
                    'Use /daily command every day for free coins and items',
                    'Save your coins to buy better equipment early on',
                    'Join a guild to get bonuses and help from other players'
                ]
            },
            {
                category: 'Combat Strategies',
                emoji: '⚔️',
                tips: [
                    'Train your skills regularly to unlock new abilities',
                    'Carry healing potions before entering dangerous areas',
                    'Study enemy patterns in the arena before big battles',
                    'Upgrade your weapons and armor at the blacksmith'
                ]
            },
            {
                category: 'Economy Mastery',
                emoji: '💰',
                tips: [
                    'Sell common items to buy rare materials',
                    'Invest in the bank for passive income growth',
                    'Check the auction house for good deals on equipment',
                    'Complete daily quests for guaranteed rewards'
                ]
            },
            {
                category: 'Advanced Techniques',
                emoji: '🎯',
                tips: [
                    'Time your fishing and mining when weather conditions are favorable',
                    'Use the map to plan efficient exploration routes',
                    'Participate in tournaments for exclusive rewards',
                    'Combine different skills for powerful synergy effects'
                ]
            }
        ];

        const randomTip = treasureHuntingTips[Math.floor(Math.random() * treasureHuntingTips.length)];
        const dailyTip = randomTip.tips[Math.floor(Math.random() * randomTip.tips.length)];

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('💡 Treasure Hunter\'s Guide')
            .setDescription('**Master the art of treasure hunting!**\n\nLearn from experienced adventurers.')
            .addFields(
                { name: '🎯 Tip of the Day', value: `*"${dailyTip}"*`, inline: false }
            );

        treasureHuntingTips.forEach(category => {
            embed.addFields({
                name: `${category.emoji} ${category.category}`,
                value: category.tips.map(tip => `• ${tip}`).join('\n'),
                inline: false
            });
        });

        const beginnerButton = new ButtonBuilder()
            .setCustomId('tips_beginner')
            .setLabel('Beginner Guide')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🌱');

        const advancedButton = new ButtonBuilder()
            .setCustomId('tips_advanced')
            .setLabel('Advanced Strategies')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎯');

        const videoButton = new ButtonBuilder()
            .setCustomId('tips_tutorials')
            .setLabel('Video Tutorials')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📺');

        const faqButton = new ButtonBuilder()
            .setCustomId('tips_faq')
            .setLabel('FAQ')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❓');

        const row1 = new ActionRowBuilder().addComponents(beginnerButton, advancedButton);
        const row2 = new ActionRowBuilder().addComponents(videoButton, faqButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
};