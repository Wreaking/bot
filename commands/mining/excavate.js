const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('excavate')
        .setDescription('⛏️ Dig deep for precious gems and ancient artifacts'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            inventory: { coins: 100 },
            stats: { level: 1 },
            skills: { mining: 1 },
            equipment: { pickaxe: 'Stone Pickaxe' }
        };

        const excavationSites = [
            {
                name: 'Rocky Hillside',
                depth: 'Surface',
                finds: ['Iron Ore', 'Coal', 'Small Gems'],
                energy: 15,
                emoji: '🪨'
            },
            {
                name: 'Ancient Quarry',
                depth: 'Medium',
                finds: ['Silver Ore', 'Crystals', 'Fossil Fragments'],
                energy: 25,
                emoji: '🏛️'
            },
            {
                name: 'Deep Mine Shafts',
                depth: 'Deep',
                finds: ['Gold Ore', 'Rare Crystals', 'Underground Artifacts'],
                energy: 40,
                emoji: '⚡'
            },
            {
                name: 'Earth\'s Core',
                depth: 'Extreme',
                finds: ['Mythril', 'Dragon Gems', 'Ancient Relics'],
                energy: 60,
                emoji: '🌋'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⛏️ Treasure Excavation Sites')
            .setDescription('**Dig deeper for greater treasures!**\n\nEach site offers unique materials and artifacts.')
            .addFields(
                { name: '⛏️ Mining Level', value: `${userProfile.skills?.mining || 1}`, inline: true },
                { name: '🔨 Current Pickaxe', value: userProfile.equipment?.pickaxe || 'Stone Pickaxe', inline: true },
                { name: '💪 Stamina', value: '100/100', inline: true }
            );

        excavationSites.forEach(site => {
            const requiredLevel = site.depth === 'Surface' ? 1 : site.depth === 'Medium' ? 5 : site.depth === 'Deep' ? 10 : 15;
            const canDig = (userProfile.skills?.mining || 1) >= requiredLevel;
            const status = canDig ? '✅ Available' : `🔒 Requires Level ${requiredLevel}`;

            embed.addFields({
                name: `${site.emoji} ${site.name}`,
                value: `**Depth:** ${site.depth}\n**Energy Cost:** ${site.energy}\n**Potential Finds:** ${site.finds.join(', ')}\n**Status:** ${status}`,
                inline: true
            });
        });

        const buttons = excavationSites.map((site, index) => 
            new ButtonBuilder()
                .setCustomId(`excavate_${index}`)
                .setLabel(`Dig at ${site.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(site.emoji)
        );

        const upgradeButton = new ButtonBuilder()
            .setCustomId('mining_upgrade')
            .setLabel('Upgrade Pickaxe')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔧');

        const dynamiteButton = new ButtonBuilder()
            .setCustomId('mining_dynamite')
            .setLabel('Use Dynamite')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💥');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(upgradeButton, dynamiteButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};