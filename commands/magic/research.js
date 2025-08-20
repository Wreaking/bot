
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const MAGIC_SCHOOLS = {
    fire: {
        name: '🔥 Fire Magic',
        description: 'Harness the destructive power of flames',
        baseResearchTime: 2 * 60 * 60 * 1000, // 2 hours
        materials: ['phoenix_feather', 'volcanic_ash', 'fire_crystal'],
        discoveries: [
            { name: 'Flame Control', level: 1, effect: 'Basic fire manipulation' },
            { name: 'Heat Resistance', level: 3, effect: 'Immunity to fire damage' },
            { name: 'Inferno Mastery', level: 5, effect: 'Advanced fire spells' }
        ]
    },
    ice: {
        name: '❄️ Ice Magic',
        description: 'Command the freezing forces of winter',
        baseResearchTime: 2.5 * 60 * 60 * 1000, // 2.5 hours
        materials: ['frost_crystal', 'winter_essence', 'glacier_shard'],
        discoveries: [
            { name: 'Frost Touch', level: 1, effect: 'Freeze objects and enemies' },
            { name: 'Ice Armor', level: 3, effect: 'Protective ice barriers' },
            { name: 'Absolute Zero', level: 5, effect: 'Ultimate freezing technique' }
        ]
    },
    lightning: {
        name: '⚡ Lightning Magic',
        description: 'Wield the raw energy of storms',
        baseResearchTime: 1.5 * 60 * 60 * 1000, // 1.5 hours
        materials: ['storm_essence', 'conductive_ore', 'thunder_stone'],
        discoveries: [
            { name: 'Static Charge', level: 1, effect: 'Generate electrical energy' },
            { name: 'Chain Lightning', level: 3, effect: 'Lightning jumps between targets' },
            { name: 'Storm Lord', level: 5, effect: 'Control weather patterns' }
        ]
    },
    nature: {
        name: '🌿 Nature Magic',
        description: 'Connect with the living world around you',
        baseResearchTime: 3 * 60 * 60 * 1000, // 3 hours
        materials: ['ancient_seed', 'living_bark', 'nature_essence'],
        discoveries: [
            { name: 'Plant Growth', level: 1, effect: 'Accelerate natural growth' },
            { name: 'Animal Speech', level: 3, effect: 'Communicate with creatures' },
            { name: 'World Tree', level: 5, effect: 'Connection to all life' }
        ]
    },
    dark: {
        name: '🌙 Dark Magic',
        description: 'Delve into forbidden shadowy arts',
        baseResearchTime: 4 * 60 * 60 * 1000, // 4 hours
        materials: ['shadow_essence', 'void_crystal', 'dark_matter'],
        discoveries: [
            { name: 'Shadow Manipulation', level: 1, effect: 'Control darkness itself' },
            { name: 'Soul Drain', level: 3, effect: 'Siphon life energy' },
            { name: 'Void Mastery', level: 5, effect: 'Command nothingness' }
        ]
    },
    light: {
        name: '✨ Light Magic',
        description: 'Channel the purifying power of radiance',
        baseResearchTime: 3.5 * 60 * 60 * 1000, // 3.5 hours
        materials: ['holy_crystal', 'sunlight_essence', 'divine_relic'],
        discoveries: [
            { name: 'Healing Light', level: 1, effect: 'Restore health and vitality' },
            { name: 'Purification', level: 3, effect: 'Cleanse negative effects' },
            { name: 'Divine Blessing', level: 5, effect: 'Ultimate protective magic' }
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('research')
        .setDescription('📚 Research new spells and magical techniques')
        .addStringOption(option =>
            option.setName('school')
                .setDescription('School of magic to research')
                .setRequired(false)
                .addChoices(
                    { name: '🔥 Fire Magic', value: 'fire' },
                    { name: '❄️ Ice Magic', value: 'ice' },
                    { name: '⚡ Lightning Magic', value: 'lightning' },
                    { name: '🌿 Nature Magic', value: 'nature' },
                    { name: '🌙 Dark Magic', value: 'dark' },
                    { name: '✨ Light Magic', value: 'light' }
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Research duration in hours (1-12)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(12))
        .addBooleanOption(option =>
            option.setName('focus')
                .setDescription('Use focus mode for better results but higher cost')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};

            // Initialize research data
            if (!userData.research) {
                userData.research = {
                    level: 1,
                    experience: 0,
                    activeResearch: null,
                    discoveries: {},
                    totalHours: 0,
                    completedProjects: 0
                };
            }

            const school = interaction.options.getString('school');
            const duration = interaction.options.getInteger('duration');
            const focus = interaction.options.getBoolean('focus');

            if (!school) {
                await this.showResearchMenu(interaction, userData);
            } else {
                await this.startResearch(interaction, userData, school, duration, focus);
            }

        } catch (error) {
            console.error('Research command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while researching. Please try again.',
                ephemeral: true
            });
        }
    },

    async showResearchMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📚 Magical Research Laboratory')
            .setDescription('╔═══════════════════════════════════════╗\n║      **ARCANE RESEARCH FACILITY**      ║\n╚═══════════════════════════════════════╝\n\n*Unlock the secrets of magic through dedicated study*')
            .setThumbnail('https://cdn.discordapp.com/emojis/📚.png')
            .addFields(
                {
                    name: '🔬 **Research Stats**',
                    value: `**Level:** ${userData.research.level}\n**Experience:** ${userData.research.experience}\n**Total Hours:** ${userData.research.totalHours}\n**Projects:** ${userData.research.completedProjects}`,
                    inline: true
                },
                {
                    name: '⚗️ **Laboratory Status**',
                    value: userData.research.activeResearch 
                        ? `🔄 **Active:** ${MAGIC_SCHOOLS[userData.research.activeResearch.school].name}\n⏰ **Ends:** <t:${Math.floor(userData.research.activeResearch.endTime / 1000)}:R>`
                        : '💤 **Status:** Idle\n🎯 **Ready:** For new research',
                    inline: true
                },
                {
                    name: '💰 **Resources**',
                    value: `**Gold:** ${userData.gold || 0}\n**Research Points:** ${userData.research.experience}\n**Focus Crystals:** ${userData.inventory?.focus_crystals || 0}`,
                    inline: true
                }
            );

        // Show research progress for each school
        const progressText = Object.entries(MAGIC_SCHOOLS).map(([key, school]) => {
            const discoveries = userData.research.discoveries[key] || [];
            const totalDiscoveries = school.discoveries.length;
            const progress = `${discoveries.length}/${totalDiscoveries}`;
            
            return `${school.name.split(' ')[0]} **${school.name.slice(2)}:** ${progress} ${this.getProgressBar(discoveries.length, totalDiscoveries)}`;
        }).join('\n');

        embed.addFields({
            name: '📖 **Research Progress**',
            value: progressText,
            inline: false
        });

        // If actively researching, show current project details
        if (userData.research.activeResearch) {
            const currentSchool = MAGIC_SCHOOLS[userData.research.activeResearch.school];
            const timeRemaining = userData.research.activeResearch.endTime - Date.now();
            const progressPercent = Math.max(0, 100 - Math.floor((timeRemaining / userData.research.activeResearch.totalTime) * 100));

            embed.addFields({
                name: '🔬 **Current Research Project**',
                value: `**School:** ${currentSchool.name}\n**Focus Mode:** ${userData.research.activeResearch.focus ? 'Yes' : 'No'}\n**Progress:** ${progressPercent}% ${this.getProgressBar(progressPercent, 100)}\n**Expected Discovery:** ${this.getNextDiscovery(userData, userData.research.activeResearch.school)?.name || 'Unknown'}`,
                inline: false
            });

            const stopButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('research_stop')
                        .setLabel('Stop Research')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🛑'),
                    new ButtonBuilder()
                        .setCustomId('research_boost')
                        .setLabel('Boost (💎50)')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('⚡'),
                    new ButtonBuilder()
                        .setCustomId('research_status')
                        .setLabel('Check Status')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [stopButton]
            });
            return;
        }

        // School selection for new research
        const schoolSelect = new StringSelectMenuBuilder()
            .setCustomId('research_school_select')
            .setPlaceholder('🎯 Choose a school of magic to research...')
            .addOptions(
                Object.entries(MAGIC_SCHOOLS).map(([key, school]) => {
                    const discoveries = userData.research.discoveries[key] || [];
                    const nextDiscovery = this.getNextDiscovery(userData, key);
                    
                    return {
                        label: school.name,
                        value: `research_${key}`,
                        description: `${discoveries.length}/${school.discoveries.length} discoveries | Next: ${nextDiscovery?.name || 'Complete'}`,
                        emoji: school.name.split(' ')[0]
                    };
                })
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('research_quick_start')
                    .setLabel('Quick Research')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('research_library')
                    .setLabel('Knowledge Library')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📖'),
                new ButtonBuilder()
                    .setCustomId('research_upgrade')
                    .setLabel('Upgrade Lab')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔧')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(schoolSelect),
                buttons
            ]
        });
    },

    async startResearch(interaction, userData, school, customDuration, focus) {
        // Check if already researching
        if (userData.research.activeResearch && userData.research.activeResearch.endTime > Date.now()) {
            await interaction.editReply({
                content: '❌ You are already conducting research! Finish your current project first.',
                ephemeral: true
            });
            return;
        }

        const magicSchool = MAGIC_SCHOOLS[school];
        if (!magicSchool) {
            await interaction.editReply({
                content: '❌ Invalid school of magic!',
                ephemeral: true
            });
            return;
        }

        // Check if school is completed
        const discoveries = userData.research.discoveries[school] || [];
        if (discoveries.length >= magicSchool.discoveries.length) {
            await interaction.editReply({
                content: `❌ You have already mastered ${magicSchool.name}! No more discoveries available.`,
                ephemeral: true
            });
            return;
        }

        // Calculate research parameters
        const baseDuration = customDuration ? customDuration * 60 * 60 * 1000 : magicSchool.baseResearchTime;
        const focusMultiplier = focus ? 1.5 : 1.0;
        const actualDuration = Math.floor(baseDuration * focusMultiplier);
        
        const baseCost = Math.floor(100 * (discoveries.length + 1));
        const focusCost = focus ? baseCost * 2 : baseCost;
        const materialCost = focus ? 2 : 1;

        // Check costs
        if ((userData.gold || 0) < focusCost) {
            await interaction.editReply({
                content: `❌ You need ${focusCost} gold for this research project!`,
                ephemeral: true
            });
            return;
        }

        // Check materials
        const missingMaterials = magicSchool.materials.filter(material => 
            !userData.inventory?.[material] || userData.inventory[material] < materialCost
        );

        if (missingMaterials.length > 0) {
            await interaction.editReply({
                content: `❌ You need ${materialCost} of each material: ${missingMaterials.join(', ')}`,
                ephemeral: true
            });
            return;
        }

        // Start research
        userData.gold -= focusCost;
        magicSchool.materials.forEach(material => {
            userData.inventory[material] -= materialCost;
        });

        userData.research.activeResearch = {
            school: school,
            startTime: Date.now(),
            endTime: Date.now() + actualDuration,
            totalTime: actualDuration,
            focus: focus,
            expectedDiscovery: this.getNextDiscovery(userData, school)
        };

        await db.updateUser(interaction.user.id, userData);

        const nextDiscovery = this.getNextDiscovery(userData, school);
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🔬 Research Project Started!')
            .setDescription(`You begin intensive research into **${magicSchool.name}**!`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                {
                    name: '📋 **Project Details**',
                    value: `**School:** ${magicSchool.name}\n**Duration:** ${Math.floor(actualDuration / (60 * 60 * 1000))} hours\n**Focus Mode:** ${focus ? 'Yes (+50% time, +100% cost)' : 'No'}\n**Expected Discovery:** ${nextDiscovery?.name || 'Unknown'}`,
                    inline: true
                },
                {
                    name: '💰 **Resources Invested**',
                    value: `**Gold:** ${focusCost}\n**Materials:** ${magicSchool.materials.map(m => `${materialCost} ${m}`).join(', ')}\n**Remaining Gold:** ${userData.gold}`,
                    inline: true
                },
                {
                    name: '⏰ **Timeline**',
                    value: `**Started:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Completion:** <t:${Math.floor(userData.research.activeResearch.endTime / 1000)}:F>\n**Time Remaining:** <t:${Math.floor(userData.research.activeResearch.endTime / 1000)}:R>`,
                    inline: false
                }
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('research_progress')
                    .setLabel('Check Progress')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('research_notes')
                    .setLabel('Research Notes')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📝'),
                new ButtonBuilder()
                    .setCustomId('research_boost')
                    .setLabel('Speed Boost (💎50)')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚡')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });

        // Set up auto-completion
        setTimeout(async () => {
            try {
                await this.completeResearch(interaction.user.id, school);
            } catch (error) {
                console.error('Error completing research:', error);
            }
        }, actualDuration);
    },

    async completeResearch(userId, school) {
        try {
            const userData = await db.getUserData(userId);
            if (!userData?.research?.activeResearch) return;

            const magicSchool = MAGIC_SCHOOLS[school];
            const nextDiscovery = this.getNextDiscovery(userData, school);

            if (nextDiscovery) {
                // Add discovery
                if (!userData.research.discoveries[school]) {
                    userData.research.discoveries[school] = [];
                }
                userData.research.discoveries[school].push({
                    ...nextDiscovery,
                    discoveredAt: Date.now()
                });

                // Award experience
                const expGain = 100 * nextDiscovery.level;
                userData.research.experience += expGain;
                userData.research.completedProjects++;
                userData.research.totalHours += Math.floor(userData.research.activeResearch.totalTime / (60 * 60 * 1000));

                // Level up check
                const newLevel = Math.floor(userData.research.experience / 500) + 1;
                if (newLevel > userData.research.level) {
                    userData.research.level = newLevel;
                }
            }

            // Clear active research
            userData.research.activeResearch = null;
            await db.updateUser(userId, userData);

        } catch (error) {
            console.error('Error completing research:', error);
        }
    },

    getNextDiscovery(userData, school) {
        const magicSchool = MAGIC_SCHOOLS[school];
        const currentDiscoveries = userData.research.discoveries[school] || [];
        const nextIndex = currentDiscoveries.length;
        
        return nextIndex < magicSchool.discoveries.length 
            ? magicSchool.discoveries[nextIndex] 
            : null;
    },

    getProgressBar(current, max, length = 10) {
        const percentage = Math.min(current / max, 1);
        const filledLength = Math.floor(percentage * length);
        const emptyLength = length - filledLength;
        
        return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
    }
};
