
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Sea destinations with detailed information
const DESTINATIONS = {
    siren_cove: {
        name: '🧜‍♀️ Siren\'s Cove',
        description: 'Mystical waters where sirens guard ancient treasures',
        distance: 100,
        danger: 6,
        duration: 30,
        requirements: { level: 5, ship: 'boat' },
        rewards: {
            pearls: { chance: 60, amount: [2, 5] },
            sea_shells: { chance: 80, amount: [3, 8] },
            treasure_map: { chance: 15, amount: [1, 1] },
            coins: { chance: 90, amount: [100, 300] }
        },
        special_events: ['siren_encounter', 'pearl_diving', 'treasure_discovery']
    },
    kraken_depths: {
        name: '🦑 Kraken\'s Depths',
        description: 'Dangerous deep waters where the legendary kraken dwells',
        distance: 300,
        danger: 9,
        duration: 90,
        requirements: { level: 15, ship: 'warship' },
        rewards: {
            kraken_ink: { chance: 30, amount: [1, 2] },
            ancient_artifacts: { chance: 20, amount: [1, 1] },
            deep_sea_gems: { chance: 40, amount: [1, 3] },
            coins: { chance: 100, amount: [500, 1000] }
        },
        special_events: ['kraken_battle', 'whirlpool', 'ancient_ruins']
    },
    island_paradise: {
        name: '🏝️ Paradise Island',
        description: 'Tropical paradise with hidden caves and exotic resources',
        distance: 200,
        danger: 3,
        duration: 60,
        requirements: { level: 8, ship: 'boat' },
        rewards: {
            tropical_fruits: { chance: 70, amount: [5, 10] },
            exotic_wood: { chance: 50, amount: [2, 4] },
            rare_spices: { chance: 40, amount: [1, 3] },
            coins: { chance: 85, amount: [200, 500] }
        },
        special_events: ['native_tribe', 'volcano_expedition', 'buried_treasure']
    },
    ghost_ship: {
        name: '👻 Ghost Ship Graveyard',
        description: 'Haunted waters filled with cursed vessels and spectral treasures',
        distance: 250,
        danger: 8,
        duration: 75,
        requirements: { level: 12, ship: 'ghost_ship' },
        rewards: {
            cursed_gold: { chance: 40, amount: [3, 6] },
            spectral_essence: { chance: 30, amount: [1, 2] },
            haunted_artifacts: { chance: 25, amount: [1, 1] },
            coins: { chance: 80, amount: [300, 800] }
        },
        special_events: ['ghost_encounter', 'cursed_treasure', 'spectral_storm']
    },
    underwater_city: {
        name: '🏛️ Atlantis Ruins',
        description: 'Sunken city of an ancient civilization',
        distance: 400,
        danger: 7,
        duration: 120,
        requirements: { level: 20, ship: 'submarine' },
        rewards: {
            atlantean_crystals: { chance: 35, amount: [1, 2] },
            ancient_technology: { chance: 20, amount: [1, 1] },
            waterproof_scrolls: { chance: 45, amount: [2, 4] },
            coins: { chance: 95, amount: [800, 1500] }
        },
        special_events: ['atlantean_guardian', 'crystal_chamber', 'ancient_library']
    },
    bermuda_triangle: {
        name: '🌀 Bermuda Triangle',
        description: 'Mysterious waters where reality bends and time flows differently',
        distance: 500,
        danger: 10,
        duration: 180,
        requirements: { level: 25, ship: 'quantum_vessel' },
        rewards: {
            time_crystals: { chance: 15, amount: [1, 1] },
            dimensional_fragments: { chance: 25, amount: [1, 2] },
            quantum_pearls: { chance: 30, amount: [1, 3] },
            coins: { chance: 100, amount: [1000, 2500] }
        },
        special_events: ['time_distortion', 'dimensional_rift', 'quantum_storm']
    }
};

