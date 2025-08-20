
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('🔄 Convert materials and currencies in your inventory')
        .addSubcommand(subcommand =>
            subcommand
                .setName('material')
                .setDescription('Convert materials to other resources')
                .addStringOption(option =>
                    option.setName('from')
                        .setDescription('Material to convert from')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Iron Ore', value: 'iron_ore' },
                            { name: 'Gems', value: 'gems' },
                            { name: 'Wood', value: 'wood' },
                            { name: 'Herbs', value: 'herbs' },
                            { name: 'Fish', value: 'fish' },
                            { name: 'Stone', value: 'stone' }
                        ))
                .addStringOption(option =>
                    option.setName('to')
                        .setDescription('Material to convert to')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Iron Ingot', value: 'iron_ingot' },
                            { name: 'Rare Crystal', value: 'rare_crystal' },
                            { name: 'Enchanted Plank', value: 'enchanted_plank' },
                            { name: 'Magic Essence', value: 'magic_essence' },
                            { name: 'Premium Bait', value: 'premium_bait' },
                            { name: 'Refined Stone', value: 'refined_stone' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to convert')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('currency')
                .setDescription('Convert between different currencies')
                .addStringOption(option =>
                    option.setName('from')
                        .setDescription('Currency to convert from')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Coins', value: 'coins' },
                            { name: 'Gems', value: 'gems' },
                            { name: 'Guild Points', value: 'guild_points' },
                            { name: 'Arena Tokens', value: 'arena_tokens' }
                        ))
                .addStringOption(option =>
                    option.setName('to')
                        .setDescription('Currency to convert to')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Coins', value: 'coins' },
                            { name: 'Gems', value: 'gems' },
                            { name: 'Guild Points', value: 'guild_points' },
                            { name: 'Arena Tokens', value: 'arena_tokens' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to convert')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rates')
                .setDescription('View current exchange rates and market trends'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('calculator')
                .setDescription('Open conversion calculator')
                .addStringOption(option =>
                    option.setName('mode')
                        .setDescription('Calculator mode')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Basic', value: 'basic' },
                            { name: 'Advanced', value: 'advanced' },
                            { name: 'Bulk', value: 'bulk' }
                        ))),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        
        try {
            switch (subcommand) {
                case 'material':
                    await this.handleMaterialConversion(interaction, userId);
                    break;
                case 'currency':
                    await this.handleCurrencyConversion(interaction, userId);
                    break;
                case 'rates':
                    await this.handleRatesView(interaction, userId);
                    break;
                case 'calculator':
                    await this.handleCalculator(interaction, userId);
                    break;
                default:
                    await this.handleOverview(interaction, userId);
            }
        } catch (error) {
            console.error('Convert command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the conversion.',
                ephemeral: true
            });
        }
    },

    async handleMaterialConversion(interaction, userId) {
        const fromMaterial = interaction.options.getString('from');
        const toMaterial = interaction.options.getString('to');
        const amount = interaction.options.getInteger('amount');
        
        const userProfile = await db.getUser(userId) || { inventory: { coins: 100 }, items: {} };
        const conversionData = this.getConversionData(fromMaterial, toMaterial);
        
        if (!conversionData) {
            return await interaction.reply({
                content: '❌ This conversion is not available. Use `/convert rates` to see available conversions.',
                ephemeral: true
            });
        }

        const requiredAmount = amount * conversionData.ratio;
        const userAmount = userProfile.items?.[fromMaterial] || 0;
        const fee = Math.ceil(conversionData.fee * amount);
        const totalCost = fee;

        if (userAmount < requiredAmount) {
            return await interaction.reply({
                content: `❌ Insufficient materials! You need ${requiredAmount} ${this.getDisplayName(fromMaterial)} but only have ${userAmount}.`,
                ephemeral: true
            });
        }

        if (userProfile.inventory.coins < totalCost) {
            return await interaction.reply({
                content: `❌ Insufficient coins for conversion fee! You need ${totalCost} coins but only have ${userProfile.inventory.coins}.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🔄 Material Conversion Confirmation')
            .setDescription('**Review your conversion details:**')
            .addFields(
                { name: '📦 Converting From', value: `${requiredAmount} ${this.getDisplayName(fromMaterial)}`, inline: true },
                { name: '✨ Converting To', value: `${amount} ${this.getDisplayName(toMaterial)}`, inline: true },
                { name: '💰 Conversion Fee', value: `${fee} coins`, inline: true },
                { name: '📊 Exchange Rate', value: `${conversionData.ratio}:1`, inline: true },
                { name: '⏰ Processing Time', value: `${conversionData.time || 'Instant'}`, inline: true },
                { name: '📈 Market Bonus', value: `${conversionData.bonus || 'None'}`, inline: true }
            );

        const confirmButton = new ButtonBuilder()
            .setCustomId(`convert_confirm_${fromMaterial}_${toMaterial}_${amount}`)
            .setLabel('Confirm Conversion')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const cancelButton = new ButtonBuilder()
            .setCustomId('convert_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    async handleCurrencyConversion(interaction, userId) {
        const fromCurrency = interaction.options.getString('from');
        const toCurrency = interaction.options.getString('to');
        const amount = interaction.options.getInteger('amount');
        
        if (fromCurrency === toCurrency) {
            return await interaction.reply({
                content: '❌ Cannot convert a currency to itself!',
                ephemeral: true
            });
        }

        const userProfile = await db.getUser(userId) || { inventory: { coins: 100 } };
        const exchangeRate = this.getCurrencyExchangeRate(fromCurrency, toCurrency);
        
        const convertedAmount = Math.floor(amount * exchangeRate.rate);
        const fee = Math.ceil(amount * exchangeRate.fee);
        const userAmount = this.getUserCurrencyAmount(userProfile, fromCurrency);

        if (userAmount < amount) {
            return await interaction.reply({
                content: `❌ Insufficient ${this.getDisplayName(fromCurrency)}! You need ${amount} but only have ${userAmount}.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💱 Currency Exchange')
            .setDescription('**Currency conversion details:**')
            .addFields(
                { name: '💰 From', value: `${amount} ${this.getDisplayName(fromCurrency)}`, inline: true },
                { name: '💎 To', value: `${convertedAmount} ${this.getDisplayName(toCurrency)}`, inline: true },
                { name: '📊 Exchange Rate', value: `1:${exchangeRate.rate}`, inline: true },
                { name: '💸 Exchange Fee', value: `${fee} ${this.getDisplayName(fromCurrency)}`, inline: true },
                { name: '📈 Market Status', value: exchangeRate.trend, inline: true },
                { name: '⏰ Rate Valid Until', value: exchangeRate.validUntil, inline: true }
            );

        const confirmButton = new ButtonBuilder()
            .setCustomId(`currency_convert_${fromCurrency}_${toCurrency}_${amount}`)
            .setLabel('Exchange Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💱');

        const row = new ActionRowBuilder().addComponents(confirmButton);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    async handleRatesView(interaction, userId) {
        const materialRates = this.getAllMaterialRates();
        const currencyRates = this.getAllCurrencyRates();
        
        const embed = new EmbedBuilder()
            .setColor('#00CED1')
            .setTitle('📊 Current Exchange Rates & Market Trends')
            .setDescription('**Real-time conversion rates and market analysis**')
            .setTimestamp();

        // Material conversion rates
        let materialRatesText = '';
        Object.entries(materialRates).forEach(([conversion, data]) => {
            const trend = data.trend === 'up' ? '📈' : data.trend === 'down' ? '📉' : '➡️';
            materialRatesText += `${trend} **${conversion}**: ${data.rate}:1 (${data.fee}% fee)\n`;
        });

        embed.addFields({
            name: '🔨 Material Conversions',
            value: materialRatesText || 'No rates available',
            inline: false
        });

        // Currency exchange rates
        let currencyRatesText = '';
        Object.entries(currencyRates).forEach(([pair, data]) => {
            const trend = data.trend === 'up' ? '📈' : data.trend === 'down' ? '📉' : '➡️';
            currencyRatesText += `${trend} **${pair}**: ${data.rate} (${data.fee}% fee)\n`;
        });

        embed.addFields({
            name: '💱 Currency Exchange',
            value: currencyRatesText || 'No rates available',
            inline: false
        });

        embed.addFields(
            { name: '📊 Market Analysis', value: 'Materials are trending up due to high demand\nCurrency exchange is stable', inline: true },
            { name: '💡 Trading Tips', value: 'Best time to convert: Early morning\nWatch for weekend market bonuses', inline: true },
            { name: '⏰ Next Update', value: 'Rates update every 6 hours', inline: true }
        );

        const refreshButton = new ButtonBuilder()
            .setCustomId('rates_refresh')
            .setLabel('Refresh Rates')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄');

        const alertButton = new ButtonBuilder()
            .setCustomId('rates_alert')
            .setLabel('Set Rate Alert')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔔');

        const historyButton = new ButtonBuilder()
            .setCustomId('rates_history')
            .setLabel('View History')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📈');

        const row = new ActionRowBuilder().addComponents(refreshButton, alertButton, historyButton);

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleCalculator(interaction, userId) {
        const mode = interaction.options.getString('mode') || 'basic';
        const userProfile = await db.getUser(userId) || { inventory: { coins: 100 }, items: {} };

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🧮 Conversion Calculator')
            .setDescription(`**${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode**\n\nPlan your conversions and optimize your resources!`)
            .addFields(
                { name: '💰 Current Balance', value: `${userProfile.inventory?.coins || 0} coins`, inline: true },
                { name: '📦 Inventory Items', value: `${Object.keys(userProfile.items || {}).length} types`, inline: true },
                { name: '🔧 Calculator Mode', value: mode, inline: true }
            );

        if (mode === 'basic') {
            embed.addFields({
                name: '🔢 Quick Calculations',
                value: 'Use the buttons below to perform common conversions:',
                inline: false
            });
        } else if (mode === 'advanced') {
            embed.addFields({
                name: '⚙️ Advanced Features',
                value: '• Bulk conversion planning\n• Profit optimization\n• Market timing analysis\n• Resource forecasting',
                inline: false
            });
        }

        const modeSelect = new StringSelectMenuBuilder()
            .setCustomId('calc_mode')
            .setPlaceholder('Select calculator mode...')
            .addOptions([
                { label: 'Basic Calculator', value: 'basic', emoji: '🔢' },
                { label: 'Advanced Calculator', value: 'advanced', emoji: '⚙️' },
                { label: 'Bulk Operations', value: 'bulk', emoji: '📦' },
                { label: 'Profit Optimizer', value: 'optimizer', emoji: '💰' }
            ]);

        const calculatorButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('calc_materials')
                    .setLabel('Material Calculator')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('calc_currency')
                    .setLabel('Currency Calculator')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('💱'),
                new ButtonBuilder()
                    .setCustomId('calc_profit')
                    .setLabel('Profit Calculator')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📈'),
                new ButtonBuilder()
                    .setCustomId('calc_optimize')
                    .setLabel('Optimize All')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚡')
            );

        await interaction.reply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(modeSelect),
                calculatorButtons
            ]
        });
    },

    getConversionData(from, to) {
        const conversions = {
            'iron_ore_iron_ingot': { ratio: 10, fee: 5, time: '5 minutes', bonus: '+5% quality' },
            'gems_rare_crystal': { ratio: 5, fee: 10, time: 'Instant', bonus: '+10% power' },
            'wood_enchanted_plank': { ratio: 20, fee: 15, time: '10 minutes', bonus: 'Magic infused' },
            'herbs_magic_essence': { ratio: 15, fee: 8, time: '3 minutes', bonus: '+20% potency' },
            'fish_premium_bait': { ratio: 8, fee: 12, time: 'Instant', bonus: '+15% catch rate' },
            'stone_refined_stone': { ratio: 12, fee: 7, time: '8 minutes', bonus: 'Higher durability' }
        };
        
        return conversions[`${from}_${to}`];
    },

    getCurrencyExchangeRate(from, to) {
        const rates = {
            'coins_gems': { rate: 0.1, fee: 0.05, trend: '📈 Rising', validUntil: '6 hours' },
            'gems_coins': { rate: 9.5, fee: 0.05, trend: '📉 Falling', validUntil: '6 hours' },
            'coins_guild_points': { rate: 0.5, fee: 0.02, trend: '➡️ Stable', validUntil: '12 hours' },
            'guild_points_coins': { rate: 1.8, fee: 0.02, trend: '➡️ Stable', validUntil: '12 hours' },
            'arena_tokens_coins': { rate: 25, fee: 0.03, trend: '📈 Rising', validUntil: '4 hours' },
            'coins_arena_tokens': { rate: 0.03, fee: 0.03, trend: '📉 Falling', validUntil: '4 hours' }
        };
        
        return rates[`${from}_${to}`] || { rate: 1, fee: 0.1, trend: 'Unknown', validUntil: 'Unknown' };
    },

    getAllMaterialRates() {
        return {
            'Iron Ore → Iron Ingot': { rate: '10', fee: 5, trend: 'up' },
            'Gems → Rare Crystal': { rate: '5', fee: 10, trend: 'stable' },
            'Wood → Enchanted Plank': { rate: '20', fee: 15, trend: 'down' },
            'Herbs → Magic Essence': { rate: '15', fee: 8, trend: 'up' },
            'Fish → Premium Bait': { rate: '8', fee: 12, trend: 'stable' },
            'Stone → Refined Stone': { rate: '12', fee: 7, trend: 'up' }
        };
    },

    getAllCurrencyRates() {
        return {
            'Coins → Gems': { rate: '0.10', fee: 5, trend: 'up' },
            'Gems → Coins': { rate: '9.50', fee: 5, trend: 'down' },
            'Coins → Guild Points': { rate: '0.50', fee: 2, trend: 'stable' },
            'Guild Points → Coins': { rate: '1.80', fee: 2, trend: 'stable' },
            'Arena Tokens → Coins': { rate: '25.0', fee: 3, trend: 'up' },
            'Coins → Arena Tokens': { rate: '0.03', fee: 3, trend: 'down' }
        };
    },

    getDisplayName(key) {
        const names = {
            iron_ore: 'Iron Ore',
            gems: 'Gems',
            wood: 'Wood',
            herbs: 'Herbs',
            fish: 'Fish',
            stone: 'Stone',
            iron_ingot: 'Iron Ingot',
            rare_crystal: 'Rare Crystal',
            enchanted_plank: 'Enchanted Plank',
            magic_essence: 'Magic Essence',
            premium_bait: 'Premium Bait',
            refined_stone: 'Refined Stone',
            coins: 'Coins',
            guild_points: 'Guild Points',
            arena_tokens: 'Arena Tokens'
        };
        return names[key] || key;
    },

    getUserCurrencyAmount(userProfile, currency) {
        switch (currency) {
            case 'coins':
                return userProfile.inventory?.coins || 0;
            case 'gems':
                return userProfile.inventory?.gems || 0;
            case 'guild_points':
                return userProfile.guild?.points || 0;
            case 'arena_tokens':
                return userProfile.arena?.tokens || 0;
            default:
                return 0;
        }
    }
};
