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
        .setName('harvest')
        .setDescription('🌾 Harvest your grown crops')
        .addIntegerOption(option =>
            option.setName('plot')
                .setDescription('Plot number to harvest')
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
            if (!plot.plantedAt || !plot.crop) {
                await interaction.editReply({
                    content: '❌ This plot is empty!',
                    ephemeral: true
                });
                return;
            }

            const cropData = crops[plot.crop];
            const growthTime = Date.now() - plot.plantedAt;
            
            if (growthTime < cropData.growthTime) {
                const timeLeft = cropData.growthTime - growthTime;
                await interaction.editReply({
                    content: `⏳ Your ${plot.crop} is not ready yet! Check back <t:${Math.floor((Date.now() + timeLeft) / 1000)}:R>`,
                    ephemeral: true
                });
                return;
            }

            // Calculate yield with bonus based on farming level
            const farmingLevel = player.skills?.farming?.level || 1;
            const baseYield = Math.floor(Math.random() * (cropData.yield.max - cropData.yield.min + 1)) + cropData.yield.min;
            const bonusYield = Math.floor(baseYield * (farmingLevel * 0.05)); // 5% bonus per level
            const totalYield = baseYield + bonusYield;

            // Add harvested crops to inventory
            if (!player.inventory) player.inventory = {};
            if (!player.inventory.crops) player.inventory.crops = {};
            player.inventory.crops[plot.crop] = (player.inventory.crops[plot.crop] || 0) + totalYield;

            // Clear the plot
            plot.crop = null;
            plot.plantedAt = null;

            // Add farming experience
            if (!player.skills) player.skills = {};
            if (!player.skills.farming) player.skills.farming = { level: 1, exp: 0 };
            player.skills.farming.exp += cropData.xp;

            // Level up check
            if (player.skills.farming.exp >= player.skills.farming.level * 100) {
                player.skills.farming.level++;
                player.skills.farming.exp = 0;
            }

            await db.updatePlayer(userId, player);

            const embed = new EmbedBuilder()
                .setColor('#32CD32')
                .setTitle('🌾 Harvest Successful!')
                .setDescription(`You harvested ${totalYield}x ${plot.crop}!`)
                .addFields(
                    { name: 'Base Yield', value: baseYield.toString(), inline: true },
                    { name: 'Bonus Yield', value: bonusYield.toString(), inline: true },
                    { name: 'Farming Level', value: player.skills.farming.level.toString(), inline: true },
                    { name: 'Experience Gained', value: `+${cropData.xp} exp`, inline: true }
                );

            if (player.skills.farming.exp >= player.skills.farming.level * 100) {
                embed.addFields({
                    name: '🎉 Level Up!',
                    value: `Your farming skill is now level ${player.skills.farming.level}!`,
                    inline: false
                });
            }

            // Show plot status
            const plotStatus = player.farming.plots.map((plot, index) => {
                if (plot.crop) {
                    const timeLeft = cropData.growthTime - (Date.now() - plot.plantedAt);
                    return `Plot ${index + 1}: ${plot.crop} (${timeLeft > 0 ? `Ready ${Math.floor(timeLeft / (60 * 1000))} minutes` : 'Ready!'})`;
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
            console.error('Error in harvest command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while harvesting your crops.',
                ephemeral: true
            });
        }
    },
};
