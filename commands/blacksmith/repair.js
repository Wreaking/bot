const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const repairCosts = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100,
    legendary: 200
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('repair')
        .setDescription('🔨 Repair your equipment at the blacksmith')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to repair')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const itemName = interaction.options.getString('item');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player || !player.inventory) {
                await interaction.editReply({
                    content: '❌ You don\'t have any items to repair!',
                    ephemeral: true
                });
                return;
            }

            const item = player.inventory.equipment?.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (!item) {
                await interaction.editReply({
                    content: '❌ You don\'t own this item!',
                    ephemeral: true
                });
                return;
            }

            const durabilityPercent = (item.durability / item.maxDurability) * 100;
            if (durabilityPercent >= 100) {
                await interaction.editReply({
                    content: '✨ This item is already in perfect condition!',
                    ephemeral: true
                });
                return;
            }

            const repairCost = repairCosts[item.rarity] || 50;
            const totalCost = Math.ceil(repairCost * (1 - durabilityPercent/100));

            if (player.coins < totalCost) {
                await interaction.editReply({
                    content: `❌ You need ${totalCost} coins to repair this item!`,
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#FF9900')
                .setTitle('🔨 Blacksmith Repair Service')
                .setDescription(`Repair ${item.name}?`)
                .addFields(
                    { name: 'Current Durability', value: `${Math.floor(durabilityPercent)}%`, inline: true },
                    { name: 'Repair Cost', value: `${totalCost} coins`, inline: true },
                    { name: 'Final Durability', value: '100%', inline: true }
                );

            const confirm = new ButtonBuilder()
                .setCustomId('repair_confirm')
                .setLabel('Repair')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔨');

            const cancel = new ButtonBuilder()
                .setCustomId('repair_cancel')
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

                if (confirmation.customId === 'repair_confirm') {
                    // Update item durability and player coins
                    item.durability = item.maxDurability;
                    player.coins -= totalCost;

                    await db.updatePlayer(userId, player);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✨ Item Repaired!')
                        .setDescription(`Your ${item.name} has been fully repaired!`)
                        .addFields(
                            { name: 'New Durability', value: '100%', inline: true },
                            { name: 'Remaining Coins', value: `${player.coins}`, inline: true }
                        );

                    await confirmation.update({
                        embeds: [successEmbed],
                        components: []
                    });
                } else {
                    await confirmation.update({
                        content: '❌ Repair cancelled.',
                        embeds: [],
                        components: []
                    });
                }
            } catch (e) {
                await interaction.editReply({
                    content: '❌ Repair offer expired.',
                    embeds: [],
                    components: []
                });
            }

        } catch (error) {
            console.error('Error in repair command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while repairing the item.',
                ephemeral: true
            });
        }
    },
};
