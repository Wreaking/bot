const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enchant')
        .setDescription('✨ Enchant your equipment with magical properties'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            inventory: { coins: 100 },
            stats: { level: 1 },
            skills: { magic: 1 }
        };

        const enchantments = [
            { name: 'Sharpness', effect: '+10 Attack Damage', cost: 100, type: 'Weapon' },
            { name: 'Protection', effect: '+15 Defense', cost: 120, type: 'Armor' },
            { name: 'Fortune', effect: '+25% Treasure Find Rate', cost: 200, type: 'Tool' },
            { name: 'Efficiency', effect: '+50% Work Speed', cost: 150, type: 'Tool' },
            { name: 'Unbreaking', effect: 'Items last 3x longer', cost: 180, type: 'Any' },
            { name: 'Fire Aspect', effect: 'Burn enemies on hit', cost: 300, type: 'Weapon' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('✨ Enchantment Chamber')
            .setDescription('**Imbue your equipment with mystical powers!**\n\nEnchant weapons, armor, and tools with magical effects.')
            .addFields(
                { name: '🔮 Magic Level', value: `${userProfile.skills?.magic || 1}`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '⚡ Enchantment Power', value: '85/100', inline: true }
            );

        enchantments.forEach(enchant => {
            const requiredLevel = enchant.cost > 200 ? 10 : enchant.cost > 150 ? 5 : 1;
            const canEnchant = (userProfile.skills?.magic || 1) >= requiredLevel;
            const status = canEnchant ? '✅ Available' : `🔒 Requires Magic Level ${requiredLevel}`;

            embed.addFields({
                name: `✨ ${enchant.name}`,
                value: `**Effect:** ${enchant.effect}\n**Cost:** ${enchant.cost} coins\n**Type:** ${enchant.type}\n**Status:** ${status}`,
                inline: true
            });
        });

        const enchantButtons = enchantments.slice(0, 4).map((enchant, index) => 
            new ButtonBuilder()
                .setCustomId(`enchant_${index}`)
                .setLabel(`${enchant.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✨')
        );

        const disenchantButton = new ButtonBuilder()
            .setCustomId('enchant_remove')
            .setLabel('Remove Enchantment')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️');

        const upgradeButton = new ButtonBuilder()
            .setCustomId('enchant_upgrade')
            .setLabel('Upgrade Enchant')
            .setStyle(ButtonStyle.Success)
            .setEmoji('⬆️');

        const row1 = new ActionRowBuilder().addComponents(enchantButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(enchantButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(disenchantButton, upgradeButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};