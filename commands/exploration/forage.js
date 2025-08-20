const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forage')
        .setDescription('🌿 Forage for herbs, berries, and natural materials'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            energy: 100,
            skills: { foraging: 1 }
        };

        const foragingSpots = [
            {
                name: 'Peaceful Meadow',
                energy: 10,
                items: ['Healing Herbs', 'Wild Berries', 'Flower Petals'],
                rarity: 'Common',
                emoji: '🌸'
            },
            {
                name: 'Dense Woodland',
                energy: 20,
                items: ['Rare Mushrooms', 'Ancient Bark', 'Medicinal Roots'],
                rarity: 'Uncommon',
                emoji: '🌲'
            },
            {
                name: 'Mystic Grove',
                energy: 30,
                items: ['Magic Moss', 'Fairy Dust', 'Enchanted Berries'],
                rarity: 'Rare',
                emoji: '✨'
            },
            {
                name: 'Sacred Garden',
                energy: 50,
                items: ['Divine Herbs', 'Phoenix Feathers', 'Celestial Fruit'],
                rarity: 'Legendary',
                emoji: '🌺'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('🌿 Nature\'s Bounty')
            .setDescription('**Gather valuable natural resources from the wilderness!**\n\nExplore different areas to find unique materials.')
            .addFields(
                { name: '⚡ Current Energy', value: `${userProfile.energy || 100}/100`, inline: true },
                { name: '🌱 Foraging Level', value: `${userProfile.skills?.foraging || 1}`, inline: true },
                { name: '🎒 Bag Space', value: `${Object.keys(userProfile.inventory || {}).length}/50`, inline: true }
            );

        foragingSpots.forEach(spot => {
            const canForage = (userProfile.energy || 100) >= spot.energy;
            const status = canForage ? '✅ Available' : '❌ Not enough energy';
            
            embed.addFields({
                name: `${spot.emoji} ${spot.name}`,
                value: `**Energy Cost:** ${spot.energy}\n**Rarity:** ${spot.rarity}\n**Items:** ${spot.items.join(', ')}\n**Status:** ${status}`,
                inline: true
            });
        });

        // Show current location bonuses
        const locationBonuses = {
            'Mystic Forest': '+20% herb finding rate',
            'Crystal Caves': '+15% crystal formation chance',
            'Village Square': 'No bonuses'
        };

        const currentLocation = userProfile.location || 'Village Square';
        embed.addFields({
            name: '📍 Location Bonus',
            value: `**${currentLocation}:** ${locationBonuses[currentLocation] || 'No bonuses'}`,
            inline: false
        });

        const buttons = foragingSpots.map((spot, index) => 
            new ButtonBuilder()
                .setCustomId(`forage_${index}`)
                .setLabel(`Forage ${spot.name}`)
                .setStyle(ButtonStyle.Success)
                .setEmoji(spot.emoji)
                .setDisabled((userProfile.energy || 100) < spot.energy)
        );

        const restButton = new ButtonBuilder()
            .setCustomId('forage_rest')
            .setLabel('Rest & Restore Energy')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('😴');

        const recipeButton = new ButtonBuilder()
            .setCustomId('forage_recipes')
            .setLabel('View Crafting Recipes')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📜');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(restButton, recipeButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};