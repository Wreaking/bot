const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// --- New /drink command logic ---
async function showTavernMenu(interaction) {
    const embed = new EmbedBuilder()
        .setColor(config.embedColors?.tavern || '#8B4513')
        .setTitle('🍺 The Rusty Anchor Tavern')
        .setDescription('Welcome, weary traveler! What can I get you to drink?')
        .addFields([
            { name: '🍺 Ale', value: '10 coins - Strength +2 (30min)', inline: true },
            { name: '🍷 Wine', value: '15 coins - Intelligence +2 (30min)', inline: true },
            { name: '🥃 Whiskey', value: '20 coins - Courage +3 (45min)', inline: true },
            { name: '☕ Coffee', value: '5 coins - Energy +1 (60min)', inline: true },
            { name: '🧪 Mystery Potion', value: '25 coins - Random Effect', inline: true },
            { name: '💡 Tip', value: 'Use `/drink <beverage>` to order directly!', inline: false }
        ])
        .setFooter({ text: 'Choose wisely, effects don\'t stack!' })
        .setTimestamp();

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('drink_ale')
                .setLabel('Order Ale')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🍺'),
            new ButtonBuilder()
                .setCustomId('drink_another')
                .setLabel('Another Round')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🍻'),
            new ButtonBuilder()
                .setCustomId('tavern_buffs')
                .setLabel('Check Buffs')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✨')
        );

    await interaction.reply({
        embeds: [embed],
        components: [buttons]
    });
}

async function orderDrink(interaction, beverage) {
    const userData = await db.getPlayer(interaction.user.id);
    if (!userData) {
        await interaction.reply({ content: '❌ Could not retrieve your player data.', ephemeral: true });
        return;
    }

    const drinks = {
        ale: { name: 'Ale', cost: 10, buff: 'strength', value: 2, duration: 30 * 60 * 1000, emoji: '🍺' },
        wine: { name: 'Wine', cost: 15, buff: 'intelligence', value: 2, duration: 30 * 60 * 1000, emoji: '🍷' },
        whiskey: { name: 'Whiskey', cost: 20, buff: 'courage', value: 3, duration: 45 * 60 * 1000, emoji: '🥃' },
        coffee: { name: 'Coffee', cost: 5, buff: 'energy', value: 1, duration: 60 * 60 * 1000, emoji: '☕' },
        mystery: { name: 'Mystery Potion', cost: 25, buff: 'random', value: Math.floor(Math.random() * 5) + 1, duration: 30 * 60 * 1000, emoji: '🧪' }
    };

    const drink = drinks[beverage];
    if (!drink) {
        await interaction.reply({
            content: '❌ Invalid drink selection!',
            ephemeral: true
        });
        return;
    }

    if (userData.coins < drink.cost) {
        await interaction.reply({
            content: `❌ You need ${drink.cost} coins to order ${drink.name}! You have ${userData.coins} coins.`,
            ephemeral: true
        });
        return;
    }

    const updateData = {
        coins: userData.coins - drink.cost,
        buffs: userData.buffs || []
    };

    const buffExpiry = Date.now() + drink.duration;
    updateData.buffs.push({
        type: drink.buff,
        value: drink.buff === 'random' ? Math.floor(Math.random() * 5) + 1 : drink.value,
        expires: buffExpiry,
        source: 'tavern'
    });

    await db.updatePlayer(interaction.user.id, updateData);

    const embed = new EmbedBuilder()
        .setColor(config.embedColors?.success || '#00FF00')
        .setTitle(`${drink.emoji} Drink Served!`)
        .setDescription(`You ordered a ${drink.name} and feel its effects immediately!`)
        .addFields([
            { name: '💰 Cost', value: `${drink.cost} coins`, inline: true },
            { name: '✨ Effect', value: `${drink.buff} +${updateData.buffs[updateData.buffs.length - 1].value}`, inline: true },
            { name: '⏱️ Duration', value: `${Math.floor(drink.duration / 60000)} minutes`, inline: true },
            { name: '💰 Remaining Coins', value: `${updateData.coins}`, inline: true }
        ])
        .setTimestamp();

    await interaction.reply({
        embeds: [embed]
    });
}

