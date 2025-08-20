const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('🎰 Try your luck at the treasure slot machine'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getUser(userId) || {
            inventory: { coins: 100 }
        };

        const slotSymbols = ['💎', '🏆', '⭐', '💰', '🍀', '🎯', '⚔️', '🔮'];
        const betAmounts = [10, 25, 50, 100];

        const embed = new EmbedBuilder()
            .setColor('#FF1493')
            .setTitle('🎰 Treasure Slot Machine')
            .setDescription('**"Spin the reels of fortune!"**\n\nMatch symbols to win amazing prizes!')
            .addFields(
                { name: '💰 Your Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '🎰 Possible Symbols', value: slotSymbols.join(' '), inline: true },
                { name: '🏆 Jackpot', value: '5,000 coins', inline: true }
            )
            .addFields(
                { name: '💎 Payout Table', value: '💎💎💎 = 1000x\n🏆🏆🏆 = 500x\n⭐⭐⭐ = 250x\n💰💰💰 = 100x\nAny 3 = 10x', inline: false }
            );

        const betButtons = betAmounts.map(amount => 
            new ButtonBuilder()
                .setCustomId(`slots_bet_${amount}`)
                .setLabel(`Bet ${amount} coins`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎰')
                .setDisabled((userProfile.inventory?.coins || 0) < amount)
        );

        const maxBetButton = new ButtonBuilder()
            .setCustomId('slots_max_bet')
            .setLabel('Max Bet')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🚀');

        const historyButton = new ButtonBuilder()
            .setCustomId('slots_history')
            .setLabel('Spin History')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊');

        const row1 = new ActionRowBuilder().addComponents(betButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(betButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(maxBetButton, historyButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};