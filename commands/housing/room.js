const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('room')
        .setDescription('🏠 Manage your house rooms')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new room to your house')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of room to add')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bedroom', value: 'bedroom' },
                            { name: 'Kitchen', value: 'kitchen' },
                            { name: 'Living Room', value: 'living' },
                            { name: 'Study', value: 'study' },
                            { name: 'Workshop', value: 'workshop' },
                            { name: 'Garden', value: 'garden' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('upgrade')
                .setDescription('Upgrade an existing room'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your house layout')),

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

            // Initialize housing data if it doesn't exist
            if (!player.housing) {
                player.housing = {
                    rooms: [],
                    maxRooms: 4,
                    style: 'cottage'
                };
            }

            const roomCosts = {
                bedroom: { cost: 1000, maxLevel: 3, benefits: 'Increases rest bonus' },
                kitchen: { cost: 1500, maxLevel: 3, benefits: 'Boosts food crafting' },
                living: { cost: 2000, maxLevel: 3, benefits: 'Increases visitor capacity' },
                study: { cost: 2500, maxLevel: 3, benefits: 'Boosts skill learning' },
                workshop: { cost: 3000, maxLevel: 3, benefits: 'Improves crafting success' },
                garden: { cost: 2000, maxLevel: 3, benefits: 'Provides fresh ingredients' }
            };

            if (subcommand === 'add') {
                const roomType = interaction.options.getString('type');

                if (player.housing.rooms.length >= player.housing.maxRooms) {
                    await interaction.editReply({
                        content: '❌ You\'ve reached the maximum number of rooms! Upgrade your house first.',
                        ephemeral: true
                    });
                    return;
                }

                if (player.housing.rooms.some(r => r.type === roomType)) {
                    await interaction.editReply({
                        content: '❌ You already have this type of room!',
                        ephemeral: true
                    });
                    return;
                }

                const roomData = roomCosts[roomType];
                if (player.coins < roomData.cost) {
                    await interaction.editReply({
                        content: `❌ You need ${roomData.cost} coins to build this room!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🏗️ Room Construction')
                    .setDescription(`Build a new ${roomType}?`)
                    .addFields(
                        { name: 'Cost', value: `${roomData.cost} coins`, inline: true },
                        { name: 'Benefits', value: roomData.benefits, inline: true }
                    );

                const confirm = new ButtonBuilder()
                    .setCustomId('room_confirm')
                    .setLabel('Build Room')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏗️');

                const cancel = new ButtonBuilder()
                    .setCustomId('room_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(confirm, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'room_confirm') {
                        player.coins -= roomData.cost;
                        player.housing.rooms.push({
                            type: roomType,
                            level: 1,
                            built: Date.now()
                        });

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('🎉 Room Built!')
                            .setDescription(`Your new ${roomType} has been built!`)
                            .addFields(
                                { name: 'Level', value: '1', inline: true },
                                { name: 'Benefit', value: roomData.benefits, inline: true },
                                { name: 'Remaining Coins', value: player.coins.toString(), inline: true }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Construction cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Construction offer expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'upgrade') {
                if (player.housing.rooms.length === 0) {
                    await interaction.editReply({
                        content: '❌ You don\'t have any rooms to upgrade!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🏗️ Room Upgrades')
                    .setDescription('Select a room to upgrade:');

                player.housing.rooms.forEach(room => {
                    const roomData = roomCosts[room.type];
                    embed.addFields({
                        name: `${room.type} (Level ${room.level})`,
                        value: `Upgrade Cost: ${roomData.cost * room.level} coins\nMax Level: ${roomData.maxLevel}`,
                        inline: true
                    });
                });

                const buttons = player.housing.rooms.map(room => {
                    return new ButtonBuilder()
                        .setCustomId(`upgrade_${room.type}`)
                        .setLabel(`Upgrade ${room.type}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(room.level >= roomCosts[room.type].maxLevel);
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
                    .setTitle('🏠 Your House')
                    .setDescription(`Style: ${player.housing.style}\nRooms: ${player.housing.rooms.length}/${player.housing.maxRooms}`);

                if (player.housing.rooms.length === 0) {
                    embed.addFields({
                        name: '❌ Empty House',
                        value: 'You haven\'t built any rooms yet!',
                        inline: false
                    });
                } else {
                    player.housing.rooms.forEach(room => {
                        const roomData = roomCosts[room.type];
                        embed.addFields({
                            name: `${room.type} (Level ${room.level})`,
                            value: `Built: <t:${Math.floor(room.built / 1000)}:R>\nBenefit: ${roomData.benefits}`,
                            inline: true
                        });
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in room command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing your rooms.',
                ephemeral: true
            });
        }
    },
};