// Ship types available for voyages
const SHIP_TYPES = {
    raft: {
        name: '🛶 Simple Raft',
        speed: 1.0,
        capacity: 50,
        durability: 20,
        cost: 0,
        description: 'Basic floating platform for short trips'
    },
    boat: {
        name: '⛵ Sailing Boat',
        speed: 1.5,
        capacity: 100,
        durability: 50,
        cost: 500,
        description: 'Reliable vessel for coastal exploration'
    },
    warship: {
        name: '🚢 War Galleon',
        speed: 1.2,
        capacity: 200,
        durability: 100,
        cost: 2000,
        description: 'Heavily armed ship for dangerous waters'
    },
    ghost_ship: {
        name: '👻 Spectral Vessel',
        speed: 2.0,
        capacity: 150,
        durability: 75,
        cost: 3500,
        description: 'Haunted ship that phases through obstacles'
    },
    submarine: {
        name: '🚂 Deep Sea Submarine',
        speed: 1.8,
        capacity: 80,
        durability: 120,
        durability: 80,
        cost: 5000,
        description: 'Underwater vessel for deep ocean exploration'
    },
    quantum_vessel: {
        name: '🛸 Quantum Ship',
        speed: 3.0,
        capacity: 300,
        durability: 200,
        cost: 15000,
        description: 'Advanced vessel using quantum technology'
    }
};

