const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('garden')
        .setDescription('🌱 Tend to your magical garden')
        .addSubcommand(subcommand =>
            subcommand
                .setName('plant')
                .setDescription('Plant new magical seeds')
                .addStringOption(option =>
                    option.setName('seed')
                        .setDescription('Type of seed to plant')
                        .setRequired(true)
                        .addChoices(
                            { name: '🌹 Rose of Life', value: 'rose' },
                            { name: '🍎 Golden Apple', value: 'apple' },
                            { name: '🌿 Mana Herb', value: 'herb' },
                            { name: '🍄 Mystic Mushroom', value: 'mushroom' },
                            { name: '🌺 Dream Flower', value: 'flower' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('water')
                .setDescription('Water your plants')
                .addStringOption(option =>
                    option.setName('plot')
                        .setDescription('Which plot to water')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('harvest')
                .setDescription('Harvest mature plants')
                .addStringOption(option =>
                    option.setName('plot')
                        .setDescription('Which plot to harvest')
                        .setRequired(true))),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Garden command not yet implemented.');
    },
};
