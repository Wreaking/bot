const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const crops = {
    wheat: {
        growthTime: 2 * 60 * 60 * 1000, // 2 hours
        yield: { min: 3, max: 6 },
        cost: 25,
        xp: 10,
        level: 1
    },
    carrot: {
        growthTime: 3 * 60 * 60 * 1000, // 3 hours
        yield: { min: 4, max: 8 },
        cost: 40,
        xp: 15,
        level: 3
    },
    potato: {
        growthTime: 4 * 60 * 60 * 1000, // 4 hours
        yield: { min: 5, max: 10 },
        cost: 50,
        xp: 20,
        level: 5
    },
    corn: {
        growthTime: 6 * 60 * 60 * 1000, // 6 hours
        yield: { min: 8, max: 15 },
        cost: 75,
        xp: 30,
        level: 8
    },
    pumpkin: {
        growthTime: 8 * 60 * 60 * 1000, // 8 hours
        yield: { min: 1, max: 3 },
        cost: 100,
        xp: 40,
        level: 10
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('water')
        .setDescription('💧 Water your crops to boost their growth')
        .addIntegerOption(option =>
            option.setName('plot')
                .setDescription('Plot number to water')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const plotNumber = interaction.options.getInteger('plot');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Check if player has farming plots
            if (!player.farming?.plots || !player.farming.plots[plotNumber-1]) {
                await interaction.editReply({
                    content: '❌ Invalid plot number or no crop planted in this plot!',
                    ephemeral: true
                });
                return;
            }

            const plot = player.farming.plots[plotNumber-1];
            if (!plot.crop) {
                await interaction.editReply({
                    content: '❌ This plot is empty!',
                    ephemeral: true
                });
                return;
            }

            // Check if plot was already watered recently
            const waterCooldown = 4 * 60 * 60 * 1000; // 4 hours
            if (plot.lastWatered && Date.now() - plot.lastWatered < waterCooldown) {
                await interaction.editReply({
                    content: `💧 This plot was recently watered! You can water again <t:${Math.floor((plot.lastWatered + waterCooldown) / 1000)}:R>`,
                    ephemeral: true
                });
                return;
            }

            const cropData = crops[plot.crop];
            const growthTime = Date.now() - plot.plantedAt;
            const growthPercent = (growthTime / cropData.growthTime) * 100;

            // Apply watering bonus
            const wateringBonus = 0.1; // 10% growth boost
            plot.plantedAt -= Math.floor(cropData.growthTime * wateringBonus);
            plot.lastWatered = Date.now();

            // Add farming experience
            if (!player.skills) player.skills = {};
            if (!player.skills.farming) player.skills.farming = { level: 1, exp: 0 };
            player.skills.farming.exp += 5; // Small XP for watering

            // Level up check
            if (player.skills.farming.exp >= player.skills.farming.level * 100) {
                player.skills.farming.level++;
                player.skills.farming.exp = 0;
            }

            await db.updatePlayer(userId, player);

            const embed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('💧 Plot Watered!')
                .setDescription(`You watered your ${plot.crop}!`)
                .addFields(
                    { name: 'Growth Progress', value: `${Math.min(100, Math.floor(growthPercent + (wateringBonus * 100)))}%`, inline: true },
                    { name: 'Growth Boost', value: `+${wateringBonus * 100}%`, inline: true },
                    { name: 'Ready In', value: `<t:${Math.floor((plot.plantedAt + cropData.growthTime) / 1000)}:R>`, inline: true }
                );

            if (player.skills.farming.exp >= player.skills.farming.level * 100) {
                embed.addFields({
                    name: '🎉 Level Up!',
                    value: `Your farming skill is now level ${player.skills.farming.level}!`,
                    inline: false
                });
            }

            // Show plot status
            const plotStatus = player.farming.plots.map((p, index) => {
                if (p.crop) {
                    const timeLeft = crops[p.crop].growthTime - (Date.now() - p.plantedAt);
                    return `Plot ${index + 1}: ${p.crop} (${timeLeft > 0 ? `Ready ${Math.floor(timeLeft / (60 * 1000))} minutes` : 'Ready!'})`;
                }
                return `Plot ${index + 1}: Empty`;
            }).join('\n');

            embed.addFields({
                name: '🌱 Farm Status',
                value: plotStatus,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in water command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while watering your crops.',
                ephemeral: true
            });
        }
    },
};
