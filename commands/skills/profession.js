const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profession')
        .setDescription('🛠️ Manage and level up your professions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('train')
                .setDescription('Train a profession')
                .addStringOption(option =>
                    option.setName('profession')
                        .setDescription('Choose profession')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚒️ Mining', value: 'mining' },
                            { name: '🌿 Herbalism', value: 'herbalism' },
                            { name: '⚔️ Blacksmithing', value: 'blacksmithing' },
                            { name: '🧪 Alchemy', value: 'alchemy' },
                            { name: '✨ Enchanting', value: 'enchanting' },
                            { name: '🎣 Fishing', value: 'fishing' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check profession levels and progress'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recipes')
                .setDescription('View available recipes')
                .addStringOption(option =>
                    option.setName('profession')
                        .setDescription('Choose profession')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚒️ Mining', value: 'mining' },
                            { name: '🌿 Herbalism', value: 'herbalism' },
                            { name: '⚔️ Blacksmithing', value: 'blacksmithing' },
                            { name: '🧪 Alchemy', value: 'alchemy' },
                            { name: '✨ Enchanting', value: 'enchanting' },
                            { name: '🎣 Fishing', value: 'fishing' }
                        ))),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Profession system coming soon!');
    },
};
