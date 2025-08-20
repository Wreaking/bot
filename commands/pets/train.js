
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const TRAINING_TYPES = {
    strength: {
        name: '💪 Strength Training',
        description: 'Increases your pet\'s attack power',
        cost: 50,
        duration: 1800000, // 30 minutes
        statBonus: { attack: 2, defense: 1 },
        emoji: '💪'
    },
    agility: {
        name: '🏃 Agility Training',
        description: 'Improves your pet\'s speed and evasion',
        cost: 40,
        duration: 1200000, // 20 minutes
        statBonus: { agility: 3, speed: 2 },
        emoji: '🏃'
    },
    intelligence: {
        name: '🧠 Intelligence Training',
        description: 'Enhances your pet\'s magical abilities',
        cost: 60,
        duration: 2400000, // 40 minutes
        statBonus: { intelligence: 3, mana: 10 },
        emoji: '🧠'
    },
    loyalty: {
        name: '❤️ Loyalty Training',
        description: 'Strengthens the bond between you and your pet',
        cost: 30,
        duration: 900000, // 15 minutes
        statBonus: { loyalty: 5, happiness: 10 },
        emoji: '❤️'
    },
    combat: {
        name: '⚔️ Combat Training',
        description: 'Teaches advanced fighting techniques',
        cost: 80,
        duration: 3600000, // 60 minutes
        statBonus: { attack: 3, defense: 2, critical_chance: 1 },
        emoji: '⚔️'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('train')
        .setDescription('🐾 Train your pets to improve their abilities')
        .addStringOption(option =>
            option.setName('pet_id')
                .setDescription('Pet to train')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('skill')
                .setDescription('Skill to train')
                .setRequired(false)
                .addChoices(
                    { name: '💪 Strength', value: 'strength' },
                    { name: '🏃 Agility', value: 'agility' },
                    { name: '🧠 Intelligence', value: 'intelligence' },
                    { name: '❤️ Loyalty', value: 'loyalty' },
                    { name: '⚔️ Combat', value: 'combat' }
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Training duration in minutes (15-120)')
                .setRequired(false)
                .setMinValue(15)
                .setMaxValue(120)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};

            // Initialize pet data
            if (!userData.pets) {
                userData.pets = { owned: {}, active_pet: null, training_sessions: 0 };
            }

            const petId = interaction.options.getString('pet_id');
            const skill = interaction.options.getString('skill');
            const duration = interaction.options.getInteger('duration');

            if (!petId && !skill) {
                await this.showTrainingMenu(interaction, userData);
            } else {
                await this.startTraining(interaction, userData, petId, skill, duration);
            }

        } catch (error) {
            console.error('Training command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred during training. Please try again.',
                ephemeral: true
            });
        }
    },

    async showTrainingMenu(interaction, userData) {
        if (Object.keys(userData.pets.owned).length === 0) {
            await interaction.editReply({
                content: '❌ You don\'t have any pets to train! Use `/pet adopt` to get a companion first.',
                ephemeral: true
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🏋️ Pet Training Academy')
            .setDescription('╔═══════════════════════════════════════╗\n║        **TRAINING GROUNDS**           ║\n╚═══════════════════════════════════════╝\n\n*Transform your companions into elite warriors!*')
            .setThumbnail('https://cdn.discordapp.com/emojis/🏋️.png')
            .addFields(
                {
                    name: '📊 **Training Statistics**',
                    value: `**Sessions Completed:** ${userData.pets.training_sessions || 0}\n**Active Pets:** ${Object.keys(userData.pets.owned).length}\n**Coins:** ${userData.coins || 0} 💰`,
                    inline: true
                }
            );

        // Show available pets
        const availablePets = Object.entries(userData.pets.owned)
            .filter(([petId, pet]) => !pet.training || pet.training.endTime < Date.now())
            .slice(0, 5);

        if (availablePets.length > 0) {
            const petList = availablePets.map(([petId, pet]) => {
                return `${pet.emoji || '🐾'} **${pet.name}** (Lv.${pet.level})\n` +
                       `   ⚔️ ${pet.stats?.attack || 10} | 🛡️ ${pet.stats?.defense || 5} | 🏃 ${pet.stats?.agility || 8}`;
            }).join('\n');

            embed.addFields({
                name: '🐾 **Available Pets**',
                value: petList,
                inline: false
            });
        }

        // Show training options
        const trainingOptions = Object.entries(TRAINING_TYPES).map(([key, training]) => {
            return `${training.emoji} **${training.name}**\n` +
                   `   💰 ${training.cost} coins • ⏱️ ${Math.floor(training.duration / 60000)}min\n` +
                   `   📈 ${training.description}`;
        }).join('\n\n');

        embed.addFields({
            name: '📚 **Training Programs**',
            value: trainingOptions,
            inline: false
        });

        // Pet selection menu
        if (availablePets.length > 0) {
            const petSelect = new StringSelectMenuBuilder()
                .setCustomId('training_pet_select')
                .setPlaceholder('🎯 Select a pet to train')
                .addOptions(
                    availablePets.map(([petId, pet]) => ({
                        label: `${pet.name} (Level ${pet.level})`,
                        value: petId,
                        description: `Attack: ${pet.stats?.attack || 10} | Defense: ${pet.stats?.defense || 5}`,
                        emoji: pet.emoji || '🐾'
                    }))
                );

            const selectRow = new ActionRowBuilder().addComponents(petSelect);

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('training_quick_start')
                        .setLabel('Quick Training')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⚡'),
                    new ButtonBuilder()
                        .setCustomId('training_check_progress')
                        .setLabel('Check Progress')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('training_leaderboard')
                        .setLabel('Training Records')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🏆')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [selectRow, buttons]
            });
        } else {
            await interaction.editReply({
                content: '❌ No pets available for training. All your pets are currently being trained!',
                ephemeral: true
            });
        }
    },

    async startTraining(interaction, userData, petId, skill, customDuration) {
        // Find pet to train
        let selectedPet;
        let selectedPetId;

        if (petId) {
            if (userData.pets.owned[petId]) {
                selectedPet = userData.pets.owned[petId];
                selectedPetId = petId;
            } else {
                await interaction.editReply({
                    content: '❌ Pet not found!',
                    ephemeral: true
                });
                return;
            }
        } else {
            // Use active pet or first available pet
            const availablePets = Object.entries(userData.pets.owned)
                .filter(([id, pet]) => !pet.training || pet.training.endTime < Date.now());

            if (availablePets.length === 0) {
                await interaction.editReply({
                    content: '❌ No pets available for training!',
                    ephemeral: true
                });
                return;
            }

            [selectedPetId, selectedPet] = availablePets[0];
        }

        // Check if pet is already training
        if (selectedPet.training && selectedPet.training.endTime > Date.now()) {
            const remainingTime = Math.ceil((selectedPet.training.endTime - Date.now()) / 60000);
            await interaction.editReply({
                content: `❌ ${selectedPet.name} is already training! ${remainingTime} minutes remaining.`,
                ephemeral: true
            });
            return;
        }

        if (!skill) {
            await interaction.editReply({
                content: '❌ Please specify a skill to train!',
                ephemeral: true
            });
            return;
        }

        const training = TRAINING_TYPES[skill];
        if (!training) {
            await interaction.editReply({
                content: '❌ Invalid training type!',
                ephemeral: true
            });
            return;
        }

        // Check if user can afford training
        if ((userData.coins || 0) < training.cost) {
            await interaction.editReply({
                content: `❌ You need ${training.cost} coins for ${training.name}! You have ${userData.coins || 0} coins.`,
                ephemeral: true
            });
            return;
        }

        // Calculate training duration
        const trainingDuration = customDuration ? customDuration * 60000 : training.duration;
        const trainingEndTime = Date.now() + trainingDuration;

        // Start training
        userData.coins -= training.cost;
        selectedPet.training = {
            type: skill,
            startTime: Date.now(),
            endTime: trainingEndTime,
            originalStats: { ...selectedPet.stats }
        };

        userData.pets.owned[selectedPetId] = selectedPet;
        await db.updateUser(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏋️ Training Started!')
            .setDescription(`**${selectedPet.name}** has begun ${training.name}!`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '📋 **Training Details**',
                    value: `**Pet:** ${selectedPet.name}\n**Program:** ${training.name}\n**Duration:** ${Math.floor(trainingDuration / 60000)} minutes`,
                    inline: true
                },
                {
                    name: '💰 **Cost & Benefits**',
                    value: `**Cost:** ${training.cost} coins\n**Expected Gains:** ${Object.entries(training.statBonus).map(([stat, bonus]) => `${stat}: +${bonus}`).join(', ')}`,
                    inline: true
                },
                {
                    name: '⏰ **Completion Time**',
                    value: `<t:${Math.floor(trainingEndTime / 1000)}:F>\n<t:${Math.floor(trainingEndTime / 1000)}:R>`,
                    inline: false
                }
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('training_check_progress')
                    .setLabel('Check Progress')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('training_boost')
                    .setLabel('Speed Boost (💎100)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('pet_status')
                    .setLabel('Pet Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🐾')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });

        // Set up automatic completion
        setTimeout(async () => {
            try {
                const updatedUser = await db.getUserData(interaction.user.id);
                if (updatedUser?.pets?.owned[selectedPetId]?.training) {
                    await this.completeTraining(interaction.user.id, selectedPetId);
                }
            } catch (error) {
                console.error('Error completing training:', error);
            }
        }, trainingDuration);
    },

    async completeTraining(userId, petId) {
        try {
            const userData = await db.getUserData(userId);
            if (!userData?.pets?.owned[petId]?.training) return;

            const pet = userData.pets.owned[petId];
            const trainingType = pet.training.type;
            const training = TRAINING_TYPES[trainingType];

            // Apply stat bonuses
            if (!pet.stats) pet.stats = { attack: 10, defense: 5, agility: 8, intelligence: 5 };

            Object.entries(training.statBonus).forEach(([stat, bonus]) => {
                pet.stats[stat] = (pet.stats[stat] || 0) + bonus;
            });

            // Increase pet experience and potentially level
            pet.experience = (pet.experience || 0) + 50;
            const newLevel = Math.floor(pet.experience / 100) + 1;
            if (newLevel > pet.level) {
                pet.level = newLevel;
                // Bonus stats on level up
                pet.stats.attack += 2;
                pet.stats.defense += 1;
                pet.stats.agility += 1;
            }

            // Clear training data
            delete pet.training;

            // Update training statistics
            userData.pets.training_sessions = (userData.pets.training_sessions || 0) + 1;

            await db.updateUser(userId, userData);

        } catch (error) {
            console.error('Error completing training:', error);
        }
    }
};
