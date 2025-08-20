
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Room types available at the inn
const ROOM_TYPES = {
    common: {
        name: '🛏️ Common Room',
        cost: 25,
        restBonus: 1.0,
        capacityBonus: 0,
        description: 'Basic shared accommodations with simple bedding',
        amenities: ['Shared bathroom', 'Basic meals included']
    },
    private: {
        name: '🏠 Private Room',
        cost: 75,
        restBonus: 1.5,
        capacityBonus: 10,
        description: 'Your own space with comfortable furnishings',
        amenities: ['Private bathroom', 'Room service', 'Lockable storage']
    },
    luxury: {
        name: '🏰 Luxury Suite',
        cost: 200,
        restBonus: 2.0,
        capacityBonus: 25,
        description: 'Opulent quarters fit for nobility',
        amenities: ['Marble bathroom', '24/7 room service', 'Personal safe', 'Balcony view']
    },
    presidential: {
        name: '👑 Presidential Suite',
        cost: 500,
        restBonus: 3.0,
        capacityBonus: 50,
        description: 'The finest accommodations money can buy',
        amenities: ['Full apartment', 'Personal butler', 'Private dining', 'Magic amenities']
    }
};

// Meal options for the inn
const FEAST_OPTIONS = {
    hunter: {
        name: '🍖 Hunter\'s Feast',
        cost: 50,
        effects: { attack: 15, stamina: 20 },
        duration: 2 * 60 * 60 * 1000, // 2 hours
        description: 'Hearty meats and protein-rich foods boost physical prowess'
    },
    mage: {
        name: '🍜 Mage\'s Meal',
        cost: 60,
        effects: { intelligence: 20, mana_regen: 25 },
        duration: 2 * 60 * 60 * 1000,
        description: 'Mystical herbs and brain foods enhance magical abilities'
    },
    warrior: {
        name: '🍗 Warrior\'s Platter',
        cost: 65,
        effects: { defense: 18, health_regen: 30 },
        duration: 2 * 60 * 60 * 1000,
        description: 'Fortifying dishes that strengthen body and spirit'
    },
    royal: {
        name: '🥘 Royal Banquet',
        cost: 120,
        effects: { all_stats: 12, luck: 25, experience_gain: 15 },
        duration: 3 * 60 * 60 * 1000, // 3 hours
        description: 'An extravagant spread that enhances everything'
    },
    peasant: {
        name: '🍞 Peasant\'s Portion',
        cost: 15,
        effects: { hunger: 100 },
        duration: 1 * 60 * 60 * 1000, // 1 hour
        description: 'Simple but filling fare for the budget-conscious'
    },
    seafood: {
        name: '🦐 Seafood Special',
        cost: 80,
        effects: { agility: 22, water_resistance: 30 },
        duration: 2 * 60 * 60 * 1000,
        description: 'Fresh catch from the harbor with oceanic benefits'
    }
};

