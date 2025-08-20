const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('train')
        .setDescription('🐾 Train your pet to learn new tricks and improve abilities')
        .addStringOption(option =>
            option.setName('skill')
            .setDescription('The skill to train your pet in')
            .setRequired(true)
            .addChoices(
                { name: '🎯 Agility', value: 'agility' },
                { name: '💪 Strength', value: 'strength' },
                { name: '🧠 Intelligence', value: 'intelligence' },
                { name: '❤️ Loyalty', value: 'loyalty' }
            ))
        .addIntegerOption(option =>
            option.setName('duration')
            .setDescription('Training duration in minutes')
            .setRequired(true)),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Training command not yet implemented.');
    },
};
