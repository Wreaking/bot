const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forge')
        .setDescription('⚒️ Forge powerful weapons and armor at the blacksmith'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            coins: 100,
            level: 1,
            experience: 0,
            inventory: {},
            skills: { smithing: 1 }
        };

        const forgeable = [
            { name: 'Iron Sword', cost: 150, materials: ['iron_ore', 'coal'], stats: '+15 ATK' },
            { name: 'Steel Shield', cost: 200, materials: ['steel_ingot', 'leather'], stats: '+20 DEF' },
            { name: 'Mystic Bow', cost: 300, materials: ['enchanted_wood', 'silver_string'], stats: '+25 ATK' },
            { name: 'Dragon Armor', cost: 500, materials: ['dragon_scale', 'mithril'], stats: '+50 DEF' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#CD853F')
            .setTitle('⚒️ The Grand Forge')
            .setDescription('**Master Blacksmith\'s Workshop**\n\nForge legendary equipment for your adventures!')
            .addFields(
                { name: '🔨 Your Smithing Level', value: `Level ${userProfile.skills?.smithing || 1}`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }
            );

        forgeable.forEach(item => {
            embed.addFields({
                name: `⚔️ ${item.name}`,
                value: `**Cost:** ${item.cost} coins\n**Materials:** ${item.materials.join(', ')}\n**Stats:** ${item.stats}`,
                inline: true
            });
        });

        const buttons = forgeable.map((item, index) => 
            new ButtonBuilder()
                .setCustomId(`forge_${index}`)
                .setLabel(`Forge ${item.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚒️')
        );

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));

        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    }
};