
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const PET_TYPES = {
    wolf: {
        name: '🐺 Wolf',
        rarity: 'common',
        base_stats: { attack: 15, defense: 10, agility: 20, loyalty: 5 },
        abilities: ['pack_hunt', 'intimidate'],
        food_type: 'meat',
        description: 'Loyal canine companion with fierce hunting instincts'
    },
    dragon: {
        name: '🐲 Dragon',
        rarity: 'legendary',
        base_stats: { attack: 35, defense: 30, agility: 25, loyalty: 10 },
        abilities: ['fire_breath', 'fly', 'treasure_sense'],
        food_type: 'premium_meat',
        description: 'Majestic winged beast with immense power'
    },
    phoenix: {
        name: '🔥 Phoenix',
        rarity: 'mythic',
        base_stats: { attack: 25, defense: 20, agility: 40, loyalty: 15 },
        abilities: ['rebirth', 'healing_aura', 'fire_immunity'],
        food_type: 'magical_essence',
        description: 'Immortal firebird that rises from its own ashes'
    },
    griffin: {
        name: '🦅 Griffin',
        rarity: 'rare',
        base_stats: { attack: 28, defense: 22, agility: 35, loyalty: 12 },
        abilities: ['aerial_strike', 'keen_sight', 'wind_mastery'],
        food_type: 'mixed_diet',
        description: 'Noble creature with the body of a lion and wings of an eagle'
    },
    unicorn: {
        name: '🦄 Unicorn',
        rarity: 'rare',
        base_stats: { attack: 20, defense: 25, agility: 30, loyalty: 20 },
        abilities: ['healing_magic', 'purify', 'horn_charge'],
        food_type: 'magical_herbs',
        description: 'Pure-hearted creature with powerful healing magic'
    },
    cat: {
        name: '🐱 Cat',
        rarity: 'common',
        base_stats: { attack: 8, defense: 6, agility: 25, loyalty: 8 },
        abilities: ['stealth', 'lucky_find'],
        food_type: 'fish',
        description: 'Agile feline companion with mysterious ways'
    },
    owl: {
        name: '🦉 Owl',
        rarity: 'uncommon',
        base_stats: { attack: 12, defense: 8, agility: 22, loyalty: 10 },
        abilities: ['night_vision', 'wisdom_boost', 'silent_flight'],
        food_type: 'small_creatures',
        description: 'Wise nocturnal bird that enhances learning'
    }
};

const PET_FOODS = {
    meat: { name: '🥩 Raw Meat', cost: 25, hunger_restore: 20 },
    premium_meat: { name: '🥩 Premium Meat', cost: 75, hunger_restore: 50 },
    fish: { name: '🐟 Fresh Fish', cost: 15, hunger_restore: 15 },
    magical_essence: { name: '✨ Magical Essence', cost: 200, hunger_restore: 80 },
    mixed_diet: { name: '🥘 Mixed Diet', cost: 40, hunger_restore: 30 },
    magical_herbs: { name: '🌿 Magical Herbs', cost: 60, hunger_restore: 35 },
    small_creatures: { name: '🐭 Small Creatures', cost: 20, hunger_restore: 18 }
};

