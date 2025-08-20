const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mount')
        .setDescription('🐎 Manage and use your mounts for faster travel')
        .addSubcommand(subcommand =>
            subcommand
                .setName('summon')
                .setDescription('Summon your mount')
                .addStringOption(option =>
                    option.setName('mount')
                        .setDescription('Which mount to summon')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feed')
                .setDescription('Feed your mount to maintain its happiness')
                .addStringOption(option =>
                    option.setName('food')
                        .setDescription('Type of food')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌾 Hay', value: 'hay' },
                            { name: '🥕 Carrots', value: 'carrots' },
                            { name: '🍎 Apples', value: 'apples' },
                            { name: '✨ Magic Feed', value: 'magic' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('train')
                .setDescription('Train your mount to improve its stats')
                .addStringOption(option =>
                    option.setName('skill')
                        .setDescription('Skill to train')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏃 Speed', value: 'speed' },
                            { name: '💪 Stamina', value: 'stamina' },
                            { name: '🛡️ Defense', value: 'defense' },
                            { name: '🎯 Agility', value: 'agility' }
                        ))),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Mount command not yet implemented.');
    },
};
