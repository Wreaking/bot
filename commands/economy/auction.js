const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auction')
        .setDescription('🔨 Bid on rare treasures in the auction house'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            inventory: { coins: 100 }
        };

        const activeAuctions = [
            {
                item: 'Dragon Scale Armor',
                seller: 'MasterHunter#1234',
                currentBid: 1500,
                timeLeft: '2h 34m',
                rarity: 'Epic',
                emoji: '🐉'
            },
            {
                item: 'Ancient Spellbook',
                seller: 'WizardOfOz#5678',
                currentBid: 800,
                timeLeft: '45m',
                rarity: 'Rare',
                emoji: '📚'
            },
            {
                item: 'Legendary Sword of Light',
                seller: 'KnightOfHonor#9999',
                currentBid: 5000,
                timeLeft: '6h 12m',
                rarity: 'Legendary',
                emoji: '⚔️'
            },
            {
                item: 'Crystal of Infinite Power',
                seller: 'CrystalMage#4321',
                currentBid: 10000,
                timeLeft: '1d 4h',
                rarity: 'Mythic',
                emoji: '💎'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🔨 Treasure Auction House')
            .setDescription('**Bid on the rarest treasures!**\n\nCompete with other hunters for legendary items.')
            .addFields(
                { name: '💰 Your Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '🎯 Active Bids', value: '2 items', inline: true },
                { name: '🏆 Items Won', value: '5 total', inline: true }
            );

        activeAuctions.forEach((auction, index) => {
            const rarityColors = {
                'Common': '⚪',
                'Uncommon': '🟢', 
                'Rare': '🔵',
                'Epic': '🟣',
                'Legendary': '🟠',
                'Mythic': '🔴'
            };

            embed.addFields({
                name: `${auction.emoji} ${auction.item}`,
                value: `**Seller:** ${auction.seller}\n**Current Bid:** ${auction.currentBid} coins\n**Time Left:** ${auction.timeLeft}\n**Rarity:** ${rarityColors[auction.rarity]} ${auction.rarity}`,
                inline: true
            });
        });

        const bidButtons = activeAuctions.map((auction, index) => 
            new ButtonBuilder()
                .setCustomId(`auction_bid_${index}`)
                .setLabel(`Bid on ${auction.item}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('💰')
        );

        const sellButton = new ButtonBuilder()
            .setCustomId('auction_sell')
            .setLabel('Sell Item')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📤');

        const historyButton = new ButtonBuilder()
            .setCustomId('auction_history')
            .setLabel('Auction History')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊');

        const row1 = new ActionRowBuilder().addComponents(bidButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(bidButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(sellButton, historyButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};