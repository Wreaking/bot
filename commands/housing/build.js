const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build')
        .setDescription('🏠 Build and upgrade your treasure hunter hideout'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            inventory: { coins: 100 },
            stats: { level: 1, experience: 0 },
            house: { level: 1, rooms: ['bedroom'], storage: 50 }
        };

        const upgrades = [
            { name: 'Storage Room', cost: 200, benefit: '+25 inventory space', unlocked: true },
            { name: 'Enchanting Chamber', cost: 500, benefit: 'Enchant equipment', unlocked: (userProfile.stats?.level || 1) >= 5 },
            { name: 'Trophy Hall', cost: 750, benefit: 'Display achievements', unlocked: (userProfile.stats?.level || 1) >= 10 },
            { name: 'Secret Vault', cost: 1000, benefit: 'Secure rare items', unlocked: (userProfile.stats?.level || 1) >= 15 }
        ];

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏠 Treasure Hunter Hideout')
            .setDescription('**Your Secret Base**\n\nUpgrade your hideout to unlock new abilities!')
            .addFields(
                { name: '🏡 House Level', value: `Level ${userProfile.house?.level || 1}`, inline: true },
                { name: '💰 Available Coins', value: `${userProfile.inventory?.coins || 0}`, inline: true },
                { name: '📦 Storage Capacity', value: `${userProfile.house?.storage || 50} items`, inline: true }
            );

        if (userProfile.house?.rooms) {
            embed.addFields({
                name: '🚪 Current Rooms',
                value: userProfile.house.rooms.join(', '),
                inline: false
            });
        }

        upgrades.forEach(upgrade => {
            const status = upgrade.unlocked ? '✅ Available' : '🔒 Locked';
            embed.addFields({
                name: `🏗️ ${upgrade.name}`,
                value: `**Cost:** ${upgrade.cost} coins\n**Benefit:** ${upgrade.benefit}\n**Status:** ${status}`,
                inline: true
            });
        });

        const buttons = upgrades
            .filter(upgrade => upgrade.unlocked)
            .map((upgrade, index) => 
                new ButtonBuilder()
                    .setCustomId(`build_${index}`)
                    .setLabel(`Build ${upgrade.name}`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏗️')
            );

        const decorateButton = new ButtonBuilder()
            .setCustomId('house_decorate')
            .setLabel('Decorate House')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🎨');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(decorateButton);

        const components = [row1];
        if (buttons.length > 2) components.push(row2);
        components.push(row3);

        await interaction.reply({ embeds: [embed], components });
    }
};