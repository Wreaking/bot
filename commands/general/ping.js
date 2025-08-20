const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and response time'),
    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle('🏓 Pong!')
            .addFields([
                { name: 'Bot Latency', value: `${timeDiff}ms`, inline: true },
                { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
                { name: 'Status', value: '✅ Online', inline: true }
            ])
            .setTimestamp()
            .setFooter({ text: 'RPG Treasure Hunter Bot' });

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};