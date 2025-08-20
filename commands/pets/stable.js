const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stable')
        .setDescription('🐾 Manage your collection of treasure hunting companions'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getUser(userId) || {
            inventory: { coins: 100 },
            pets: { active: null, collection: {} }
        };

        const availablePets = [
            { name: 'Treasure Hound', cost: 500, ability: 'Finds hidden treasures', rarity: 'Common', emoji: '🐕' },
            { name: 'Crystal Fox', cost: 1000, ability: '+20% gem finding rate', rarity: 'Rare', emoji: '🦊' },
            { name: 'Dragon Companion', cost: 2500, ability: 'Protects from combat damage', rarity: 'Epic', emoji: '🐉' },
            { name: 'Phoenix Familiar', cost: 5000, ability: 'Revives after death', rarity: 'Legendary', emoji: '🔥' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('🐾 Mystical Pet Stable')
            .setDescription('**Adopt loyal companions for your adventures!**\n\nPets provide unique abilities and bonuses.')
            .addFields(
                { name: '🎯 Active Pet', value: userProfile.pets?.active || 'None', inline: true },
                { name: '📦 Pet Collection', value: `${Object.keys(userProfile.pets?.collection || {}).length}/10`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true }
            );

        availablePets.forEach(pet => {
            const owned = userProfile.pets?.collection?.[pet.name] ? '✅ Owned' : '❌ Not owned';
            const rarityEmoji = {
                'Common': '⚪',
                'Rare': '🔵',
                'Epic': '🟣',
                'Legendary': '🟠'
            };

            embed.addFields({
                name: `${pet.emoji} ${pet.name}`,
                value: `**Ability:** ${pet.ability}\n**Cost:** ${pet.cost} coins\n**Rarity:** ${rarityEmoji[pet.rarity]} ${pet.rarity}\n**Status:** ${owned}`,
                inline: true
            });
        });

        const adoptButtons = availablePets.map((pet, index) => 
            new ButtonBuilder()
                .setCustomId(`stable_adopt_${index}`)
                .setLabel(`Adopt ${pet.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(pet.emoji)
        );

        const feedButton = new ButtonBuilder()
            .setCustomId('stable_feed')
            .setLabel('Feed Pets')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🍖');

        const trainButton = new ButtonBuilder()
            .setCustomId('stable_train')
            .setLabel('Train Pet')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎾');

        const row1 = new ActionRowBuilder().addComponents(adoptButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(adoptButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(feedButton, trainButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};