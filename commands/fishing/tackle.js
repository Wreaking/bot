const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

const fishingEquipment = {
    rods: {
        wooden_rod: {
            name: 'Wooden Fishing Rod',
            cost: 100,
            power: 1,
            durability: 50,
            description: 'A basic wooden fishing rod',
            emoji: '🎣'
        },
        bamboo_rod: {
            name: 'Bamboo Rod',
            cost: 500,
            power: 2,
            durability: 75,
            description: 'Flexible and durable bamboo rod',
            emoji: '🎋'
        },
        carbon_rod: {
            name: 'Carbon Fiber Rod',
            cost: 2500,
            power: 4,
            durability: 150,
            description: 'Professional-grade carbon fiber rod',
            emoji: '⚡'
        },
        mythril_rod: {
            name: 'Mythril Rod',
            cost: 10000,
            power: 8,
            durability: 300,
            description: 'Magical mythril-infused rod',
            emoji: '✨'
        }
    },
    bait: {
        worm: {
            name: 'Worms',
            cost: 5,
            power: 1,
            quantity: 10,
            description: 'Basic fishing bait',
            emoji: '🪱'
        },
        minnow: {
            name: 'Minnows',
            cost: 15,
            power: 2,
            quantity: 5,
            description: 'Small fish as bait',
            emoji: '🐟'
        },
        shrimp: {
            name: 'Magic Shrimp',
            cost: 50,
            power: 3,
            quantity: 3,
            description: 'Enchanted shrimp bait',
            emoji: '🦐'
        }
    },
    accessories: {
        hook: {
            name: 'Steel Hook Set',
            cost: 200,
            durability: 25,
            description: 'Durable steel fishing hooks',
            emoji: '🪝'
        },
        line: {
            name: 'Enhanced Fishing Line',
            cost: 300,
            power: 1,
            description: 'Strong and flexible line',
            emoji: '➰'
        },
        lure: {
            name: 'Glowing Lure',
            cost: 750,
            power: 2,
            description: 'Attracts rare fish',
            emoji: '💫'
        }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tackle')
        .setDescription('🎣 Visit the fishing shop for equipment')
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Browse fishing equipment')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Equipment category')
                        .setRequired(true)
                        .addChoices(
                            { name: '🎣 Fishing Rods', value: 'rods' },
                            { name: '🪱 Bait', value: 'bait' },
                            { name: '🪝 Accessories', value: 'accessories' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('inventory')
                .setDescription('Check your fishing equipment'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repair')
                .setDescription('Repair your fishing equipment')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                coins: 100,
                fishingLevel: 1,
                equipment: {
                    rod: 'wooden_rod',
                    bait: [],
                    accessories: []
                },
                rodDurability: 50
            };

            if (subcommand === 'shop') {
                const category = interaction.options.getString('category');
                const items = fishingEquipment[category];

                const embed = new EmbedBuilder()
                    .setColor('#1E90FF')
                    .setTitle('🎣 Fishing Equipment Shop')
                    .setDescription(`Your coins: ${player.coins} 💰`)
                    .addFields(
                        Object.entries(items).map(([id, item]) => ({
                            name: `${item.emoji} ${item.name} (${item.cost} coins)`,
                            value: `${item.description}\n${
                                item.power ? `Power: +${item.power} ` : ''}${
                                item.durability ? `Durability: ${item.durability} ` : ''}${
                                item.quantity ? `Quantity: ${item.quantity}` : ''}`,
                            inline: true
                        }))
                    );

                // Create buttons for each item
                const buttons = Object.entries(items).map(([id, item]) => 
                    new ButtonBuilder()
                        .setCustomId(`buy_${category}_${id}`)
                        .setLabel(`Buy ${item.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(player.coins < item.cost)
                );

                // Split buttons into rows of 5
                const rows = [];
                for (let i = 0; i < buttons.length; i += 5) {
                    rows.push(
                        new ActionRowBuilder()
                            .addComponents(buttons.slice(i, i + 5))
                    );
                }

                await interaction.editReply({
                    embeds: [embed],
                    components: rows
                });

            } else if (subcommand === 'inventory') {
                const rod = fishingEquipment.rods[player.equipment.rod];
                const durabilityPercent = (player.rodDurability / rod.durability * 100).toFixed(1);
                const durabilityBar = createDurabilityBar(player.rodDurability, rod.durability);

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('🎣 Fishing Equipment')
                    .addFields(
                        { 
                            name: 'Current Rod',
                            value: `${rod.emoji} ${rod.name}\nDurability: ${durabilityBar} (${durabilityPercent}%)`,
                            inline: false
                        },
                        {
                            name: '🪱 Bait Inventory',
                            value: player.equipment.bait.length > 0
                                ? player.equipment.bait.map(b => `${fishingEquipment.bait[b].emoji} ${fishingEquipment.bait[b].name}`).join('\n')
                                : 'No bait',
                            inline: true
                        },
                        {
                            name: '🪝 Accessories',
                            value: player.equipment.accessories.length > 0
                                ? player.equipment.accessories.map(a => `${fishingEquipment.accessories[a].emoji} ${fishingEquipment.accessories[a].name}`).join('\n')
                                : 'No accessories',
                            inline: true
                        }
                    );

                const repairButton = new ButtonBuilder()
                    .setCustomId('repair_rod')
                    .setLabel('Repair Rod')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(durabilityPercent >= 100);

                const row = new ActionRowBuilder()
                    .addComponents(repairButton);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'repair') {
                const rod = fishingEquipment.rods[player.equipment.rod];
                const maxDurability = rod.durability;
                const currentDurability = player.rodDurability;

                if (currentDurability >= maxDurability) {
                    await interaction.editReply({
                        content: '❌ Your fishing rod doesn\'t need repairs!',
                        ephemeral: true
                    });
                    return;
                }

                const repairCost = Math.ceil((maxDurability - currentDurability) * (rod.cost / maxDurability / 2));

                if (player.coins < repairCost) {
                    await interaction.editReply({
                        content: `❌ You need ${repairCost} coins to repair your rod!`,
                        ephemeral: true
                    });
                    return;
                }

                // Apply repair
                player.coins -= repairCost;
                player.rodDurability = maxDurability;
                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#32CD32')
                    .setTitle('🔧 Rod Repaired!')
                    .setDescription(`Your ${rod.name} has been fully repaired!`)
                    .addFields(
                        { name: 'Durability', value: createDurabilityBar(maxDurability, maxDurability), inline: true },
                        { name: 'Cost', value: `${repairCost} coins`, inline: true },
                        { name: 'Remaining Coins', value: `${player.coins}`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in tackle command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing fishing equipment.',
                ephemeral: true
            });
        }
    },
};

function createDurabilityBar(current, max) {
    const barLength = 10;
    const progress = Math.min(Math.max(0, current), max);
    const filledLength = Math.floor((progress / max) * barLength);
    const emptyLength = barLength - filledLength;
    
    return '🟦'.repeat(filledLength) + '⬜'.repeat(emptyLength);
}
