const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Workbench upgrades and their costs
const workbenchUpgrades = {
    basic: {
        level: 1,
        cost: 0,
        multiplier: 1.0,
        maxQuality: 'Common',
        description: 'Basic crafting capabilities'
    },
    improved: {
        level: 2,
        cost: 1000,
        multiplier: 1.2,
        maxQuality: 'Uncommon',
        description: '20% better crafting success rate'
    },
    advanced: {
        level: 3,
        cost: 5000,
        multiplier: 1.5,
        maxQuality: 'Rare',
        description: '50% better crafting success rate, rare items possible'
    },
    master: {
        level: 4,
        cost: 25000,
        multiplier: 2.0,
        maxQuality: 'Epic',
        description: 'Double crafting success rate, epic items possible'
    },
    legendary: {
        level: 5,
        cost: 100000,
        multiplier: 3.0,
        maxQuality: 'Legendary',
        description: 'Triple crafting success rate, legendary items possible'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('workbench')
        .setDescription('🛠️ Manage your crafting workbench')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your workbench status and upgrades'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade your workbench to the next level'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('maintenance')
                .setDescription('Perform maintenance to maintain optimal crafting conditions')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                coins: 100,
                workbenchLevel: 1,
                craftingLevel: 1,
                lastMaintenance: 0
            };

            if (subcommand === 'status') {
                const currentUpgrade = Object.values(workbenchUpgrades)
                    .find(upgrade => upgrade.level === player.workbenchLevel);
                const nextUpgrade = Object.values(workbenchUpgrades)
                    .find(upgrade => upgrade.level === player.workbenchLevel + 1);

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🛠️ Crafting Workbench')
                    .setDescription(`Your Level ${player.workbenchLevel} Workbench`)
                    .addFields(
                        { name: 'Current Bonus', value: `${(currentUpgrade.multiplier * 100 - 100).toFixed(0)}% success rate`, inline: true },
                        { name: 'Max Quality', value: currentUpgrade.maxQuality, inline: true },
                        { name: 'Maintenance', value: getMaintenanceStatus(player.lastMaintenance), inline: true }
                    );

                if (nextUpgrade) {
                    embed.addFields(
                        { name: 'Next Upgrade', value: `Level ${nextUpgrade.level} - ${nextUpgrade.description}`, inline: false },
                        { name: 'Upgrade Cost', value: `${nextUpgrade.cost} coins`, inline: true },
                        { name: 'Required Level', value: `Crafting Level ${nextUpgrade.level * 2}`, inline: true }
                    );
                } else {
                    embed.addFields({
                        name: '🌟 Maximum Level', value: 'Your workbench is fully upgraded!', inline: false
                    });
                }

                const buttons = [
                    new ButtonBuilder()
                        .setCustomId('workbench_upgrade')
                        .setLabel('Upgrade')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(!nextUpgrade || player.coins < nextUpgrade.cost),
                    new ButtonBuilder()
                        .setCustomId('workbench_maintain')
                        .setLabel('Maintain')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(Date.now() - player.lastMaintenance < 24 * 60 * 60 * 1000)
                ];

                const row = new ActionRowBuilder().addComponents(buttons);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'upgrade') {
                const currentLevel = player.workbenchLevel || 1;
                const nextUpgrade = Object.values(workbenchUpgrades)
                    .find(upgrade => upgrade.level === currentLevel + 1);

                if (!nextUpgrade) {
                    await interaction.editReply({
                        content: '❌ Your workbench is already at maximum level!',
                        ephemeral: true
                    });
                    return;
                }

                if (player.coins < nextUpgrade.cost) {
                    await interaction.editReply({
                        content: `❌ You need ${nextUpgrade.cost} coins to upgrade your workbench!`,
                        ephemeral: true
                    });
                    return;
                }

                if (player.craftingLevel < nextUpgrade.level * 2) {
                    await interaction.editReply({
                        content: `❌ You need Crafting Level ${nextUpgrade.level * 2} to upgrade your workbench!`,
                        ephemeral: true
                    });
                    return;
                }

                // Apply upgrade
                player.coins -= nextUpgrade.cost;
                player.workbenchLevel = nextUpgrade.level;
                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🛠️ Workbench Upgraded!')
                    .setDescription(`Your workbench is now level ${nextUpgrade.level}!`)
                    .addFields(
                        { name: 'New Bonus', value: `${(nextUpgrade.multiplier * 100 - 100).toFixed(0)}% success rate`, inline: true },
                        { name: 'Max Quality', value: nextUpgrade.maxQuality, inline: true },
                        { name: 'Coins Remaining', value: `${player.coins}`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'maintenance') {
                const lastMaintenance = player.lastMaintenance || 0;
                const timeSinceLastMaintenance = Date.now() - lastMaintenance;
                
                if (timeSinceLastMaintenance < 24 * 60 * 60 * 1000) {
                    const nextMaintenance = new Date(lastMaintenance + 24 * 60 * 60 * 1000);
                    await interaction.editReply({
                        content: `❌ Maintenance can only be performed once per day. Next maintenance available: ${nextMaintenance.toLocaleString()}`,
                        ephemeral: true
                    });
                    return;
                }

                // Perform maintenance
                player.lastMaintenance = Date.now();
                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle('🛠️ Workbench Maintenance')
                    .setDescription('You\'ve performed maintenance on your workbench!')
                    .addFields(
                        { name: '✨ Result', value: 'Your workbench is now in optimal condition', inline: false },
                        { name: '⚡ Bonus', value: 'Crafting success rate restored to maximum', inline: true },
                        { name: '⏰ Next Maintenance', value: '24 hours', inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in workbench command:', error);
            await interaction.editReply({
                content: '❌ An error occurred with the workbench command.',
                ephemeral: true
            });
        }
    },
};

function getMaintenanceStatus(lastMaintenance) {
    if (!lastMaintenance) return '❌ Never maintained';
    const timeSince = Date.now() - lastMaintenance;
    const hoursAgo = Math.floor(timeSince / (1000 * 60 * 60));
    
    if (hoursAgo < 24) {
        return `✅ Maintained ${hoursAgo}h ago`;
    } else {
        return `⚠️ Needs maintenance (${hoursAgo}h ago)`;
    }
}
