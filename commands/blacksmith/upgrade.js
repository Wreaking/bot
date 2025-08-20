const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

const upgradeMaterials = {
    common: { gold: 50, iron: 2 },
    uncommon: { gold: 100, iron: 4, gem: 1 },
    rare: { gold: 200, iron: 8, gem: 2 },
    epic: { gold: 400, iron: 16, gem: 4, crystal: 1 },
    legendary: { gold: 800, iron: 32, gem: 8, crystal: 2 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('⚔️ Upgrade your weapons and armor')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to upgrade')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const itemName = interaction.options.getString('item');
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player || !player.inventory) {
                await interaction.editReply({
                    content: '❌ You don\'t have any items to upgrade!',
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

            if (item.level >= 10) {
                await interaction.editReply({
                    content: '✨ This item is already at maximum level!',
                    ephemeral: true
                });
                return;
            }

            const materials = upgradeMaterials[item.rarity];
            const missingMaterials = [];
            
            for (const [material, amount] of Object.entries(materials)) {
                const playerAmount = player.inventory.materials?.[material] || 0;
                if (playerAmount < amount) {
                    missingMaterials.push(`${material} (${playerAmount}/${amount})`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor('#9932CC')
                .setTitle('⚔️ Blacksmith Upgrade Service')
                .setDescription(`Upgrade ${item.name} to level ${item.level + 1}?`)
                .addFields(
                    { name: 'Current Level', value: item.level.toString(), inline: true },
                    { name: 'Success Rate', value: `${Math.max(100 - item.level * 10, 50)}%`, inline: true },
                    { name: 'Required Materials', value: Object.entries(materials)
                        .map(([mat, amt]) => `${mat}: ${amt}`).join('\n'), inline: false }
                );

            if (missingMaterials.length > 0) {
                embed.addFields({
                    name: '❌ Missing Materials',
                    value: missingMaterials.join('\n'),
                    inline: false
                });

                await interaction.editReply({
                    embeds: [embed]
                });
                return;
            }

            const confirm = new ButtonBuilder()
                .setCustomId('upgrade_confirm')
                .setLabel('Upgrade')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⚔️');

            const cancel = new ButtonBuilder()
                .setCustomId('upgrade_cancel')
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

                if (confirmation.customId === 'upgrade_confirm') {
                    // Remove materials
                    for (const [material, amount] of Object.entries(materials)) {
                        player.inventory.materials[material] -= amount;
                    }

                    // Attempt upgrade
                    const successRate = Math.max(100 - item.level * 10, 50);
                    const success = Math.random() * 100 <= successRate;

                    if (success) {
                        item.level += 1;
                        item.attack = Math.floor(item.attack * 1.2);
                        item.defense = Math.floor(item.defense * 1.2);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('✨ Upgrade Successful!')
                            .setDescription(`Your ${item.name} is now level ${item.level}!`)
                            .addFields(
                                { name: 'New Attack', value: item.attack.toString(), inline: true },
                                { name: 'New Defense', value: item.defense.toString(), inline: true }
                            );

                        await db.updatePlayer(userId, player);
                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        const failEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('💔 Upgrade Failed')
                            .setDescription('The upgrade attempt was unsuccessful.')
                            .addFields({
                                name: 'Materials Lost',
                                value: Object.entries(materials)
                                    .map(([mat, amt]) => `${mat}: ${amt}`).join('\n'),
                                inline: false
                            });

                        await db.updatePlayer(userId, player);
                        await confirmation.update({
                            embeds: [failEmbed],
                            components: []
                        });
                    }
                } else {
                    await confirmation.update({
                        content: '❌ Upgrade cancelled.',
                        embeds: [],
                        components: []
                    });
                }
            } catch (e) {
                await interaction.editReply({
                    content: '❌ Upgrade offer expired.',
                    embeds: [],
                    components: []
                });
            }

        } catch (error) {
            console.error('Error in upgrade command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while upgrading the item.',
                ephemeral: true
            });
        }
    },
};