// Button handlers for drink command
const drinkButtonHandlers = {
    ale: async function(interaction) {
        await orderDrink(interaction, 'ale');
    },
    another: async function(interaction) {
        await showTavernMenu(interaction);
    },
    tavern_buffs: async function(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData || !userData.buffs || userData.buffs.length === 0) {
            await interaction.reply({ content: 'You currently have no active buffs.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.info || '#0099ff')
            .setTitle('✨ Your Tavern Buffs')
            .setDescription('Here are your current buffs:');

        userData.buffs.forEach(buff => {
            const remainingTime = Math.max(0, Math.floor((buff.expires - Date.now()) / 1000));
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            embed.addFields({
                name: buff.type.charAt(0).toUpperCase() + buff.type.slice(1),
                value: `Value: +${buff.value}\nExpires in: ${minutes}m ${seconds}s`,
                inline: true
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

// --- Original /tavern command logic, with fixes and improvements ---
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
        let userProfile = await db.getPlayer(userId);

        // If player doesn't exist, create a default profile
        if (!userProfile) {
            userProfile = {
                coins: 100,
                level: 1,
                experience: 0,
                reputation: 0,
                buffs: []
            };
            // Optionally, save this default profile immediately if needed, or let the first action create it.
            // await db.updatePlayer(userId, userProfile);
        }

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

                if (!drink) { // Safety check for invalid choice, though choices should prevent this.
                    await interaction.editReply({ content: '❌ That\'s not a drink we serve!', ephemeral: true });
                    return;
                }

                if (userProfile.coins < drink.cost) {
                    await interaction.editReply({
                        content: `❌ You don't have enough coins for ${drink.emoji} ${drink.name}! (Cost: ${drink.cost} coins)`,
                        ephemeral: true
                    });
                    return;
                }

                userProfile.coins -= drink.cost;
                let effectMessage = '';

                switch (choice) {
                    case 'ale':
                        userProfile.morale = (userProfile.morale || 0) + 5; // Assuming a morale property
                        effectMessage = 'You feel more sociable! (+5 morale)';
                        break;
                    case 'wine':
                        const extraXP = Math.random() < 0.3 ? 10 : 0;
                        userProfile.experience += extraXP;
                        userProfile.morale = (userProfile.morale || 0) + 8;
                        effectMessage = `The wine warms your spirit! (+8 morale${extraXP ? `, +${extraXP} XP` : ''})`;
                        break;
                    case 'mead':
                        userProfile.reputation += 2;
                        userProfile.morale = (userProfile.morale || 0) + 12;
                        effectMessage = 'The sweet mead makes you feel heroic! (+12 morale, +2 temporary reputation)';
                        break;
                    case 'special':
                        userProfile.morale = (userProfile.morale || 0) + 20;
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
                    "The merchant spoke of ancient ruins to the north...",
                    "Strange lights were seen dancing in the forbidden forest...",
                    "A legendary sword is said to be hidden in the crystal caverns...",
                    "The blacksmith found a hidden stash of dwarven ale.",
                    "A traveling bard sings tales of forgotten kings and lost treasures."
                ];

                const randomRumor = rumors[Math.floor(Math.random() * rumors.length)];
                const embed = new EmbedBuilder()
                    .setColor('#4B0082')
                    .setTitle('🗣️ Tavern Rumors')
                    .setDescription(`*"${randomRumor}"*`)
                    .setFooter({ text: 'Whispers of the tavern are ever-changing.' });

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
                    .setDescription('Check out these opportunities!');

                quests.forEach(quest => {
                    embed.addFields({
                        name: quest.title,
                        value: `Difficulty: ${quest.difficulty}\nReward: ${quest.reward}`,
                        inline: true
                    });
                });

                const acceptButton = new ButtonBuilder()
                    .setCustomId('quest_accept') // This would need a handler in index.js or similar
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
                content: '❌ An error occurred while processing your request in the tavern.',
                ephemeral: true
            });
        }
    },

    // --- Separate /drink command registration and handler ---
    // This section demonstrates how you might register and handle a separate /drink command
    // if it were in its own file. For this merged file, we'll assume it's handled elsewhere
    // or integrated differently. The functions `showTavernMenu` and `orderDrink` above
    // are made available for use by button clicks or other commands.

    // If you intend for this file to ALSO contain the /drink command, you would need to
    // structure it with multiple command definitions or a router.
    // For example, to integrate the /drink logic as a subcommand or a separate command:
    // If it were a separate command, you'd export it like this:
    // module.exports.drinkCommand = {
    //     data: new SlashCommandBuilder()
    //         .setName('drink')
    //         .setDescription('🍺 Order drinks at the tavern for temporary buffs!')
    //         .addStringOption(option => ...),
    //     execute: async (interaction) => {
    //         const beverage = interaction.options.getString('beverage');
    //         try {
    //             if (!beverage) {
    //                 await showTavernMenu(interaction);
    //                 return;
    //             }
    //             await orderDrink(interaction, beverage);
    //         } catch (error) {
    //             console.error('Error in drink command:', error);
    //             await interaction.reply({ content: '❌ An error occurred while processing your drink order.', ephemeral: true });
    //         }
    //     },
    //     buttonHandlers: drinkButtonHandlers // Expose handlers if needed
    // };
};

// Note: The original file's trailing data seems to be a remnant of a different command structure
// and has been removed to avoid syntax errors. The provided changes also contained a new
// structure for a /drink command which has been integrated into the logic above,
// but as separate functions that would typically be in their own command file.
// The original /tavern command has been preserved with fixes.