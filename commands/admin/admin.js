const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands for managing treasure hunts')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('create_hunt')
                .setDescription('Create a new treasure hunt')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the treasure hunt')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description of the treasure hunt')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add_clue')
                .setDescription('Add a clue to a hunt')
                .addStringOption(option =>
                    option.setName('hunt_id')
                        .setDescription('The hunt ID to add the clue to')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('clue')
                        .setDescription('The clue text')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('answer')
                        .setDescription('The answer to the clue')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('hint')
                        .setDescription('Optional hint for the clue')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('schedule_event')
                .setDescription('Schedule a treasure hunt event')
                .addStringOption(option =>
                    option.setName('hunt_id')
                        .setDescription('The hunt ID to schedule')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('start_time')
                        .setDescription('When the event should start (ISO format)')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('end_time')
                        .setDescription('When the event should end (ISO format)')
                        .setRequired(true))),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create_hunt':
                // Handle hunt creation
                break;
            case 'add_clue':
                // Handle adding clue
                break;
            case 'schedule_event':
                // Handle event scheduling
                break;
        }
    },
};
