const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('💸 Transfer coins to another player')
        .addUserOption(option =>
            option.setName('recipient')
                .setDescription('The player to send coins to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of coins to transfer')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const recipient = interaction.options.getUser('recipient');
            const amount = interaction.options.getInteger('amount');
            const userId = interaction.user.id;

            if (recipient.id === userId) {
                await interaction.editReply({
                    content: '❌ You cannot transfer coins to yourself!',
                    ephemeral: true
                });
                return;
            }

            const sender = await db.getPlayer(userId);
            if (!sender) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            if (sender.coins < amount) {
                await interaction.editReply({
                    content: `❌ You don't have enough coins! You need ${amount} coins.`,
                    ephemeral: true
                });
                return;
            }

            // Apply transfer fee
            const fee = Math.ceil(amount * 0.05); // 5% transfer fee
            const totalCost = amount + fee;

            if (sender.coins < totalCost) {
                await interaction.editReply({
                    content: `❌ You need an additional ${fee} coins to cover the transfer fee!`,
                    ephemeral: true
                });
                return;
            }

            const recipientData = await db.getPlayer(recipient.id);
            if (!recipientData) {
                await interaction.editReply({
                    content: '❌ The recipient needs to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('💸 Bank Transfer')
                .setDescription(`Transfer ${amount} coins to ${recipient.username}?`)
                .addFields(
                    { name: 'Amount', value: `${amount} coins`, inline: true },
                    { name: 'Fee (5%)', value: `${fee} coins`, inline: true },
                    { name: 'Total Cost', value: `${totalCost} coins`, inline: true }
                );

            const confirm = new ButtonBuilder()
                .setCustomId('transfer_confirm')
                .setLabel('Confirm Transfer')
                .setStyle(ButtonStyle.Primary);

            const cancel = new ButtonBuilder()
                .setCustomId('transfer_cancel')
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

                if (confirmation.customId === 'transfer_confirm') {
                    // Process transfer
                    sender.coins -= totalCost;
                    recipientData.coins += amount;

                    await db.updatePlayer(userId, sender);
                    await db.updatePlayer(recipient.id, recipientData);

                    // Create transfer records
                    const transfer = {
                        from: userId,
                        to: recipient.id,
                        amount: amount,
                        fee: fee,
                        timestamp: Date.now()
                    };

                    // Add to transfer history if it exists
                    if (!sender.transferHistory) sender.transferHistory = [];
                    if (!recipientData.transferHistory) recipientData.transferHistory = [];
                    
                    sender.transferHistory.push(transfer);
                    recipientData.transferHistory.push(transfer);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ Transfer Successful!')
                        .setDescription(`Successfully transferred ${amount} coins to ${recipient.username}`)
                        .addFields(
                            { name: 'Fee Paid', value: `${fee} coins`, inline: true },
                            { name: 'Your New Balance', value: `${sender.coins} coins`, inline: true }
                        );

                    await confirmation.update({
                        embeds: [successEmbed],
                        components: []
                    });

                    // Notify recipient
                    try {
                        const recipientEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('💰 Transfer Received!')
                            .setDescription(`You received ${amount} coins from ${interaction.user.username}`)
                            .addFields(
                                { name: 'Amount', value: `${amount} coins`, inline: true },
                                { name: 'Your New Balance', value: `${recipientData.coins} coins`, inline: true }
                            );

                        await recipient.send({ embeds: [recipientEmbed] });
                    } catch (dmError) {
                        console.log('Could not send DM to recipient:', dmError);
                    }

                } else {
                    await confirmation.update({
                        content: '❌ Transfer cancelled.',
                        embeds: [],
                        components: []
                    });
                }
            } catch (e) {
                await interaction.editReply({
                    content: '❌ Transfer request expired.',
                    embeds: [],
                    components: []
                });
            }

        } catch (error) {
            console.error('Error in transfer command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the transfer.',
                ephemeral: true
            });
        }
    },
};
