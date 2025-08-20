const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');
const { handleError } = require('../../utils/errorHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('🏦 Manage your treasure vault and investments')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your bank account'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit coins into your account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to deposit')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw coins from your account')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to withdraw')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invest')
                .setDescription('Invest your coins')
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to invest')
                        .setRequired(true)
                        .setMinValue(1))
                .addStringOption(option =>
                    option.setName('investment')
                        .setDescription('Investment type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Treasure Map Shares (8% - Low Risk)', value: 'treasure_maps' },
                            { name: 'Dragon Hoard Fund (15% - Medium Risk)', value: 'dragon_hoard' },
                            { name: 'Mystic Crystal Mining (25% - High Risk)', value: 'crystal_mining' },
                            { name: 'Ancient Artifact Trading (40% - Very High Risk)', value: 'artifact_trading' }
                        ))),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userProfile = await db.getPlayer(userId);
            
            if (!userProfile) {
                userProfile = {
                    coins: 100,
                    bank: {
                        savings: 0,
                        invested: 0,
                        interestRate: 0.05,
                        investments: {}
                    }
                };
                await db.setPlayer(userId, userProfile);
            }

            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'view':
                    await this.handleView(interaction, userProfile);
                    break;
                case 'deposit':
                    await this.handleDeposit(interaction, userProfile);
                    break;
                case 'withdraw':
                    await this.handleWithdraw(interaction, userProfile);
                    break;
                case 'invest':
                    await this.handleInvest(interaction, userProfile);
                    break;
            }
        } catch (error) {
            await handleError(interaction, error);
        }
    },

    async handleView(interaction, userProfile) {
        const bankAccount = userProfile.bank || { savings: 0, invested: 0, interestRate: 0.05, investments: {} };
        const totalWealth = (userProfile.coins || 0) + bankAccount.savings + bankAccount.invested;

        const embed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('🏦 First National Treasure Bank')
            .setDescription('**"Secure your wealth and watch it grow!"**\n\nSafe storage and investment opportunities for adventurers.')
            .addFields(
                { name: '💰 Wallet', value: `${userProfile.coins || 0} coins`, inline: true },
                { name: '🏦 Savings Account', value: `${bankAccount.savings} coins`, inline: true },
                { name: '📈 Investments', value: `${bankAccount.invested} coins`, inline: true },
                { name: '💎 Total Wealth', value: `${totalWealth} coins`, inline: true },
                { name: '📊 Interest Rate', value: `${(bankAccount.interestRate * 100).toFixed(1)}% daily`, inline: true },
                { name: '🔒 Security Level', value: 'Maximum Protection', inline: true }
            );

        // Investment options
        const investments = [
            { name: 'Treasure Map Shares', return: 0.08, risk: 'Low', min: 100 },
            { name: 'Dragon Hoard Fund', return: 0.15, risk: 'Medium', min: 500 },
            { name: 'Mystic Crystal Mining', return: 0.25, risk: 'High', min: 1000 },
            { name: 'Ancient Artifact Trading', return: 0.40, risk: 'Very High', min: 2000 }
        ];

        embed.addFields({
            name: '📊 Investment Opportunities',
            value: investments.map(inv => 
                `**${inv.name}:** ${(inv.return * 100)}% return (${inv.risk} risk) - Min: ${inv.min} coins`
            ).join('\n'),
            inline: false
        });

        if (Object.keys(bankAccount.investments || {}).length > 0) {
            embed.addFields({
                name: '🎯 Your Active Investments',
                value: Object.entries(bankAccount.investments).map(([type, amount]) => {
                    const inv = investments.find(i => i.name.toLowerCase().replace(/ /g, '_') === type);
                    return `${inv.name}: ${amount} coins (${(inv.return * 100)}% return)`;
                }).join('\n'),
                inline: false
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bank_deposit')
                    .setLabel('Deposit')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId('bank_withdraw')
                    .setLabel('Withdraw')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏦'),
                new ButtonBuilder()
                    .setCustomId('bank_invest')
                    .setLabel('Invest')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📈')
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },

    async handleDeposit(interaction, userProfile) {
        const amount = interaction.options.getInteger('amount');

        if (amount > userProfile.coins) {
            throw new Error('You don\'t have enough coins to deposit that amount!');
        }

        userProfile.coins -= amount;
        userProfile.bank.savings += amount;
        await db.setPlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💰 Deposit Successful')
            .setDescription(`Deposited ${amount} coins into your savings account.`)
            .addFields(
                { name: 'New Wallet Balance', value: `${userProfile.coins} coins`, inline: true },
                { name: 'New Savings Balance', value: `${userProfile.bank.savings} coins`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    },

    async handleWithdraw(interaction, userProfile) {
        const amount = interaction.options.getInteger('amount');

        if (amount > userProfile.bank.savings) {
            throw new Error('You don\'t have enough coins in your savings to withdraw that amount!');
        }

        userProfile.coins += amount;
        userProfile.bank.savings -= amount;
        await db.setPlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏦 Withdrawal Successful')
            .setDescription(`Withdrew ${amount} coins from your savings account.`)
            .addFields(
                { name: 'New Wallet Balance', value: `${userProfile.coins} coins`, inline: true },
                { name: 'New Savings Balance', value: `${userProfile.bank.savings} coins`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    },

    async handleInvest(interaction, userProfile) {
        const amount = interaction.options.getInteger('amount');
        const investmentType = interaction.options.getString('investment');

        if (amount > userProfile.coins) {
            throw new Error('You don\'t have enough coins to make this investment!');
        }

        const investments = {
            treasure_maps: { name: 'Treasure Map Shares', return: 0.08, risk: 'Low', min: 100 },
            dragon_hoard: { name: 'Dragon Hoard Fund', return: 0.15, risk: 'Medium', min: 500 },
            crystal_mining: { name: 'Mystic Crystal Mining', return: 0.25, risk: 'High', min: 1000 },
            artifact_trading: { name: 'Ancient Artifact Trading', return: 0.40, risk: 'Very High', min: 2000 }
        };

        const investment = investments[investmentType];
        if (!investment) {
            throw new Error('Invalid investment type!');
        }

        if (amount < investment.min) {
            throw new Error(`The minimum investment for ${investment.name} is ${investment.min} coins!`);
        }

        userProfile.coins -= amount;
        userProfile.bank.invested += amount;
        userProfile.bank.investments = userProfile.bank.investments || {};
        userProfile.bank.investments[investmentType] = (userProfile.bank.investments[investmentType] || 0) + amount;
        
        await db.setPlayer(interaction.user.id, userProfile);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📈 Investment Successful')
            .setDescription(`Invested ${amount} coins in ${investment.name}`)
            .addFields(
                { name: 'Return Rate', value: `${(investment.return * 100)}%`, inline: true },
                { name: 'Risk Level', value: investment.risk, inline: true },
                { name: 'Investment Amount', value: `${amount} coins`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    },

    async handleButton(interaction) {
        try {
            await interaction.deferUpdate();

            const [action] = interaction.customId.split('_').slice(1);
            const userProfile = await db.getPlayer(interaction.user.id);

            const actionMessages = {
                deposit: 'Use `/bank deposit <amount>` to deposit coins.',
                withdraw: 'Use `/bank withdraw <amount>` to withdraw coins.',
                invest: 'Use `/bank invest` to choose an investment option.'
            };

            const embed = new EmbedBuilder()
                .setColor('#228B22')
                .setTitle(`🏦 ${action.charAt(0).toUpperCase() + action.slice(1)}`)
                .setDescription(actionMessages[action] || 'Use the appropriate command to proceed.');

            await interaction.editReply({
                embeds: [embed],
                components: []
            });
        } catch (error) {
            await handleError(interaction, error);
        }
    }
}