// Gossip and information available at the inn
const GOSSIP_TOPICS = [
    {
        topic: '🏴‍☠️ Treasure Maps',
        info: 'A drunk sailor mentioned seeing ancient markings on the cliffs near Dragon\'s Bay...',
        hint: 'exploration'
    },
    {
        topic: '⚔️ Arena Champions',
        info: 'The reigning arena champion has been spotted training at midnight behind the colosseum.',
        hint: 'combat'
    },
    {
        topic: '🔮 Magical Artifacts',
        info: 'Strange lights have been seen emanating from the old wizard tower on stormy nights...',
        hint: 'magic'
    },
    {
        topic: '💰 Market Secrets',
        info: 'Merchants whisper about a secret auction happening in the underground market.',
        hint: 'economy'
    },
    {
        topic: '🌿 Rare Ingredients',
        info: 'The local herbalist mentioned rare moonflowers blooming in the Whispering Woods.',
        hint: 'crafting'
    },
    {
        topic: '👥 Guild Activities',
        info: 'Several guild masters were seen meeting privately at the old lighthouse.',
        hint: 'social'
    },
    {
        topic: '🏰 Noble Intrigue',
        info: 'Palace servants speak of mysterious guests arriving under cover of darkness...',
        hint: 'quests'
    },
    {
        topic: '🚢 Sea Adventures',
        info: 'Captain Redbeard is recruiting experienced sailors for a dangerous voyage.',
        hint: 'transportation'
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inn')
        .setDescription('🏠 Visit the local inn for rest and information')
        .addSubcommand(subcommand =>
            subcommand
                .setName('rest')
                .setDescription('Rest to recover HP and MP quickly')
                .addIntegerOption(option =>
                    option.setName('hours')
                        .setDescription('Hours to rest (1-8)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(8))
                .addStringOption(option =>
                    option.setName('room')
                        .setDescription('Type of room to book')
                        .setRequired(false)
                        .addChoices(
                            ...Object.entries(ROOM_TYPES).map(([key, room]) => ({
                                name: `${room.name} - ${room.cost} coins/hour`,
                                value: key
                            }))
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('gossip')
                .setDescription('Listen to local gossip for quest hints and information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feast')
                .setDescription('Order a feast for temporary stat boosts')
                .addStringOption(option =>
                    option.setName('meal')
                        .setDescription('Type of feast to order')
                        .setRequired(true)
                        .addChoices(
                            ...Object.entries(FEAST_OPTIONS).map(([key, meal]) => ({
                                name: `${meal.name} - ${meal.cost} coins`,
                                value: key
                            }))
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('services')
                .setDescription('View all available inn services'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('board')
                .setDescription('Check the inn\'s message board for opportunities')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'rest':
                    await this.handleRest(interaction, userId);
                    break;
                case 'gossip':
                    await this.handleGossip(interaction, userId);
                    break;
                case 'feast':
                    await this.handleFeast(interaction, userId);
                    break;
                case 'services':
                    await this.handleServices(interaction, userId);
                    break;
                case 'board':
                    await this.handleBoard(interaction, userId);
                    break;
            }
        } catch (error) {
            console.error('Inn command error:', error);
            await interaction.reply({
                content: '❌ An error occurred at the inn. The innkeeper apologizes for any inconvenience.',
                ephemeral: true
            });
        }
    },

    async handleRest(interaction, userId) {
        const hours = interaction.options.getInteger('hours');
        const roomType = interaction.options.getString('room') || 'common';
        
        const userData = await db.getPlayer(userId) || { 
            health: 50, 
            maxHealth: 100, 
            mana: 30, 
            maxMana: 100, 
            coins: 100,
            energy: 70
        };

        const room = ROOM_TYPES[roomType];
        const totalCost = room.cost * hours;

        if (userData.coins < totalCost) {
            return await interaction.reply({
                content: `❌ You need ${totalCost} coins to rest for ${hours} hour(s) in a ${room.name}! (You have ${userData.coins} coins)`,
                ephemeral: true
            });
        }

        // Check if already resting
        if (userData.resting && userData.restEndTime > Date.now()) {
            return await interaction.reply({
                content: `😴 You're already resting! You'll wake up <t:${Math.floor(userData.restEndTime / 1000)}:R>.`,
                ephemeral: true
            });
        }

        // Calculate recovery amounts
        const baseHealthRecovery = Math.min(userData.maxHealth - userData.health, 15 * hours);
        const baseManaRecovery = Math.min(userData.maxMana - userData.mana, 10 * hours);
        const baseEnergyRecovery = Math.min(100 - userData.energy, 20 * hours);

        const healthRecovery = Math.floor(baseHealthRecovery * room.restBonus);
        const manaRecovery = Math.floor(baseManaRecovery * room.restBonus);
        const energyRecovery = Math.floor(baseEnergyRecovery * room.restBonus);

        // Apply rest effects
        userData.health = Math.min(userData.maxHealth, userData.health + healthRecovery);
        userData.mana = Math.min(userData.maxMana, userData.mana + manaRecovery);
        userData.energy = Math.min(100, userData.energy + energyRecovery);
        userData.coins -= totalCost;

        // Set rest timer for immersion
        const restEndTime = Date.now() + (hours * 60 * 60 * 1000);
        userData.resting = true;
        userData.restEndTime = restEndTime;
        userData.restRoom = roomType;

        await db.updatePlayer(userId, userData);

        const embed = new EmbedBuilder()
            .setColor('#8FBC8F')
            .setTitle(`😴 Resting at ${room.name}`)
            .setDescription(`**You settle in for a ${hours}-hour rest at the inn...**`)
            .addFields(
                { name: '🏠 Accommodation', value: room.name, inline: true },
                { name: '💰 Cost', value: `${totalCost} coins`, inline: true },
                { name: '⏰ Duration', value: `${hours} hour(s)`, inline: true },
                { name: '❤️ Health Recovery', value: `+${healthRecovery} HP`, inline: true },
                { name: '💙 Mana Recovery', value: `+${manaRecovery} MP`, inline: true },
                { name: '⚡ Energy Recovery', value: `+${energyRecovery} Energy`, inline: true },
                { name: '🛏️ Current Status', value: `Health: ${userData.health}/${userData.maxHealth}\nMana: ${userData.mana}/${userData.maxMana}\nEnergy: ${userData.energy}/100`, inline: false },
                { name: '🎯 Bonuses Applied', value: `Rest Efficiency: ${Math.floor(room.restBonus * 100)}%`, inline: false }
            )
            .setFooter({ 
                text: `Wake up time: ${new Date(restEndTime).toLocaleString()} | Remaining coins: ${userData.coins}` 
            })
            .setThumbnail(interaction.user.displayAvatarURL());

        // Add amenities description
        embed.addFields({
            name: '🏨 Room Amenities',
            value: room.amenities.map(amenity => `• ${amenity}`).join('\n'),
            inline: false
        });

        const restButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inn_check_rest')
                    .setLabel('💤 Check Rest Status')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('inn_wake_early')
                    .setLabel('☀️ Wake Up Early')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('inn_extend_rest')
                    .setLabel('⏰ Extend Rest')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [restButtons] });
    },

    async handleGossip(interaction, userId) {
        const userData = await db.getPlayer(userId) || {};
        
        // Select random gossip topics
        const selectedGossip = [];
        const availableTopics = [...GOSSIP_TOPICS];
        
        for (let i = 0; i < 3; i++) {
            if (availableTopics.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableTopics.length);
            selectedGossip.push(availableTopics.splice(randomIndex, 1)[0]);
        }

        const embed = new EmbedBuilder()
            .setColor('#DDA0DD')
            .setTitle('🗣️ Tavern Gossip & Rumors')
            .setDescription('**The inn patrons share whispered secrets and local knowledge...**')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/tavern-gossip.png');

        selectedGossip.forEach((gossip, index) => {
            embed.addFields({
                name: `${gossip.topic} ${['🕐', '🕑', '🕒'][index]}`,
                value: `*"${gossip.info}"*\n\n💡 **Hint:** This might be useful for ${gossip.hint} activities!`,
                inline: false
            });
        });

        // Add some atmosphere
        const atmosphere = [
            '🔥 The fireplace crackles warmly in the corner',
            '🍺 Patrons clink mugs and share stories',
            '🎵 A bard plays softly in the background',
            '💨 Pipe smoke creates mysterious patterns',
            '📰 Fresh rumors arrive with each new traveler'
        ];

        embed.addFields({
            name: '🏠 Inn Atmosphere',
            value: atmosphere[Math.floor(Math.random() * atmosphere.length)],
            inline: false
        });

        // Reputation bonus for listening to gossip
        if (userData.reputation !== undefined) {
            userData.reputation = (userData.reputation || 0) + 1;
            await db.updatePlayer(userId, userData);
            embed.addFields({
                name: '⭐ Social Benefit',
                value: '+1 Reputation for being a good listener!',
                inline: false
            });
        }

        const gossipButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gossip_buy_drink')
                    .setLabel('🍺 Buy Round of Drinks')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('gossip_share_story')
                    .setLabel('📖 Share Your Story')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('gossip_investigate')
                    .setLabel('🔍 Investigate Rumor')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [gossipButtons] });
    },

    async handleFeast(interaction, userId) {
        const mealType = interaction.options.getString('meal');
        const userData = await db.getPlayer(userId) || { coins: 0, activeBuffs: [] };

        const meal = FEAST_OPTIONS[mealType];
        if (userData.coins < meal.cost) {
            return await interaction.reply({
                content: `❌ You need ${meal.cost} coins for ${meal.name}! (You have ${userData.coins} coins)`,
                ephemeral: true
            });
        }

        // Check for existing similar buffs
        const existingBuff = userData.activeBuffs?.find(buff => 
            buff.source === 'inn_feast' && Object.keys(buff.effects).some(effect => 
                Object.keys(meal.effects).includes(effect)
            )
        );

        if (existingBuff) {
            return await interaction.reply({
                content: '❌ You\'re still full from your last feast! Wait for the effects to wear off first.',
                ephemeral: true
            });
        }

        // Apply feast effects
        userData.coins -= meal.cost;
        if (!userData.activeBuffs) userData.activeBuffs = [];

        const buffExpiry = Date.now() + meal.duration;
        userData.activeBuffs.push({
            type: 'feast',
            source: 'inn_feast',
            effects: meal.effects,
            expires: buffExpiry,
            name: meal.name
        });

        await db.updatePlayer(userId, userData);

        const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle(`${meal.name} Served!`)
            .setDescription(`**The innkeeper presents a magnificent feast before you!**`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🍽️ Meal', value: meal.name, inline: true },
                { name: '💰 Cost', value: `${meal.cost} coins`, inline: true },
                { name: '⏰ Duration', value: `${Math.floor(meal.duration / (60 * 60 * 1000))} hours`, inline: true }
            );

        // Display effects
        const effectsText = Object.entries(meal.effects).map(([effect, value]) => {
            return `+${value}% ${effect.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        }).join('\n');

        embed.addFields([
            { name: '⚡ Active Effects', value: effectsText, inline: false },
            { name: '📖 Description', value: meal.description, inline: false },
            { name: '💰 Remaining Coins', value: userData.coins.toString(), inline: true },
            { name: '⏰ Effects Until', value: `<t:${Math.floor(buffExpiry / 1000)}:R>`, inline: true }
        ]);

        const feastButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('feast_compliment_chef')
                    .setLabel('👨‍🍳 Compliment Chef')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('feast_check_buffs')
                    .setLabel('⭐ Check All Buffs')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('feast_recommend')
                    .setLabel('📢 Recommend to Others')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [feastButtons] });
    },

    async handleServices(interaction, userId) {
        const userData = await db.getPlayer(userId) || { coins: 0 };

        const embed = new EmbedBuilder()
            .setColor('#CD853F')
            .setTitle('🏨 The Golden Anchor Inn - Services')
            .setDescription('**Welcome, weary traveler! We offer the finest accommodations and services.**')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/inn-services.png')
            .addFields(
                { name: '💰 Your Budget', value: `${userData.coins.toLocaleString()} coins`, inline: true },
                { name: '⏰ Current Time', value: new Date().toLocaleTimeString(), inline: true },
                { name: '🌡️ Inn Status', value: 'Open & Welcoming', inline: true }
            );

        // Room services
        const roomsText = Object.entries(ROOM_TYPES).map(([key, room]) => {
            return `**${room.name}** - ${room.cost} coins/hour\n*${room.description}*\n${room.amenities.slice(0, 2).join(', ')}\n`;
        }).join('\n');

        embed.addFields({
            name: '🛏️ Accommodation Services',
            value: roomsText,
            inline: false
        });

        // Dining services
        const mealsText = Object.entries(FEAST_OPTIONS).slice(0, 3).map(([key, meal]) => {
            return `**${meal.name}** - ${meal.cost} coins\n*${meal.description.substring(0, 50)}...*`;
        }).join('\n\n');

        embed.addFields({
            name: '🍽️ Dining Services',
            value: mealsText,
            inline: true
        });

        // Additional services
        embed.addFields({
            name: '🎯 Additional Services',
            value: '• 🗣️ **Local Gossip** - Free with any purchase\n• 📋 **Message Board** - Community notices\n• 🎵 **Entertainment** - Live music on weekends\n• 🛡️ **Safe Storage** - Secure your valuables\n• 📮 **Mail Service** - Send messages anywhere',
            inline: true
        });

        const serviceButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('services_book_room')
                    .setLabel('🛏️ Book Room')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('services_order_meal')
                    .setLabel('🍽️ Order Meal')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('services_special_packages')
                    .setLabel('📦 Special Packages')
                    .setStyle(ButtonStyle.Secondary)
            );

        const serviceSelect = new StringSelectMenuBuilder()
            .setCustomId('inn_service_select')
            .setPlaceholder('🏨 Select a service...')
            .addOptions([
                {
                    label: 'Quick Rest Package',
                    description: '2-hour rest in private room + meal combo',
                    value: 'package_quick',
                    emoji: '⚡'
                },
                {
                    label: 'Full Recovery Package',
                    description: '8-hour luxury rest + royal banquet',
                    value: 'package_full',
                    emoji: '👑'
                },
                {
                    label: 'Information Gathering',
                    description: 'Gossip session + drink for local intel',
                    value: 'package_intel',
                    emoji: '🔍'
                },
                {
                    label: 'Safe Storage Service',
                    description: 'Secure your items while adventuring',
                    value: 'service_storage',
                    emoji: '🛡️'
                }
            ]);

        const components = [
            new ActionRowBuilder().addComponents(serviceSelect),
            serviceButtons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async handleBoard(interaction, userId) {
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('📋 Inn Message Board')
            .setDescription('**Community notices, job postings, and local announcements**')
            .setThumbnail('https://cdn.discordapp.com/attachments/123456789/message-board.png');

        // Generate random board messages
        const boardMessages = [
            {
                type: '💼 Job Posting',
                title: 'Escort Merchant Caravan',
                content: 'Experienced guards needed for dangerous mountain pass. Good pay! Contact Marcus at the market.',
                poster: 'Merchant Guild',
                reward: '500-800 coins'
            },
            {
                type: '❗ Warning',
                title: 'Bandits on North Road',
                content: 'Travelers beware! Bandit activity reported near Stone Bridge. Travel in groups.',
                poster: 'Town Guard',
                reward: 'Your safety'
            },
            {
                type: '📜 Quest Notice',
                title: 'Missing Family Heirloom',
                content: 'Lost grandmother\'s locket in the Whispering Woods. Sentimental value immeasurable.',
                poster: 'Sarah Townsmith',
                reward: '300 coins + gratitude'
            },
            {
                type: '🎪 Event',
                title: 'Harvest Festival Next Week',
                content: 'Annual celebration with games, contests, and prizes! Everyone welcome!',
                poster: 'Festival Committee',
                reward: 'Fun and prizes'
            },
            {
                type: '🏠 For Rent',
                title: 'Cottage Available',
                content: 'Cozy 2-room cottage near the river. Perfect for adventurers needing a base.',
                poster: 'Old Tom',
                reward: '100 coins/week'
            }
        ];

        // Select 3 random messages
        const selectedMessages = [];
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * boardMessages.length);
            selectedMessages.push(boardMessages.splice(randomIndex, 1)[0]);
        }

        selectedMessages.forEach((message, index) => {
            embed.addFields({
                name: `${message.type}: ${message.title}`,
                value: `📝 *${message.content}*\n\n👤 **Posted by:** ${message.poster}\n💰 **Reward:** ${message.reward}`,
                inline: false
            });
        });

        embed.addFields({
            name: '📌 How to Respond',
            value: 'Visit the inn regularly to see new postings, or speak with other patrons about opportunities!',
            inline: false
        });

        const boardButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('board_post_message')
                    .setLabel('📝 Post Message')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('board_search_jobs')
                    .setLabel('💼 Search Jobs')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('board_refresh')
                    .setLabel('🔄 Refresh Board')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [boardButtons] });
    }
};
