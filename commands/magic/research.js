const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('research')
        .setDescription('📚 Research new spells and magical techniques')
        .addStringOption(option =>
            option.setName('school')
            .setDescription('School of magic to research')
            .setRequired(true)
            .addChoices(
                { name: '🔥 Fire Magic', value: 'fire' },
                { name: '❄️ Ice Magic', value: 'ice' },
                { name: '⚡ Lightning Magic', value: 'lightning' },
                { name: '🌿 Nature Magic', value: 'nature' },
                { name: '🌙 Dark Magic', value: 'dark' },
                { name: '✨ Light Magic', value: 'light' }
            ))
        .addIntegerOption(option =>
            option.setName('duration')
            .setDescription('Research duration in hours')
            .setRequired(true))
        .addBooleanOption(option =>
            option.setName('focus')
            .setDescription('Use focus mode for better results but higher cost')
            .setRequired(false)),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Research command not yet implemented.');
    },
};
