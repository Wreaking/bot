const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('house')
        .setDescription('🏠 Manage your player house')
        .addSubcommand(subcommand =>
            subcommand
                .setName('build')
                .setDescription('Build or upgrade your house')
                .addStringOption(option =>
                    option.setName('style')
                        .setDescription('House style')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏡 Cozy Cottage', value: 'cottage' },
                            { name: '🏰 Noble Manor', value: 'manor' },
                            { name: '🗼 Wizard Tower', value: 'tower' },
                            { name: '⛲ Royal Palace', value: 'palace' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('decorate')
                .setDescription('Decorate your house')
                .addStringOption(option =>
                    option.setName('room')
                        .setDescription('Room to decorate')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('theme')
                        .setDescription('Decoration theme')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏺 Ancient', value: 'ancient' },
                            { name: '🌟 Magical', value: 'magical' },
                            { name: '👑 Royal', value: 'royal' },
                            { name: '🌿 Natural', value: 'natural' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('storage')
                .setDescription('Manage house storage')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Storage action')
                        .setRequired(true)
                        .addChoices(
                            { name: '📥 Store Items', value: 'store' },
                            { name: '📤 Retrieve Items', value: 'retrieve' },
                            { name: '📋 View Storage', value: 'view' }
                        ))),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Housing system coming soon!');
    },
};