const PET_ACTIVITIES = {
    hunt: { name: '🏹 Hunting', duration: 1800000, rewards: ['meat', 'fur', 'coins'] },
    explore: { name: '🗺️ Exploring', duration: 2700000, rewards: ['herbs', 'gems', 'experience'] },
    guard: { name: '🛡️ Guarding', duration: 3600000, rewards: ['security_bonus', 'loyalty'] },
    train: { name: '💪 Training', duration: 1200000, rewards: ['experience', 'stat_boost'] },
    rest: { name: '😴 Resting', duration: 600000, rewards: ['energy_restore', 'happiness'] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('🐾 Manage your loyal animal companions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('adopt')
                .setDescription('Adopt a new pet')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of pet to adopt')
                        .setRequired(true)
                        .addChoices(
                            { name: '🐺 Wolf', value: 'wolf' },
                            { name: '🐱 Cat', value: 'cat' },
                            { name: '🦉 Owl', value: 'owl' },
                            { name: '🦄 Unicorn', value: 'unicorn' },
                            { name: '🦅 Griffin', value: 'griffin' },
                            { name: '🐲 Dragon', value: 'dragon' },
                            { name: '🔥 Phoenix', value: 'phoenix' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View your pets status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feed')
                .setDescription('Feed your pet')
                .addStringOption(option =>
                    option.setName('pet_id')
                        .setDescription('Pet to feed')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('activity')
                .setDescription('Send pet on an activity')
                .addStringOption(option =>
                    option.setName('pet_id')
                        .setDescription('Pet to send on activity')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('activity')
                        .setDescription('Activity type')
                        .setRequired(true)
                        .addChoices(
                            { name: '🏹 Hunting', value: 'hunt' },
                            { name: '🗺️ Exploring', value: 'explore' },
                            { name: '🛡️ Guarding', value: 'guard' },
                            { name: '💪 Training', value: 'train' },
                            { name: '😴 Resting', value: 'rest' }
                        ))),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};
            
            // Initialize pet data
            if (!userData.pets) {
                userData.pets = {
                    owned: {},
                    active_pet: null,
                    total_adopted: 0,
                    care_level: 1
                };
            }

            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'adopt':
                    await this.adoptPet(interaction, userData);
                    break;
                case 'status':
                    await this.showPetStatus(interaction, userData);
                    break;
                case 'feed':
                    await this.feedPet(interaction, userData);
                    break;
                case 'activity':
                    await this.sendPetOnActivity(interaction, userData);
                    break;
            }
            
        } catch (error) {
            console.error('Pet command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while managing pets. Please try again.',
                ephemeral: true
            });
        }
    },

    async adoptPet(interaction, userData) {
        const petType = interaction.options.getString('type');
        const petInfo = PET_TYPES[petType];
        
        if (!petInfo) {
            await interaction.editReply({
                content: '❌ Invalid pet type selected.',
                ephemeral: true
            });
            return;
        }

        // Check if user can afford adoption
        const adoptionCost = this.getAdoptionCost(petInfo.rarity);
        if ((userData.coins || 0) < adoptionCost) {
            await interaction.editReply({
                content: `❌ You need ${adoptionCost} coins to adopt a ${petInfo.name}. You have ${userData.coins || 0} coins.`,
                ephemeral: true
            });
            return;
        }

        // Check pet limit
        const maxPets = Math.floor(userData.pets.care_level / 2) + 2;
        if (Object.keys(userData.pets.owned).length >= maxPets) {
            await interaction.editReply({
                content: `❌ You can only have ${maxPets} pets at your current care level (${userData.pets.care_level}).`,
                ephemeral: true
            });
            return;
        }

        // Create pet with randomized stats
        const petId = `${petType}_${Date.now()}`;
        const pet = this.createPet(petType, petInfo);
        
        // Deduct coins and add pet
        userData.coins -= adoptionCost;
        userData.pets.owned[petId] = pet;
        userData.pets.total_adopted++;
        
        // Set as active pet if it's the first one
        if (!userData.pets.active_pet) {
            userData.pets.active_pet = petId;
        }

        await db.updateUser(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor('#00FF7F')
            .setTitle('🎉 Pet Adoption Successful!')
            .setDescription(`Welcome your new companion: **${pet.name}**!`)
            .setThumbnail('https://cdn.discordapp.com/emojis/🐾.png')
            .addFields(
                {
                    name: '📊 **Pet Stats**',
                    value: `**Attack:** ${pet.stats.attack}\n**Defense:** ${pet.stats.defense}\n**Agility:** ${pet.stats.agility}\n**Loyalty:** ${pet.stats.loyalty}`,
                    inline: true
                },
                {
                    name: '🌟 **Pet Details**',
                    value: `**Type:** ${petInfo.name}\n**Rarity:** ${petInfo.rarity}\n**Level:** ${pet.level}\n**Happiness:** ${pet.happiness}%`,
                    inline: true
                },
                {
                    name: '🎯 **Special Abilities**',
                    value: petInfo.abilities.map(ability => `• ${ability.replace(/_/g, ' ')}`).join('\n'),
                    inline: false
                }
            )
            .addFields({
                name: '💡 **Pet Care Tips**',
                value: '• Feed your pet regularly to maintain happiness\n• Send them on activities to gain experience\n• Higher loyalty pets perform better in activities',
                inline: false
            })
            .setFooter({ text: `Cost: ${adoptionCost} coins | Pet ID: ${petId}` });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pet_feed_${petId}`)
                    .setLabel('Feed Pet')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🍽️'),
                new ButtonBuilder()
                    .setCustomId('pet_status')
                    .setLabel('All Pets')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🐾'),
                new ButtonBuilder()
                    .setCustomId(`pet_activity_${petId}`)
                    .setLabel('Send Activity')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async showPetStatus(interaction, userData) {
        if (Object.keys(userData.pets.owned).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets yet! Use `/pet adopt` to get your first companion.',
                ephemeral: true
            });
            return;
        }

        // Update pet states (hunger, activities, etc.)
        this.updatePetStates(userData);

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('🐾 Pet Management Center')
            .setDescription('╔═══════════════════════════════════════╗\n║           **PET SANCTUARY**           ║\n╚═══════════════════════════════════════╝')
            .addFields(
                {
                    name: '👑 **Care Statistics**',
                    value: `**Care Level:** ${userData.pets.care_level}\n**Total Adopted:** ${userData.pets.total_adopted}\n**Max Pets:** ${Math.floor(userData.pets.care_level / 2) + 2}`,
                    inline: true
                }
            );

        // Add pet information
        let petIndex = 1;
        for (const [petId, pet] of Object.entries(userData.pets.owned)) {
            const isActive = userData.pets.active_pet === petId;
            const petType = PET_TYPES[pet.type];
            
            let statusText = `**Level:** ${pet.level} | **Happiness:** ${pet.happiness}%\n`;
            statusText += `**Hunger:** ${pet.hunger}/100 | **Energy:** ${pet.energy}/100\n`;
            
            if (pet.activity) {
                const remaining = Math.max(0, pet.activity.end_time - Date.now());
                const remainingMinutes = Math.ceil(remaining / 60000);
                statusText += `🔄 **${pet.activity.type}** (${remainingMinutes}m left)`;
            } else {
                statusText += '💤 **Idle** - Ready for activities';
            }

            embed.addFields({
                name: `${isActive ? '👑' : '🐾'} **${pet.name}** ${petType.name}`,
                value: statusText,
                inline: true
            });

            if (petIndex % 2 === 0) {
                embed.addFields({ name: '\u200B', value: '\u200B', inline: true });
            }
            petIndex++;
        }

        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('pet_manage')
            .setPlaceholder('🎯 Select a pet to manage')
            .addOptions(
                Object.entries(userData.pets.owned).map(([petId, pet]) => ({
                    label: pet.name,
                    value: petId,
                    description: `${PET_TYPES[pet.type].name} | Level ${pet.level} | ${pet.happiness}% Happy`,
                    emoji: PET_TYPES[pet.type].name.split(' ')[0]
                }))
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_shop')
                    .setLabel('Pet Shop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪'),
                new ButtonBuilder()
                    .setCustomId('pet_activities')
                    .setLabel('Activities')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎮'),
                new ButtonBuilder()
                    .setCustomId('pet_care')
                    .setLabel('Care Guide')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚')
            );

        const selectRow = new ActionRowBuilder().addComponents(petSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    createPet(type, petInfo) {
        // Randomize stats slightly
        const statVariance = 0.2; // ±20% variance
        const randomizedStats = {};
        
        Object.entries(petInfo.base_stats).forEach(([stat, value]) => {
            const variance = (Math.random() - 0.5) * 2 * statVariance;
            randomizedStats[stat] = Math.max(1, Math.floor(value * (1 + variance)));
        });

        return {
            type: type,
            name: this.generatePetName(type),
            level: 1,
            experience: 0,
            stats: randomizedStats,
            happiness: 75,
            hunger: 80,
            energy: 100,
            adopted_at: Date.now(),
            activity: null,
            last_fed: Date.now(),
            last_activity: null
        };
    },

    generatePetName(type) {
        const names = {
            wolf: ['Luna', 'Shadow', 'Storm', 'Frost', 'Alpha', 'Scout'],
            cat: ['Whiskers', 'Mittens', 'Shadow', 'Luna', 'Tiger', 'Smokey'],
            owl: ['Hoot', 'Wisdom', 'Athena', 'Nocturne', 'Echo', 'Sage'],
            unicorn: ['Stardust', 'Moonbeam', 'Aurora', 'Celeste', 'Seraph', 'Purity'],
            griffin: ['Majesty', 'Skywing', 'Goldcrest', 'Tempest', 'Valor', 'Aerie'],
            dragon: ['Blaze', 'Ember', 'Scales', 'Wyrm', 'Inferno', 'Draco'],
            phoenix: ['Flame', 'Rebirth', 'Ashes', 'Eternal', 'Fireborn', 'Rising']
        };
        
        const nameList = names[type] || ['Companion'];
        return nameList[Math.floor(Math.random() * nameList.length)];
    },

    getAdoptionCost(rarity) {
        const costs = {
            common: 500,
            uncommon: 1500,
            rare: 5000,
            legendary: 15000,
            mythic: 50000
        };
        return costs[rarity] || 1000;
    },

    updatePetStates(userData) {
        const now = Date.now();
        
        Object.values(userData.pets.owned).forEach(pet => {
            // Decrease hunger over time (1 per hour)
            const hoursSinceLastFed = (now - pet.last_fed) / (1000 * 60 * 60);
            pet.hunger = Math.max(0, pet.hunger - Math.floor(hoursSinceLastFed));
            
            // Update happiness based on hunger
            if (pet.hunger < 20) {
                pet.happiness = Math.max(0, pet.happiness - 1);
            } else if (pet.hunger > 80) {
                pet.happiness = Math.min(100, pet.happiness + 1);
            }
            
            // Check if activity is complete
            if (pet.activity && now >= pet.activity.end_time) {
                this.completeActivity(pet);
            }
        });
    },

    completeActivity(pet) {
        const activity = PET_ACTIVITIES[pet.activity.type];
        
        // Grant rewards based on activity
        pet.experience += 25;
        pet.energy = Math.max(0, pet.energy - 20);
        pet.last_activity = Date.now();
        pet.activity = null;
        
        // Level up check
        const newLevel = Math.floor(pet.experience / 100) + 1;
        if (newLevel > pet.level) {
            pet.level = newLevel;
            // Boost stats on level up
            Object.keys(pet.stats).forEach(stat => {
                pet.stats[stat] += Math.floor(Math.random() * 3) + 1;
            });
        }
    }
};
