const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

const locations = {
    peaks: {
        name: 'Frozen Peaks',
        emoji: '🏔️',
        loot: ['Ice Crystal', 'Frost Gem', 'Yeti Fur', 'Ancient Scroll'],
        danger: 3,
        minLevel: 5
    },
    desert: {
        name: 'Desert Ruins',
        emoji: '🏜️',
        loot: ['Sand Crystal', 'Ancient Coin', 'Desert Rose', 'Lost Artifact'],
        danger: 2,
        minLevel: 3
    },
    volcano: {
        name: 'Volcanic Islands',
        emoji: '🌋',
        loot: ['Fire Crystal', 'Dragon Scale', 'Obsidian', 'Magma Core'],
        danger: 4,
        minLevel: 8
    },
    forest: {
        name: 'Ancient Forest',
        emoji: '🌲',
        loot: ['Spirit Essence', 'Sacred Wood', 'Mystic Herb', 'Forest Gem'],
        danger: 1,
        minLevel: 1
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('expedition')
        .setDescription('🗺️ Embark on a long expedition to distant lands')
        .addStringOption(option =>
            option.setName('destination')
                .setDescription('Where to explore')
                .setRequired(true)
                .addChoices(
                    { name: '🏔️ Frozen Peaks', value: 'peaks' },
                    { name: '🏜️ Desert Ruins', value: 'desert' },
                    { name: '🌋 Volcanic Islands', value: 'volcano' },
                    { name: '🌲 Ancient Forest', value: 'forest' }
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long to explore (hours)')
                .setRequired(true)
                .addChoices(
                    { name: 'Short (2 hours)', value: 2 },
                    { name: 'Medium (4 hours)', value: 4 },
                    { name: 'Long (8 hours)', value: 8 }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const userId = interaction.user.id;
            const destination = interaction.options.getString('destination');
            const duration = interaction.options.getInteger('duration');
            
            // Get location data
            const location = locations[destination];
            
            // Get player data
            const player = await db.getPlayer(userId) || {
                level: 1,
                inventory: [],
                coins: 100,
                experience: 0,
                currentExpedition: null
            };

            // Check if player is already on an expedition
            if (player.currentExpedition) {
                const expeditionEnd = new Date(player.currentExpedition.endTime);
                if (expeditionEnd > new Date()) {
                    const timeLeft = Math.ceil((expeditionEnd - new Date()) / (1000 * 60 * 60));
                    await interaction.editReply({
                        content: `❌ You're already on an expedition! Return in ${timeLeft} hours.`,
                        ephemeral: true
                    });
                    return;
                }
            }

            // Check player level requirement
            if (player.level < location.minLevel) {
                await interaction.editReply({
                    content: `❌ You need to be at least level ${location.minLevel} to explore ${location.name}!`,
                    ephemeral: true
                });
                return;
            }

            // Calculate rewards based on duration and location
            const baseRewards = Math.floor(duration * (1 + location.danger * 0.5));
            const expectedLoot = Math.min(Math.floor(baseRewards * (1 + Math.random())), 5);
            
            // Set up the expedition
            player.currentExpedition = {
                destination: destination,
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + duration * 60 * 60 * 1000).toISOString(),
                expectedLoot: expectedLoot
            };

            await db.updatePlayer(userId, player);

            // Create response embed
            const embed = new EmbedBuilder()
                .setColor('#1E90FF')
                .setTitle(`${location.emoji} Expedition to ${location.name}`)
                .setDescription(`You've embarked on a ${duration}-hour expedition!`)
                .addFields(
                    { name: '⏳ Duration', value: `${duration} hours`, inline: true },
                    { name: '⚔️ Danger Level', value: '⭐'.repeat(location.danger), inline: true },
                    { name: '💎 Potential Loot', value: location.loot.join(', '), inline: false },
                    { name: '📋 Expected Findings', value: `${expectedLoot} items`, inline: true }
                )
                .setFooter({ text: `Return after ${duration} hours to claim your rewards!` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in expedition command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while starting your expedition.',
                ephemeral: true
            });
        }
    },
};
                { name: '🌊 Deep Ocean', value: 'ocean' }
            ))
        .addStringOption(option =>
            option.setName('duration')
            .setDescription('Length of expedition')
            .setRequired(true)
            .addChoices(
                { name: '1 Hour', value: '1h' },
                { name: '4 Hours', value: '4h' },
                { name: '8 Hours', value: '8h' },
                { name: '24 Hours', value: '24h' }
            ))
        .addIntegerOption(option =>
            option.setName('crew')
            .setDescription('Number of crew members to bring (costs gold)')
            .setRequired(false)),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Expedition command not yet implemented.');
    },
};
