
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('drink')
        .setDescription('🍺 Order drinks at the tavern for temporary buffs!')
        .addStringOption(option =>
            option.setName('beverage')
                .setDescription('Choose your drink')
                .setRequired(false)
                .addChoices(
                    { name: '🍺 Ale - Strength +2 (10 coins)', value: 'ale' },
                    { name: '🍷 Wine - Intelligence +2 (15 coins)', value: 'wine' },
                    { name: '🥃 Whiskey - Courage +3 (20 coins)', value: 'whiskey' },
                    { name: '☕ Coffee - Energy +1 (5 coins)', value: 'coffee' },
                    { name: '🧪 Mystery Potion - Random Effect (25 coins)', value: 'mystery' }
                )),

    async execute(interaction) {
        try {
            const beverage = interaction.options.getString('beverage');
            
            if (!beverage) {
                await this.showTavernMenu(interaction);
                return;
            }
            
            await this.orderDrink(interaction, beverage);
        } catch (error) {
            console.error('Error in drink command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your drink order.',
                ephemeral: true
            });
        }
    },

    async showTavernMenu(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        const currentCoins = userData?.coins || 0;

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.tavern || '#8B4513')
            .setTitle('🍺 The Rusty Anchor Tavern')
            .setDescription('*Welcome, weary traveler! What can I get you to drink?*')
            .addFields([
                { 
                    name: '🍺 Ale', 
                    value: '**10 coins** - Strength +2 (30min)\n*Perfect for warriors before battle*', 
                    inline: true 
                },
                { 
                    name: '🍷 Wine', 
                    value: '**15 coins** - Intelligence +2 (30min)\n*Favored by scholars and mages*', 
                    inline: true 
                },
                { 
                    name: '🥃 Whiskey', 
                    value: '**20 coins** - Courage +3 (45min)\n*For the boldest adventurers*', 
                    inline: true 
                },
                { 
                    name: '☕ Coffee', 
                    value: '**5 coins** - Energy +1 (60min)\n*Simple but effective*', 
                    inline: true 
                },
                { 
                    name: '🧪 Mystery Potion', 
                    value: '**25 coins** - Random Effect\n*Dare you try the unknown?*', 
                    inline: true 
                },
                { 
                    name: '💰 Your Coins', 
                    value: `${currentCoins.toLocaleString()} coins`, 
                    inline: true 
                }
            ])
            .setFooter({ text: 'Choose wisely! Effects don\'t stack with the same type.' })
            .setTimestamp()
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/tavern_icon.png');

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('drink_ale')
                    .setLabel('Order Ale')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🍺')
                    .setDisabled(currentCoins < 10),
                new ButtonBuilder()
                    .setCustomId('drink_wine')
                    .setLabel('Order Wine')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🍷')
                    .setDisabled(currentCoins < 15),
                new ButtonBuilder()
                    .setCustomId('drink_whiskey')
                    .setLabel('Order Whiskey')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🥃')
                    .setDisabled(currentCoins < 20)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('drink_coffee')
                    .setLabel('Order Coffee')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('☕')
                    .setDisabled(currentCoins < 5),
                new ButtonBuilder()
                    .setCustomId('drink_mystery')
                    .setLabel('Mystery Potion')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🧪')
                    .setDisabled(currentCoins < 25),
                new ButtonBuilder()
                    .setCustomId('tavern_buffs')
                    .setLabel('Check Buffs')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨')
            );

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2]
        });
    },

    async orderDrink(interaction, beverage) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData) {
            await interaction.reply({ 
                content: '❌ Could not retrieve your player data. Try using `/profile` first.', 
                ephemeral: true 
            });
            return;
        }

        const drinks = {
            ale: { name: 'Ale', cost: 10, buff: 'strength', value: 2, duration: 30 * 60 * 1000, emoji: '🍺', description: 'muscles bulge with newfound power' },
            wine: { name: 'Wine', cost: 15, buff: 'intelligence', value: 2, duration: 30 * 60 * 1000, emoji: '🍷', description: 'mind sharpens with clarity' },
            whiskey: { name: 'Whiskey', cost: 20, buff: 'courage', value: 3, duration: 45 * 60 * 1000, emoji: '🥃', description: 'heart fills with bravery' },
            coffee: { name: 'Coffee', cost: 5, buff: 'energy', value: 1, duration: 60 * 60 * 1000, emoji: '☕', description: 'energy surges through your veins' },
            mystery: { name: 'Mystery Potion', cost: 25, buff: 'random', value: Math.floor(Math.random() * 5) + 1, duration: 30 * 60 * 1000, emoji: '🧪', description: 'strange energies course through you' }
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
            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.error || '#FF0000')
                .setTitle('💸 Insufficient Funds')
                .setDescription(`You need **${drink.cost}** coins to order ${drink.emoji} ${drink.name}!`)
                .addFields([
                    { name: '💰 Your Coins', value: `${userData.coins.toLocaleString()}`, inline: true },
                    { name: '💰 Needed', value: `${drink.cost.toLocaleString()}`, inline: true },
                    { name: '💰 Short By', value: `${(drink.cost - userData.coins).toLocaleString()}`, inline: true }
                ])
                .setFooter({ text: 'Try using /work or /daily to earn more coins!' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Check for existing buff conflicts
        const existingBuffs = userData.buffs || [];
        const conflictingBuff = existingBuffs.find(buff => 
            buff.type === drink.buff && buff.expires > Date.now()
        );

        if (conflictingBuff) {
            const remainingTime = Math.ceil((conflictingBuff.expires - Date.now()) / 60000);
            await interaction.reply({
                content: `❌ You already have a ${drink.buff} buff active! It expires in ${remainingTime} minutes.`,
                ephemeral: true
            });
            return;
        }

        // Apply drink effects
        const buffExpiry = Date.now() + drink.duration;
        let finalBuff = drink.buff;
        let finalValue = drink.value;

        // Handle mystery potion random effects
        if (drink.buff === 'random') {
            const randomBuffs = ['strength', 'intelligence', 'courage', 'energy', 'luck'];
            finalBuff = randomBuffs[Math.floor(Math.random() * randomBuffs.length)];
            finalValue = Math.floor(Math.random() * 5) + 1;
        }

        const updatedBuffs = [...existingBuffs.filter(buff => buff.expires > Date.now()), {
            type: finalBuff,
            value: finalValue,
            expires: buffExpiry,
            source: 'tavern',
            drink: drink.name
        }];

        await db.updatePlayer(interaction.user.id, {
            coins: userData.coins - drink.cost,
            buffs: updatedBuffs
        });

        // Create success embed
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle(`${drink.emoji} Drink Served!`)
            .setDescription(`*The bartender slides you a ${drink.name}. You take a sip and feel your ${drink.description}!*`)
            .addFields([
                { name: '💰 Cost', value: `${drink.cost} coins`, inline: true },
                { name: '✨ Effect', value: `${finalBuff} +${finalValue}`, inline: true },
                { name: '⏱️ Duration', value: `${Math.floor(drink.duration / 60000)} minutes`, inline: true },
                { name: '💰 Remaining Coins', value: `${(userData.coins - drink.cost).toLocaleString()}`, inline: true },
                { name: '🎯 Tip', value: 'Use `/inventory` to see all your active buffs!', inline: false }
            ])
            .setTimestamp()
            .setFooter({ text: 'Enjoy your drink responsibly!' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('drink_another')
                    .setLabel('Another Round')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🍻'),
                new ButtonBuilder()
                    .setCustomId('tavern_buffs')
                    .setLabel('Check Buffs')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨'),
                new ButtonBuilder()
                    .setCustomId('tavern_leave')
                    .setLabel('Leave Tavern')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚪')
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    // Button handlers
    buttonHandlers: {
        async ale(interaction) {
            await module.exports.orderDrink(interaction, 'ale');
        },
        async wine(interaction) {
            await module.exports.orderDrink(interaction, 'wine');
        },
        async whiskey(interaction) {
            await module.exports.orderDrink(interaction, 'whiskey');
        },
        async coffee(interaction) {
            await module.exports.orderDrink(interaction, 'coffee');
        },
        async mystery(interaction) {
            await module.exports.orderDrink(interaction, 'mystery');
        },
        async another(interaction) {
            await module.exports.showTavernMenu(interaction);
        },
        async leave(interaction) {
            await interaction.reply({
                content: '🚪 *You leave the tavern feeling refreshed. The cool night air greets you as you step outside.*',
                ephemeral: true
            });
        }
    }
};
