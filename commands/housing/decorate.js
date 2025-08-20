const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('decorate')
        .setDescription('🎨 Decorate your house')
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy new decorations')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Category of decoration')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Furniture', value: 'furniture' },
                            { name: 'Wall Decor', value: 'wall' },
                            { name: 'Flooring', value: 'floor' },
                            { name: 'Plants', value: 'plants' },
                            { name: 'Lighting', value: 'lights' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('place')
                .setDescription('Place or rearrange decorations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your decorations')),

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

            if (!player.housing?.rooms || player.housing.rooms.length === 0) {
                await interaction.editReply({
                    content: '❌ You need to build some rooms first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize decoration data if it doesn't exist
            if (!player.housing.decorations) {
                player.housing.decorations = {
                    inventory: [],
                    placed: {}
                };
            }

            const decorItems = {
                furniture: {
                    couch: { cost: 500, comfort: 2, style: 3 },
                    table: { cost: 300, utility: 2, style: 2 },
                    bookshelf: { cost: 400, utility: 3, style: 2 },
                    bed: { cost: 600, comfort: 3, style: 2 }
                },
                wall: {
                    painting: { cost: 200, style: 3 },
                    mirror: { cost: 250, utility: 1, style: 2 },
                    tapestry: { cost: 350, style: 4 }
                },
                floor: {
                    carpet: { cost: 300, comfort: 2, style: 2 },
                    rug: { cost: 200, comfort: 1, style: 2 },
                    tiles: { cost: 400, utility: 2, style: 3 }
                },
                plants: {
                    fern: { cost: 100, style: 1 },
                    bonsai: { cost: 300, style: 3 },
                    flowers: { cost: 150, style: 2 }
                },
                lights: {
                    chandelier: { cost: 500, utility: 2, style: 4 },
                    lamp: { cost: 200, utility: 1, style: 2 },
                    candles: { cost: 100, style: 2 }
                }
            };

            if (subcommand === 'buy') {
                const category = interaction.options.getString('category');
                const items = decorItems[category];

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎨 Decoration Shop')
                    .setDescription(`Available ${category} items:`);

                for (const [item, data] of Object.entries(items)) {
                    let stats = `Cost: ${data.cost} coins\n`;
                    if (data.comfort) stats += `Comfort: +${data.comfort}\n`;
                    if (data.utility) stats += `Utility: +${data.utility}\n`;
                    if (data.style) stats += `Style: +${data.style}`;

                    embed.addFields({
                        name: item,
                        value: stats,
                        inline: true
                    });
                }

                const buttons = Object.keys(items).map(item => {
                    return new ButtonBuilder()
                        .setCustomId(`buy_${category}_${item}`)
                        .setLabel(`Buy ${item}`)
                        .setStyle(ButtonStyle.Primary);
                });

                const rows = [];
                for (let i = 0; i < buttons.length; i += 3) {
                    rows.push(
                        new ActionRowBuilder()
                            .addComponents(buttons.slice(i, i + 3))
                    );
                }

                await interaction.editReply({
                    embeds: [embed],
                    components: rows
                });

            } else if (subcommand === 'place') {
                if (player.housing.decorations.inventory.length === 0) {
                    await interaction.editReply({
                        content: '❌ You don\'t have any decorations to place!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🎨 Place Decorations')
                    .setDescription('Select a room and decoration to place:');

                // Group decorations by room
                const placedByRoom = {};
                for (const [roomId, decorations] of Object.entries(player.housing.decorations.placed)) {
                    const room = player.housing.rooms.find(r => r.id === roomId);
                    if (room) {
                        placedByRoom[room.type] = decorations;
                    }
                }

                player.housing.rooms.forEach(room => {
                    const decorations = placedByRoom[room.type] || [];
                    embed.addFields({
                        name: `${room.type}`,
                        value: decorations.length > 0 ? 
                            decorations.map(d => d.item).join(', ') : 
                            'No decorations',
                        inline: true
                    });
                });

                const buttons = player.housing.rooms.map(room => {
                    return new ButtonBuilder()
                        .setCustomId(`decorate_${room.type}`)
                        .setLabel(`Decorate ${room.type}`)
                        .setStyle(ButtonStyle.Primary);
                });

                const row = new ActionRowBuilder()
                    .addComponents(buttons);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

            } else if (subcommand === 'view') {
                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🏠 House Decorations')
                    .setDescription('Your current decorations:');

                // Calculate total stats
                let totalStyle = 0;
                let totalComfort = 0;
                let totalUtility = 0;

                for (const [roomId, decorations] of Object.entries(player.housing.decorations.placed)) {
                    const room = player.housing.rooms.find(r => r.id === roomId);
                    if (room) {
                        let roomStats = {
                            style: 0,
                            comfort: 0,
                            utility: 0
                        };

                        decorations.forEach(d => {
                            const item = decorItems[d.category][d.item];
                            if (item) {
                                roomStats.style += item.style || 0;
                                roomStats.comfort += item.comfort || 0;
                                roomStats.utility += item.utility || 0;
                            }
                        });

                        totalStyle += roomStats.style;
                        totalComfort += roomStats.comfort;
                        totalUtility += roomStats.utility;

                        embed.addFields({
                            name: room.type,
                            value: `Decorations: ${decorations.map(d => d.item).join(', ')}\nStyle: +${roomStats.style}\nComfort: +${roomStats.comfort}\nUtility: +${roomStats.utility}`,
                            inline: true
                        });
                    }
                }

                embed.addFields({
                    name: '📊 Total Stats',
                    value: `Style: ${totalStyle}\nComfort: ${totalComfort}\nUtility: ${totalUtility}`,
                    inline: false
                });

                // Show inventory
                if (player.housing.decorations.inventory.length > 0) {
                    embed.addFields({
                        name: '📦 Storage',
                        value: player.housing.decorations.inventory.map(item => item.item).join(', '),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in decorate command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing decorations.',
                ephemeral: true
            });
        }
    },
};
