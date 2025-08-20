const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tavern')
        .setDescription('🍺 Visit the tavern for drinks, rumors, and quests')
        .addSubcommand(subcommand =>
            subcommand
                .setName('drink')
                .setDescription('Order a drink')
                .addStringOption(option =>
                    option.setName('beverage')
                        .setDescription('Choose your drink')
                        .setRequired(true)
                        .addChoices(
                            { name: '🍺 Ale (15 coins)', value: 'ale' },
                            { name: '🍷 Wine (25 coins)', value: 'wine' },
                            { name: '🥃 Mead (35 coins)', value: 'mead' },
                            { name: '✨ Special Brew (50 coins)', value: 'special' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rumors')
                .setDescription('Listen to tavern rumors'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('quests')
                .setDescription('Check the quest board')),

    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;
        const userProfile = await db.getPlayer(userId) || {
            coins: 100,
            level: 1,
            experience: 0,
            reputation: 0
        };

        const drinks = {
            ale: { name: 'Ale', cost: 15, effect: '+5 morale, hear local rumors', emoji: '🍺' },
            wine: { name: 'Wine', cost: 25, effect: '+8 morale, chance of extra XP', emoji: '🍷' },
            mead: { name: 'Mead', cost: 35, effect: '+12 morale, temporary reputation boost', emoji: '🥃' },
            special: { name: 'Special Brew', cost: 50, effect: '+20 morale, rare quest opportunity', emoji: '✨' }
        };

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'drink') {
                const choice = interaction.options.getString('beverage');
                const drink = drinks[choice];

                if (userProfile.coins < drink.cost) {
                    await interaction.editReply({
                        content: `❌ You don't have enough coins for ${drink.emoji} ${drink.name}! (Cost: ${drink.cost} coins)`,
                        ephemeral: true
                    });
                    return;
                }

                // Update player's coins and apply effects
                userProfile.coins -= drink.cost;
                let effectMessage = '';

                switch (choice) {
                    case 'ale':
                        effectMessage = 'You feel more sociable! (+5 morale)';
                        break;
                    case 'wine':
                        const extraXP = Math.random() < 0.3 ? 10 : 0;
                        if (extraXP) {
                            userProfile.experience += extraXP;
                            effectMessage = `The wine warms your spirit! (+8 morale, +${extraXP} XP)`;
                        } else {
                            effectMessage = 'The wine warms your spirit! (+8 morale)';
                        }
                        break;
                    case 'mead':
                        userProfile.reputation += 2;
                        effectMessage = 'The sweet mead makes you feel heroic! (+12 morale, +2 temporary reputation)';
                        break;
                    case 'special':
                        effectMessage = 'The mystical brew fills you with power! (+20 morale, special quest available)';
                        // Add special quest logic here
                        break;
                }

                await db.updatePlayer(userId, userProfile);

                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle(`${drink.emoji} Tavern - ${drink.name}`)
                    .setDescription(`You order a ${drink.name} for ${drink.cost} coins.`)
                    .addFields(
                        { name: 'Effect', value: effectMessage, inline: false },
                        { name: 'Remaining Coins', value: userProfile.coins.toString(), inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'rumors') {
                const rumors = [
                    "They say there's a dragon lurking in the northern mountains...",
                    "Word is, the merchant's guild is offering special deals today.",
                    "I heard the blacksmith discovered a new forging technique.",
                    "Mysterious lights have been seen in the ancient forest.",
                    "The king's treasury is overflowing with rare artifacts."
                ];

                const randomRumor = rumors[Math.floor(Math.random() * rumors.length)];
                const embed = new EmbedBuilder()
                    .setColor('#4B0082')
                    .setTitle('🗣️ Tavern Rumors')
                    .setDescription(randomRumor)
                    .setFooter({ text: 'New rumors become available every few hours' });

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'quests') {
                const quests = [
                    { title: 'Pest Control', reward: '50 coins', difficulty: 'Easy' },
                    { title: 'Missing Shipment', reward: '100 coins', difficulty: 'Medium' },
                    { title: 'Monster Hunt', reward: '200 coins', difficulty: 'Hard' }
                ];

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('📜 Quest Board')
                    .setDescription('Available Quests:');

                quests.forEach(quest => {
                    embed.addFields({
                        name: quest.title,
                        value: `Difficulty: ${quest.difficulty}\nReward: ${quest.reward}`,
                        inline: true
                    });
                });

                const acceptButton = new ButtonBuilder()
                    .setCustomId('quest_accept')
                    .setLabel('Accept Quest')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder()
                    .addComponents(acceptButton);

                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }
        } catch (error) {
            console.error('Error in tavern command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    },
};
            { name: 'Wine', cost: 25, effect: '+10 charisma for social interactions' },
            { name: 'Dragon\'s Breath', cost: 50, effect: '+20 courage, unlock brave quests' },
            { name: 'Elven Mead', cost: 75, effect: '+15 wisdom, better treasure insights' }
        ];

        const rumors = [
            "A mysterious cave was discovered near the old oak tree...",
            "The merchant spoke of ancient ruins to the north...",
            "Strange lights were seen dancing in the forbidden forest...",
            "A legendary sword is said to be hidden in the crystal caverns..."
        ];

        const randomRumor = rumors[Math.floor(Math.random() * rumors.length)];

        const embed = new EmbedBuilder()
            .setColor('#DAA520')
            .setTitle('🍺 The Dusty Dragon Tavern')
            .setDescription('**"Welcome, adventurer! Sit by the fire and hear tales of treasure!"**\n\nA cozy place for drinks, stories, and quest information.')
            .addFields(
                { name: '💰 Your Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '⭐ Reputation', value: `${userProfile.reputation || 0} points`, inline: true },
                { name: '🗣️ Latest Rumor', value: `*"${randomRumor}"*`, inline: false }
            );

        drinks.forEach(drink => {
            embed.addFields({
                name: `🍻 ${drink.name}`,
                value: `**Cost:** ${drink.cost} coins\n**Effect:** ${drink.effect}`,
                inline: true
            });
        });

        const drinkButtons = drinks.map((drink, index) => 
            new ButtonBuilder()
                .setCustomId(`tavern_drink_${index}`)
                .setLabel(`Order ${drink.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🍺')
        );

        const questButton = new ButtonBuilder()
            .setCustomId('tavern_quests')
            .setLabel('Check Quest Board')
            .setStyle(ButtonStyle.Success)
            .setEmoji('📝');

        const gossipButton = new ButtonBuilder()
            .setCustomId('tavern_gossip')
            .setLabel('Listen to Gossip')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👂');

        const row1 = new ActionRowBuilder().addComponents(drinkButtons.slice(0, 2));
        const row2 = new ActionRowBuilder().addComponents(drinkButtons.slice(2, 4));
        const row3 = new ActionRowBuilder().addComponents(questButton, gossipButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};