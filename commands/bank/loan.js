const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('💰 Take out or manage a bank loan')
        .addSubcommand(subcommand =>
            subcommand
                .setName('request')
                .setDescription('Request a new loan')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to borrow')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repay')
                .setDescription('Repay your loan')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to repay')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check your loan status')),

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

            const loan = player.loan || { amount: 0, interest: 0.1, nextPayment: null };

            if (subcommand === 'request') {
                const amount = interaction.options.getInteger('amount');
                
                if (loan.amount > 0) {
                    await interaction.editReply({
                        content: '❌ You already have an outstanding loan!',
                        ephemeral: true
                    });
                    return;
                }

                const maxLoan = Math.floor(player.level * 1000);
                if (amount > maxLoan) {
                    await interaction.editReply({
                        content: `❌ Your level only allows loans up to ${maxLoan} coins!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('💰 Loan Request')
                    .setDescription(`Are you sure you want to take a loan of ${amount} coins?`)
                    .addFields(
                        { name: 'Interest Rate', value: `${(loan.interest * 100)}% daily`, inline: true },
                        { name: 'Daily Payment', value: `${Math.ceil(amount * (1 + loan.interest) / 7)} coins`, inline: true },
                        { name: 'Total Repayment', value: `${Math.ceil(amount * (1 + loan.interest))} coins`, inline: true },
                        { name: '⚠️ Warning', value: 'Failing to make payments will result in penalties!', inline: false }
                    );

                const confirm = new ButtonBuilder()
                    .setCustomId('loan_confirm')
                    .setLabel('Accept Loan')
                    .setStyle(ButtonStyle.Primary);

                const cancel = new ButtonBuilder()
                    .setCustomId('loan_cancel')
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

                    if (confirmation.customId === 'loan_confirm') {
                        player.coins += amount;
                        player.loan = {
                            amount: amount,
                            interest: loan.interest,
                            nextPayment: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                            dailyPayment: Math.ceil(amount * (1 + loan.interest) / 7),
                            totalPayment: Math.ceil(amount * (1 + loan.interest))
                        };

                        await db.updatePlayer(userId, player);

                        const successEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('💰 Loan Approved!')
                            .setDescription(`${amount} coins have been added to your account.`)
                            .addFields(
                                { name: 'Daily Payment', value: `${player.loan.dailyPayment} coins`, inline: true },
                                { name: 'Next Payment Due', value: `<t:${Math.floor(player.loan.nextPayment / 1000)}:R>`, inline: true }
                            );

                        await confirmation.update({
                            embeds: [successEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Loan request cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Loan offer expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'repay') {
                if (loan.amount === 0) {
                    await interaction.editReply({
                        content: '✅ You have no outstanding loans!',
                        ephemeral: true
                    });
                    return;
                }

                const amount = Math.min(interaction.options.getInteger('amount'), loan.amount);
                if (player.coins < amount) {
                    await interaction.editReply({
                        content: `❌ You don't have enough coins! You need ${amount} coins.`,
                        ephemeral: true
                    });
                    return;
                }

                player.coins -= amount;
                player.loan.amount -= amount;

                if (player.loan.amount === 0) {
                    player.loan = null;
                    await interaction.editReply({
                        content: '🎉 Congratulations! You\'ve fully repaid your loan!',
                        ephemeral: true
                    });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('💰 Loan Payment')
                        .setDescription(`Successfully paid ${amount} coins towards your loan!`)
                        .addFields(
                            { name: 'Remaining Balance', value: `${player.loan.amount} coins`, inline: true },
                            { name: 'Next Payment Due', value: `<t:${Math.floor(player.loan.nextPayment / 1000)}:R>`, inline: true }
                        );

                    await interaction.editReply({ embeds: [embed] });
                }

                await db.updatePlayer(userId, player);

            } else if (subcommand === 'status') {
                if (loan.amount === 0) {
                    await interaction.editReply({
                        content: '✅ You have no outstanding loans!',
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle('📊 Loan Status')
                    .addFields(
                        { name: 'Outstanding Balance', value: `${loan.amount} coins`, inline: true },
                        { name: 'Daily Payment', value: `${loan.dailyPayment} coins`, inline: true },
                        { name: 'Next Payment Due', value: `<t:${Math.floor(loan.nextPayment / 1000)}:R>`, inline: true },
                        { name: 'Total Remaining', value: `${loan.totalPayment} coins`, inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in loan command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your loan request.',
                ephemeral: true
            });
        }
    },
};
