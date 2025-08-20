const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lottery')
        .setDescription('🎰 Try your luck in the treasure lottery'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getUser(userId) || {
            inventory: { coins: 100 },
            stats: { level: 1 },
            lottery: { tickets: 0, wins: 0 }
        };

        const lotteryOptions = [
            { name: 'Bronze Ticket', cost: 50, jackpot: 500, odds: '1:10' },
            { name: 'Silver Ticket', cost: 100, jackpot: 1500, odds: '1:20' },
            { name: 'Gold Ticket', cost: 250, jackpot: 5000, odds: '1:50' },
            { name: 'Platinum Ticket', cost: 500, jackpot: 15000, odds: '1:100' }
        ];

        const currentJackpot = 25000;
        const nextDraw = '6 hours';

        const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('🎰 Mystical Treasure Lottery')
            .setDescription('**"Fortune favors the bold!"**\n\nBuy tickets and win incredible prizes!')
            .addFields(
                { name: '💰 Your Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '🎫 Your Tickets', value: `${userProfile.lottery?.tickets || 0}`, inline: true },
                { name: '🏆 Lottery Wins', value: `${userProfile.lottery?.wins || 0}`, inline: true },
                { name: '💎 Current Jackpot', value: `${currentJackpot} coins`, inline: true },
                { name: '⏰ Next Draw', value: nextDraw, inline: true },
                { name: '🎲 Total Players', value: '127 active', inline: true }
            );

        lotteryOptions.forEach(option => {
            embed.addFields({
                name: `🎫 ${option.name}`,
                value: `**Cost:** ${option.cost} coins\n**Max Prize:** ${option.jackpot} coins\n**Odds:** ${option.odds}`,
                inline: true
            });
        });

        const buttons = lotteryOptions.map((option, index) => 
            new ButtonBuilder()
                .setCustomId(`lottery_buy_${index}`)
                .setLabel(`Buy ${option.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );

        const instantButton = new ButtonBuilder()
            .setCustomId('lottery_instant')
            .setLabel('Instant Win Scratch Card')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🃏');

        const historyButton = new ButtonBuilder()
            .setCustomId('lottery_history')
            .setLabel('Past Winners')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📈');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(instantButton, historyButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};