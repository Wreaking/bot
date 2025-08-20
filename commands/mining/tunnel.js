const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tunnel')
        .setDescription('⛏️ Explore and expand mining tunnels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('dig')
                .setDescription('Dig a new tunnel section')
                .addStringOption(option =>
                    option.setName('direction')
                        .setDescription('Direction to dig')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Deeper', value: 'deep' },
                            { name: 'Branch Left', value: 'left' },
                            { name: 'Branch Right', value: 'right' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reinforce')
                .setDescription('Reinforce tunnel supports'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('map')
                .setDescription('View your mine layout')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize mining data if it doesn't exist
            if (!player.mining) {
                player.mining = {
                    tunnels: [{
                        depth: 1,
                        branches: [],
                        stability: 100,
                        resources: {}
                    }],
                    totalDepth: 1,
                    equipment: {
                        pickaxe: 'basic',
                        supports: 0,
                        lantern: 'basic'
                    }
                };
            }

            if (subcommand === 'dig') {
                const direction = interaction.options.getString('direction');
                const currentTunnel = player.mining.tunnels[player.mining.tunnels.length - 1];

                // Check equipment durability
                if (!player.inventory?.equipment?.find(e => e.type === 'pickaxe' && e.durability > 0)) {
                    await interaction.editReply({
                        content: '❌ You need a pickaxe with durability to dig!',
                        ephemeral: true
                    });
                    return;
                }

                // Check tunnel stability
                if (currentTunnel.stability < 50) {
                    await interaction.editReply({
                        content: '⚠️ The tunnel is too unstable! Reinforce it first.',
                        ephemeral: true
                    });
                    return;
                }

                const digCost = Math.floor(10 * Math.pow(1.2, player.mining.totalDepth));
                if (player.stamina < digCost) {
                    await interaction.editReply({
                        content: `❌ You don't have enough stamina! Need ${digCost} stamina.`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('⛏️ Mining Operation')
                    .setDescription(`Start digging ${direction}?`)
                    .addFields(
                        { name: 'Stamina Cost', value: digCost.toString(), inline: true },
                        { name: 'Current Depth', value: player.mining.totalDepth.toString(), inline: true },
                        { name: 'Tunnel Stability', value: `${currentTunnel.stability}%`, inline: true }
                    );

                const dig = new ButtonBuilder()
                    .setCustomId('dig_confirm')
                    .setLabel('Start Digging')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⛏️');

                const cancel = new ButtonBuilder()
                    .setCustomId('dig_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(dig, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'dig_confirm') {
                        // Reduce stamina and equipment durability
                        player.stamina -= digCost;
                        const pickaxe = player.inventory.equipment.find(e => e.type === 'pickaxe');
                        pickaxe.durability -= 1;

                        // Calculate mining results
                        const findChance = Math.random();
                        let resources = {};
                        let depth = player.mining.totalDepth;

                        if (direction === 'deep') {
                            depth += 1;
                            player.mining.totalDepth = depth;
                            // Higher chance of rare resources at greater depths
                            if (findChance < 0.1 * (depth / 10)) {
                                resources.gems = Math.floor(Math.random() * 3) + 1;
                            } else if (findChance < 0.3 * (depth / 5)) {
                                resources.gold = Math.floor(Math.random() * 5) + 1;
                            } else {
                                resources.iron = Math.floor(Math.random() * 10) + 1;
                            }
                        } else {
                            // Branch tunnels have different resource distributions
                            if (findChance < 0.2) {
                                resources.crystal = Math.floor(Math.random() * 2) + 1;
                            } else {
                                resources.stone = Math.floor(Math.random() * 15) + 5;
                            }
                        }

                        // Create new tunnel section
                        const newTunnel = {
                            depth: depth,
                            branches: [],
                            stability: Math.max(50, currentTunnel.stability - 10),
                            resources: resources
                        };

                        if (direction === 'deep') {
                            player.mining.tunnels.push(newTunnel);
                        } else {
                            currentTunnel.branches.push(newTunnel);
                        }

                        // Add resources to inventory
                        if (!player.inventory.materials) player.inventory.materials = {};
                        Object.entries(resources).forEach(([type, amount]) => {
                            player.inventory.materials[type] = (player.inventory.materials[type] || 0) + amount;
                        });

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('⛏️ Mining Success!')
                            .setDescription(`You've dug a new tunnel section ${direction}!`)
                            .addFields(
                                { name: 'Resources Found', value: Object.entries(resources)
                                    .map(([type, amount]) => `${type}: ${amount}`).join('\n'), inline: true },
                                { name: 'New Depth', value: depth.toString(), inline: true },
                                { name: 'Tunnel Stability', value: `${newTunnel.stability}%`, inline: true }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Mining operation cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Mining operation expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'reinforce') {
                const currentTunnel = player.mining.tunnels[player.mining.tunnels.length - 1];
                
                if (currentTunnel.stability >= 100) {
                    await interaction.editReply({
                        content: '✅ This tunnel is already fully reinforced!',
                        ephemeral: true
                    });
                    return;
                }

                if (!player.inventory?.materials?.wood || player.inventory.materials.wood < 5) {
                    await interaction.editReply({
                        content: '❌ You need 5 wood to reinforce the tunnel!',
                        ephemeral: true
                    });
                    return;
                }

                player.inventory.materials.wood -= 5;
                currentTunnel.stability = Math.min(100, currentTunnel.stability + 25);

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🔨 Tunnel Reinforced')
                    .setDescription('You\'ve reinforced the tunnel supports!')
                    .addFields(
                        { name: 'New Stability', value: `${currentTunnel.stability}%`, inline: true },
                        { name: 'Materials Used', value: '5 wood', inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'map') {
                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🗺️ Mine Layout')
                    .setDescription('Your mining network:');

                let mapText = '';
                player.mining.tunnels.forEach((tunnel, index) => {
                    mapText += `Level ${index + 1} (${tunnel.stability}% stable):\n`;
                    mapText += `Resources: ${Object.entries(tunnel.resources)
                        .map(([type, amount]) => `${type}: ${amount}`).join(', ') || 'None'}\n`;
                    
                    if (tunnel.branches.length > 0) {
                        tunnel.branches.forEach((branch, branchIndex) => {
                            mapText += `  Branch ${branchIndex + 1} (${branch.stability}% stable):\n`;
                            mapText += `  Resources: ${Object.entries(branch.resources)
                                .map(([type, amount]) => `${type}: ${amount}`).join(', ') || 'None'}\n`;
                        });
                    }
                    mapText += '\n';
                });

                embed.addFields({
                    name: '📍 Tunnel Network',
                    value: mapText || 'No tunnels dug yet.',
                    inline: false
                });

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in tunnel command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing tunnels.',
                ephemeral: true
            });
        }
    },
};
