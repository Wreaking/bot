const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('🏪 Access the player-driven marketplace')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List an item for sale')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Price in gold')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Amount to sell')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy items from the market')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to buy')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Amount to buy')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse available items')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Item category to browse')
                        .addChoices(
                            { name: '⚔️ Weapons', value: 'weapons' },
                            { name: '🛡️ Armor', value: 'armor' },
                            { name: '🧪 Potions', value: 'potions' },
                            { name: '📜 Scrolls', value: 'scrolls' },
                            { name: '💎 Gems', value: 'gems' },
                            { name: '🧱 Materials', value: 'materials' }
                        ))),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Market command not yet implemented.');
    },
};
