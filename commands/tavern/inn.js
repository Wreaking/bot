const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inn')
        .setDescription('🏠 Visit the local inn for rest and information')
        .addSubcommand(subcommand =>
            subcommand
                .setName('rest')
                .setDescription('Rest to recover HP and MP quickly')
                .addIntegerOption(option =>
                    option.setName('hours')
                        .setDescription('Hours to rest')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('gossip')
                .setDescription('Listen to local gossip for quest hints'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feast')
                .setDescription('Buy a feast for temporary stat boosts')
                .addStringOption(option =>
                    option.setName('meal')
                        .setDescription('Type of feast')
                        .setRequired(true)
                        .addChoices(
                            { name: '🍖 Hunter\'s Feast', value: 'hunter' },
                            { name: '🍜 Mage\'s Meal', value: 'mage' },
                            { name: '🍗 Warrior\'s Platter', value: 'warrior' },
                            { name: '🥘 Royal Banquet', value: 'royal' }
                        ))),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Inn command not yet implemented.');
    },
};
