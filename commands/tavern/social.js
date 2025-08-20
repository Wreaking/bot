const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tavern')
        .setDescription('🍺 Visit the tavern for drinks, games, and information')
        .addSubcommand(subcommand =>
            subcommand
                .setName('order')
                .setDescription('Order a drink')
                .addStringOption(option =>
                    option.setName('drink')
                        .setDescription('What to order')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ale', value: 'ale' },
                            { name: 'Mead', value: 'mead' },
                            { name: 'Wine', value: 'wine' },
                            { name: 'Special Brew', value: 'special' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('gamble')
                .setDescription('Play dice with other patrons')
                .addIntegerOption(option =>
                    option.setName('bet')
                        .setDescription('How much gold to bet')
                        .setRequired(true)
                        .setMinValue(10)
                        .setMaxValue(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('rumors')
                .setDescription('Listen for rumors and quest leads')),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize tavern data if it doesn't exist
            if (!player.tavern) {
                player.tavern = {
                    reputation: 0,
                    drinks: 0,
                    lastDrink: 0,
                    winStreak: 0
                };
            }

            if (subcommand === 'order') {
                const drink = interaction.options.getString('drink');
                const currentTime = Date.now();
                const drinkCooldown = 300000; // 5 minutes

                if (currentTime - player.tavern.lastDrink < drinkCooldown) {
                    const remainingTime = Math.ceil((drinkCooldown - (currentTime - player.tavern.lastDrink)) / 60000);
                    await interaction.editReply({
                        content: `⏳ You need to wait ${remainingTime} more minutes before ordering another drink.`,
                        ephemeral: true
                    });
                    return;
                }

                const drinks = {
                    ale: { cost: 20, effect: 'stamina', value: 10 },
                    mead: { cost: 35, effect: 'luck', value: 5 },
                    wine: { cost: 50, effect: 'charisma', value: 8 },
                    special: { cost: 100, effect: 'random', value: 15 }
                };

                const selectedDrink = drinks[drink];

                if (player.gold < selectedDrink.cost) {
                    await interaction.editReply({
                        content: `❌ You need ${selectedDrink.cost} gold to order that!`,
                        ephemeral: true
                    });
                    return;
                }

                player.gold -= selectedDrink.cost;
                player.tavern.drinks += 1;
                player.tavern.lastDrink = currentTime;

                // Apply drink effects
                let effectDescription = '';
                if (selectedDrink.effect === 'stamina') {
                    player.stamina = Math.min(player.maxStamina || 100, player.stamina + selectedDrink.value);
                    effectDescription = `Restored ${selectedDrink.value} stamina`;
                } else if (selectedDrink.effect === 'luck') {
                    player.tempStats = player.tempStats || {};
                    player.tempStats.luck = (player.tempStats.luck || 0) + selectedDrink.value;
                    effectDescription = `+${selectedDrink.value} luck for 30 minutes`;
                } else if (selectedDrink.effect === 'charisma') {
                    player.tempStats = player.tempStats || {};
                    player.tempStats.charisma = (player.tempStats.charisma || 0) + selectedDrink.value;
                    effectDescription = `+${selectedDrink.value} charisma for 30 minutes`;
                } else if (selectedDrink.effect === 'random') {
                    const effects = ['gold', 'experience', 'stamina', 'reputation'];
                    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                    
                    switch (randomEffect) {
                        case 'gold':
                            player.gold += selectedDrink.value * 2;
                            effectDescription = `Found ${selectedDrink.value * 2} gold in your drink!`;
                            break;
                        case 'experience':
                            player.experience += selectedDrink.value * 5;
                            effectDescription = `Gained ${selectedDrink.value * 5} experience`;
                            break;
                        case 'stamina':
                            player.stamina = Math.min(player.maxStamina || 100, player.stamina + selectedDrink.value * 2);
                            effectDescription = `Restored ${selectedDrink.value * 2} stamina`;
                            break;
                        case 'reputation':
                            player.tavern.reputation += 2;
                            effectDescription = `Gained 2 tavern reputation`;
                            break;
                    }
                }

                // Increase reputation for frequent customers
                if (player.tavern.drinks % 10 === 0) {
                    player.tavern.reputation += 1;
                }

                await db.updatePlayer(userId, player);

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🍺 Drink Up!')
                    .setDescription(`You ordered a ${drink}!`)
                    .addFields(
                        { name: 'Effect', value: effectDescription, inline: true },
                        { name: 'Remaining Gold', value: player.gold.toString(), inline: true },
                        { name: 'Tavern Reputation', value: player.tavern.reputation.toString(), inline: true }
                    );

                await interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'gamble') {
                const bet = interaction.options.getInteger('bet');

                if (player.gold < bet) {
                    await interaction.editReply({
                        content: `❌ You don't have ${bet} gold to bet!`,
                        ephemeral: true
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🎲 Tavern Dice')
                    .setDescription(`Bet ${bet} gold on a game of dice?`)
                    .addFields(
                        { name: 'Current Gold', value: player.gold.toString(), inline: true },
                        { name: 'Win Streak', value: player.tavern.winStreak.toString(), inline: true }
                    );

                const roll = new ButtonBuilder()
                    .setCustomId('dice_roll')
                    .setLabel('Roll Dice')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎲');

                const cancel = new ButtonBuilder()
                    .setCustomId('dice_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(roll, cancel);

                const response = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });

                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await response.awaitMessageComponent({ filter, time: 30000 });

                    if (confirmation.customId === 'dice_roll') {
                        const playerRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
                        const tavernRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

                        let result;
                        if (playerRoll > tavernRoll) {
                            result = {
                                outcome: 'win',
                                gold: Math.floor(bet * 1.5),
                                color: '#00FF00'
                            };
                            player.tavern.winStreak += 1;
                        } else if (playerRoll < tavernRoll) {
                            result = {
                                outcome: 'lose',
                                gold: -bet,
                                color: '#FF0000'
                            };
                            player.tavern.winStreak = 0;
                        } else {
                            result = {
                                outcome: 'tie',
                                gold: 0,
                                color: '#FFFF00'
                            };
                        }

                        player.gold += result.gold;

                        // Bonus for high win streaks
                        if (player.tavern.winStreak >= 3) {
                            const bonus = Math.floor(bet * 0.2);
                            player.gold += bonus;
                            result.gold += bonus;
                        }

                        await db.updatePlayer(userId, player);

                        const resultEmbed = new EmbedBuilder()
                            .setColor(result.color)
                            .setTitle('🎲 Dice Roll Results')
                            .setDescription(result.outcome === 'win' ? 'You won!' : 
                                          result.outcome === 'lose' ? 'You lost!' : 'It\'s a tie!')
                            .addFields(
                                { name: 'Your Roll', value: playerRoll.toString(), inline: true },
                                { name: 'Tavern Roll', value: tavernRoll.toString(), inline: true },
                                { name: 'Gold Change', value: (result.gold >= 0 ? '+' : '') + result.gold.toString(), inline: true },
                                { name: 'New Balance', value: player.gold.toString(), inline: true },
                                { name: 'Win Streak', value: player.tavern.winStreak.toString(), inline: true }
                            );

                        if (player.tavern.winStreak >= 3) {
                            resultEmbed.addFields({
                                name: '🌟 Win Streak Bonus!',
                                value: `+${Math.floor(bet * 0.2)} gold`,
                                inline: true
                            });
                        }

                        await confirmation.update({
                            embeds: [resultEmbed],
                            components: []
                        });
                    } else {
                        await confirmation.update({
                            content: '❌ Bet cancelled.',
                            embeds: [],
                            components: []
                        });
                    }
                } catch (e) {
                    await interaction.editReply({
                        content: '❌ Bet expired.',
                        embeds: [],
                        components: []
                    });
                }

            } else if (subcommand === 'rumors') {
                const baseRumors = [
                    'A merchant caravan was spotted heading to the desert oasis...',
                    'The mountain mines have been producing unusual gems lately...',
                    'Strange lights were seen in the forest at night...',
                    'The coastal fishermen report seeing mysterious ships...'
                ];

                // Special rumors for higher reputation
                const specialRumors = [
                    'There\'s word of a secret dungeon beneath the mountains...',
                    'A legendary weapon is said to be hidden in the ancient forest...',
                    'Pirates have been spotted with a map to buried treasure...',
                    'A powerful magic artifact was stolen from the wizard\'s tower...'
                ];

                let availableRumors = [...baseRumors];
                if (player.tavern.reputation >= 5) {
                    availableRumors = availableRumors.concat(specialRumors);
                }

                // Select random rumors based on reputation
                const numRumors = Math.min(Math.floor(player.tavern.reputation / 2) + 1, 3);
                const selectedRumors = availableRumors
                    .sort(() => Math.random() - 0.5)
                    .slice(0, numRumors)
                    .join('\n\n');

                const embed = new EmbedBuilder()
                    .setColor('#8B4513')
                    .setTitle('🗣️ Tavern Rumors')
                    .setDescription('Here\'s what you hear at the bar:')
                    .addFields({
                        name: '📢 Latest News',
                        value: selectedRumors,
                        inline: false
                    });

                if (player.tavern.reputation < 5) {
                    embed.addFields({
                        name: '💫 Tip',
                        value: 'Increase your tavern reputation to hear more interesting rumors!',
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in tavern command:', error);
            await interaction.editReply({
                content: '❌ An error occurred in the tavern.',
                ephemeral: true
            });
        }
    },
};