// Crew members that can be hired
const CREW_MEMBERS = {
    navigator: { name: '🧭 Expert Navigator', cost: 100, bonus: 'speed', value: 0.2 },
    gunner: { name: '💥 Master Gunner', cost: 150, bonus: 'combat', value: 0.3 },
    engineer: { name: '⚙️ Ship Engineer', cost: 120, bonus: 'durability', value: 0.25 },
    treasure_hunter: { name: '💎 Treasure Hunter', cost: 200, bonus: 'treasure_chance', value: 0.15 },
    chef: { name: '👨‍🍳 Ship Chef', cost: 80, bonus: 'crew_morale', value: 0.1 },
    doctor: { name: '⚕️ Ship Doctor', cost: 90, bonus: 'crew_health', value: 0.2 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voyage')
        .setDescription('🚢 Embark on epic sea voyages to discover treasures')
        .addSubcommand(subcommand =>
            subcommand
                .setName('destinations')
                .setDescription('View available voyage destinations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('embark')
                .setDescription('Begin a voyage to a specific destination')
                .addStringOption(option =>
                    option.setName('destination')
                        .setDescription('Where to sail')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('fleet')
                .setDescription('Manage your fleet of ships'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('crew')
                .setDescription('Manage your ship crew'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shipyard')
                .setDescription('Purchase and upgrade ships'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check current voyage status')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'destinations':
                    await this.handleDestinations(interaction, userId);
                    break;
                case 'embark':
                    await this.handleEmbark(interaction, userId);
                    break;
                case 'fleet':
                    await this.handleFleet(interaction, userId);
                    break;
                case 'crew':
                    await this.handleCrew(interaction, userId);
                    break;
                case 'shipyard':
                    await this.handleShipyard(interaction, userId);
                    break;
                case 'status':
                    await this.handleStatus(interaction, userId);
                    break;
            }
        } catch (error) {
            console.error('Voyage command error:', error);
            await interaction.reply({
                content: '❌ An error occurred during your voyage planning.',
                ephemeral: true
            });
        }
    },

    async handleDestinations(interaction, userId) {
        const userData = await db.getPlayer(userId) || { level: 1, ships: ['raft'] };

        const embed = new EmbedBuilder()
            .setColor('#1E90FF')
            .setTitle('🌊 Voyage Destinations')
            .setDescription('**Chart your course to adventure and fortune!**')
            .addFields({
                name: '🧭 Navigation Guide',
                value: 'Select destinations based on your level, ship, and risk tolerance',
                inline: false
            });

        Object.entries(DESTINATIONS).forEach(([key, dest]) => {
            const canAccess = userData.level >= dest.requirements.level && 
                             (userData.ships || ['raft']).includes(dest.requirements.ship);
            
            const status = canAccess ? '✅ **Accessible**' : '🔒 *Locked*';
            const dangerLevel = '⚠️'.repeat(Math.min(dest.danger, 5));
            
            embed.addFields({
                name: `${dest.name} ${canAccess ? '' : '(🔒)'}`,
                value: `**Distance:** ${dest.distance} nautical miles\n` +
                       `**Danger:** ${dangerLevel} (${dest.danger}/10)\n` +
                       `**Duration:** ~${dest.duration} minutes\n` +
                       `**Requirements:** Level ${dest.requirements.level}, ${dest.requirements.ship}\n` +
                       `**Status:** ${status}\n` +
                       `*${dest.description}*`,
                inline: true
            });
        });

        const destinationSelect = new StringSelectMenuBuilder()
            .setCustomId('voyage_destination_select')
            .setPlaceholder('🗺️ Select a destination to explore...')
            .addOptions(
                Object.entries(DESTINATIONS)
                    .filter(([key, dest]) => 
                        userData.level >= dest.requirements.level && 
                        (userData.ships || ['raft']).includes(dest.requirements.ship)
                    )
                    .map(([key, dest]) => ({
                        label: dest.name.replace(/[🧜‍♀️🦑🏝️👻🏛️🌀]/g, '').trim(),
                        description: `${dest.distance}nm - Danger ${dest.danger}/10 - ~${dest.duration}min`,
                        value: `voyage_${key}`,
                        emoji: dest.name.match(/[🧜‍♀️🦑🏝️👻🏛️🌀]/)?.[0] || '⚓'
                    }))
            );

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('voyage_quick_trip')
                    .setLabel('⚡ Quick Voyage')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('voyage_expedition')
                    .setLabel('🗺️ Plan Expedition')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('voyage_weather')
                    .setLabel('🌊 Sea Conditions')
                    .setStyle(ButtonStyle.Success)
            );

        const components = [];
        if (destinationSelect.options.length > 0) {
            components.push(new ActionRowBuilder().addComponents(destinationSelect));
        }
        components.push(actionButtons);

        await interaction.reply({ embeds: [embed], components });
    },

    async handleEmbark(interaction, userId) {
        const destination = interaction.options.getString('destination');
        const userData = await db.getPlayer(userId) || { level: 1, ships: ['raft'], coins: 100 };
        
        const destKey = Object.keys(DESTINATIONS).find(key => 
            key.includes(destination.toLowerCase()) || 
            DESTINATIONS[key].name.toLowerCase().includes(destination.toLowerCase())
        );

        if (!destKey) {
            return await interaction.reply({
                content: '❌ Destination not found! Use `/voyage destinations` to see available locations.',
                ephemeral: true
            });
        }

        const dest = DESTINATIONS[destKey];
        
        // Check requirements
        if (userData.level < dest.requirements.level) {
            return await interaction.reply({
                content: `❌ You need level ${dest.requirements.level} to sail to ${dest.name}! (You are level ${userData.level})`,
                ephemeral: true
            });
        }

        if (!(userData.ships || ['raft']).includes(dest.requirements.ship)) {
            return await interaction.reply({
                content: `❌ You need a ${dest.requirements.ship} to reach ${dest.name}! Visit the shipyard to upgrade.`,
                ephemeral: true
            });
        }

        // Check if already on voyage
        if (userData.currentVoyage && userData.currentVoyage.endTime > Date.now()) {
            return await interaction.reply({
                content: '❌ You\'re already on a voyage! Use `/voyage status` to check progress.',
                ephemeral: true
            });
        }

        const voyageCost = Math.floor(dest.distance * 2);
        if (userData.coins < voyageCost) {
            return await interaction.reply({
                content: `❌ You need ${voyageCost} coins for supplies! (You have ${userData.coins})`,
                ephemeral: true
            });
        }

        // Start the voyage
        const startTime = Date.now();
        const endTime = startTime + (dest.duration * 60 * 1000); // Convert minutes to milliseconds

        userData.currentVoyage = {
            destination: destKey,
            startTime,
            endTime,
            ship: dest.requirements.ship,
            crew: userData.crew || []
        };
        
        userData.coins -= voyageCost;
        await db.updatePlayer(userId, userData);

        const embed = new EmbedBuilder()
            .setColor('#00CED1')
            .setTitle(`⚓ Voyage to ${dest.name} Begins!`)
            .setDescription(`**Your ${SHIP_TYPES[dest.requirements.ship].name} sets sail into adventure!**`)
            .addFields(
                { name: '🗺️ Destination', value: dest.name, inline: true },
                { name: '⏱️ Estimated Duration', value: `${dest.duration} minutes`, inline: true },
                { name: '💰 Supply Cost', value: `${voyageCost} coins`, inline: true },
                { name: '⚠️ Danger Level', value: `${'⚠️'.repeat(Math.min(dest.danger, 5))} (${dest.danger}/10)`, inline: true },
                { name: '🚢 Vessel', value: SHIP_TYPES[dest.requirements.ship].name, inline: true },
                { name: '⏰ Return Time', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                { name: '🌊 Journey Description', value: dest.description, inline: false }
            )
            .setFooter({ text: 'Bon voyage! Use /voyage status to check progress' })
            .setThumbnail(interaction.user.displayAvatarURL());

        const voyageButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('voyage_check_progress')
                    .setLabel('📊 Check Progress')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('voyage_emergency_return')
                    .setLabel('🚨 Emergency Return')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('voyage_radio_contact')
                    .setLabel('📻 Radio Contact')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [voyageButtons] });
    },

    async handleFleet(interaction, userId) {
        const userData = await db.getPlayer(userId) || { ships: ['raft'] };
        const userShips = userData.ships || ['raft'];

        const embed = new EmbedBuilder()
            .setColor('#4682B4')
            .setTitle('🚢 Your Fleet')
            .setDescription('**Command your naval forces and explore the seven seas!**');

        // Show owned ships
        userShips.forEach(shipKey => {
            const ship = SHIP_TYPES[shipKey];
            if (ship) {
                const condition = userData.shipConditions?.[shipKey] || 100;
                const conditionColor = condition > 75 ? '💚' : condition > 50 ? '💛' : condition > 25 ? '🧡' : '❤️';
                
                embed.addFields({
                    name: `${ship.name}`,
                    value: `**Condition:** ${conditionColor} ${condition}%\n` +
                           `**Speed:** ${ship.speed}x | **Capacity:** ${ship.capacity}\n` +
                           `**Durability:** ${ship.durability} | **Status:** ${userData.currentVoyage?.ship === shipKey ? '🌊 At Sea' : '⚓ Docked'}\n` +
                           `*${ship.description}*`,
                    inline: true
                });
            }
        });

        // Fleet statistics
        embed.addFields({
            name: '📊 Fleet Statistics',
            value: `**Total Ships:** ${userShips.length}\n` +
                   `**Fleet Speed:** ${Math.max(...userShips.map(s => SHIP_TYPES[s]?.speed || 1)).toFixed(1)}x\n` +
                   `**Total Capacity:** ${userShips.reduce((sum, s) => sum + (SHIP_TYPES[s]?.capacity || 0), 0)}\n` +
                   `**Fleet Value:** ${userShips.reduce((sum, s) => sum + (SHIP_TYPES[s]?.cost || 0), 0).toLocaleString()} coins`,
            inline: false
        });

        const fleetButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fleet_repair_all')
                    .setLabel('🔧 Repair All')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('fleet_upgrade')
                    .setLabel('⬆️ Upgrade Fleet')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('fleet_insurance')
                    .setLabel('🛡️ Fleet Insurance')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ embeds: [embed], components: [fleetButtons] });
    },

    async handleCrew(interaction, userId) {
        const userData = await db.getPlayer(userId) || { crew: [], coins: 0 };
        const userCrew = userData.crew || [];

        const embed = new EmbedBuilder()
            .setColor('#DAA520')
            .setTitle('👥 Ship Crew Management')
            .setDescription('**Assemble the finest crew for your maritime adventures!**')
            .addFields({
                name: '💰 Hiring Budget',
                value: `${userData.coins.toLocaleString()} coins`,
                inline: true
            });

        // Show current crew
        if (userCrew.length > 0) {
            const crewDisplay = userCrew.map(memberKey => {
                const member = CREW_MEMBERS[memberKey];
                return `${member.name} (+${Math.floor(member.value * 100)}% ${member.bonus})`;
            }).join('\n');

            embed.addFields({
                name: '👥 Current Crew',
                value: crewDisplay || 'No crew members hired',
                inline: false
            });
        }

        // Show available crew
        const availableCrew = Object.entries(CREW_MEMBERS)
            .filter(([key, member]) => !userCrew.includes(key))
            .map(([key, member]) => {
                const affordable = userData.coins >= member.cost ? '💰' : '❌';
                return `${affordable} **${member.name}** - ${member.cost} coins\n*+${Math.floor(member.value * 100)}% ${member.bonus.replace('_', ' ')}*`;
            }).join('\n\n');

        if (availableCrew) {
            embed.addFields({
                name: '🆕 Available for Hire',
                value: availableCrew,
                inline: false
            });
        }

        const crewSelect = new StringSelectMenuBuilder()
            .setCustomId('crew_hire_select')
            .setPlaceholder('👥 Hire crew members...')
            .addOptions(
                Object.entries(CREW_MEMBERS)
                    .filter(([key, member]) => !userCrew.includes(key) && userData.coins >= member.cost)
                    .map(([key, member]) => ({
                        label: `${member.name.replace(/[🧭💥⚙️💎👨‍🍳⚕️]/g, '').trim()} - ${member.cost} coins`,
                        description: `+${Math.floor(member.value * 100)}% ${member.bonus.replace('_', ' ')}`,
                        value: `hire_${key}`,
                        emoji: member.name.match(/[🧭💥⚙️💎👨‍🍳⚕️]/)?.[0] || '👤'
                    }))
            );

        const crewButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('crew_dismiss_all')
                    .setLabel('👋 Dismiss All')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('crew_training')
                    .setLabel('📚 Crew Training')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('crew_bonuses')
                    .setLabel('⭐ View Bonuses')
                    .setStyle(ButtonStyle.Secondary)
            );

        const components = [];
        if (crewSelect.options.length > 0) {
            components.push(new ActionRowBuilder().addComponents(crewSelect));
        }
        components.push(crewButtons);

        await interaction.reply({ embeds: [embed], components });
    },

    async handleShipyard(interaction, userId) {
        const userData = await db.getPlayer(userId) || { ships: ['raft'], coins: 0 };
        const userShips = userData.ships || ['raft'];

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🔨 Maritime Shipyard')
            .setDescription('**Expand your fleet with the finest vessels!**')
            .addFields({
                name: '💰 Your Treasury',
                value: `${userData.coins.toLocaleString()} coins`,
                inline: true
            });

        // Show available ships for purchase
        Object.entries(SHIP_TYPES).forEach(([key, ship]) => {
            const owned = userShips.includes(key);
            const affordable = userData.coins >= ship.cost;
            const status = owned ? '✅ **OWNED**' : affordable ? '💰 **Available**' : '❌ *Too Expensive*';

            embed.addFields({
                name: `${ship.name} ${owned ? '(Owned)' : ''}`,
                value: `**Price:** ${ship.cost.toLocaleString()} coins\n` +
                       `**Speed:** ${ship.speed}x | **Capacity:** ${ship.capacity}\n` +
                       `**Durability:** ${ship.durability} | **Status:** ${status}\n` +
                       `*${ship.description}*`,
                inline: true
            });
        });

        const purchaseSelect = new StringSelectMenuBuilder()
            .setCustomId('ship_purchase_select')
            .setPlaceholder('🚢 Purchase a new vessel...')
            .addOptions(
                Object.entries(SHIP_TYPES)
                    .filter(([key, ship]) => !userShips.includes(key) && userData.coins >= ship.cost)
                    .map(([key, ship]) => ({
                        label: `${ship.name.replace(/[🛶⛵🚢👻🚂🛸]/g, '').trim()} - ${ship.cost.toLocaleString()} coins`,
                        description: ship.description,
                        value: `buy_${key}`,
                        emoji: ship.name.match(/[🛶⛵🚢👻🚂🛸]/)?.[0] || '🚢'
                    }))
            );

        const shipyardButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('shipyard_upgrades')
                    .setLabel('⬆️ Ship Upgrades')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('shipyard_repairs')
                    .setLabel('🔧 Repair Services')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shipyard_insurance')
                    .setLabel('🛡️ Ship Insurance')
                    .setStyle(ButtonStyle.Secondary)
            );

        const components = [];
        if (purchaseSelect.options.length > 0) {
            components.push(new ActionRowBuilder().addComponents(purchaseSelect));
        }
        components.push(shipyardButtons);

        await interaction.reply({ embeds: [embed], components });
    },

    async handleStatus(interaction, userId) {
        const userData = await db.getPlayer(userId) || {};
        
        if (!userData.currentVoyage) {
            return await interaction.reply({
                content: '⚓ You\'re currently docked at port. Use `/voyage destinations` to plan your next adventure!',
                ephemeral: true
            });
        }

        const voyage = userData.currentVoyage;
        const destination = DESTINATIONS[voyage.destination];
        const now = Date.now();
        const progress = Math.min((now - voyage.startTime) / (voyage.endTime - voyage.startTime), 1);
        const remainingTime = Math.max(voyage.endTime - now, 0);

        let statusEmoji = '🌊';
        let statusText = 'Sailing smoothly';
        
        if (progress < 0.3) {
            statusEmoji = '⚓';
            statusText = 'Departing port';
        } else if (progress < 0.7) {
            statusEmoji = '🌊';
            statusText = 'Open sea voyage';
        } else if (progress < 1) {
            statusEmoji = '🏝️';
            statusText = 'Approaching destination';
        } else {
            statusEmoji = '🎯';
            statusText = 'Arrived! Ready to explore';
        }

        const embed = new EmbedBuilder()
            .setColor(progress >= 1 ? '#32CD32' : '#1E90FF')
            .setTitle(`${statusEmoji} Voyage Status Report`)
            .setDescription(`**${statusText} - Journey to ${destination.name}**`)
            .addFields(
                { name: '🗺️ Destination', value: destination.name, inline: true },
                { name: '🚢 Vessel', value: SHIP_TYPES[voyage.ship].name, inline: true },
                { name: '📊 Progress', value: `${Math.floor(progress * 100)}%`, inline: true },
                { name: '⏰ Time Remaining', value: remainingTime > 0 ? `<t:${Math.floor(voyage.endTime / 1000)}:R>` : '**Arrived!**', inline: true },
                { name: '👥 Crew Status', value: `${voyage.crew?.length || 0} crew members aboard`, inline: true },
                { name: '🌊 Sea Conditions', value: this.getRandomSeaCondition(), inline: true }
            );

        // Progress bar
        const progressBar = '█'.repeat(Math.floor(progress * 20)) + '░'.repeat(20 - Math.floor(progress * 20));
        embed.addFields({
            name: '📈 Journey Progress',
            value: `${progressBar} ${Math.floor(progress * 100)}%`,
            inline: false
        });

        const statusButtons = new ActionRowBuilder();
        
        if (progress >= 1) {
            statusButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('voyage_complete')
                    .setLabel('🎯 Complete Voyage')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('voyage_extend_exploration')
                    .setLabel('⏳ Extended Exploration')
                    .setStyle(ButtonStyle.Primary)
            );
        } else {
            statusButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId('voyage_accelerate')
                    .setLabel('⚡ Accelerate (Cost Extra)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('voyage_abandon')
                    .setLabel('🔄 Abandon Voyage')
                    .setStyle(ButtonStyle.Danger)
            );
        }

        statusButtons.addComponents(
            new ButtonBuilder()
                .setCustomId('voyage_crew_report')
                .setLabel('📊 Crew Report')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embed], components: [statusButtons] });
    },

    // Helper method for sea conditions
    getRandomSeaCondition() {
        const conditions = [
            '☀️ Perfect sailing weather',
            '🌊 Moderate waves',
            '🌫️ Light fog patches',
            '⚡ Distant storm clouds',
            '🐋 Whale sightings reported',
            '🌅 Beautiful sunrise ahead'
        ];
        return conditions[Math.floor(Math.random() * conditions.length)];
    }
};
